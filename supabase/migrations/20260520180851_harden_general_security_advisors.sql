-- Reduce broad Supabase security-advisor findings without changing the app's
-- authenticated RPC contract. Higher-risk SECURITY DEFINER redesign remains a
-- separate migration track because those RPCs intentionally enforce app logic.

BEGIN;

-- Pin function search_path for helpers and triggers reported by the advisor.
-- Some advisor findings describe legacy functions absent from a fresh schema.
-- Preserve their hardening when present without inventing missing app RPCs.
DO $advisor_paths$
DECLARE
  signature text;
  namespaces text;
BEGIN
  FOR signature, namespaces IN SELECT * FROM (VALUES
    ('public.get_auth_uid()', 'public, auth, pg_temp'),
    ('public.get_auth_email()', 'public, auth, pg_temp'),
    ('public.claim_collaborator_memberships()', 'public, auth, pg_temp'),
    ('public.accept_tree_invitation(text)', 'public, auth, extensions, pg_temp'),
    ('public.sync_tree_batch(jsonb)', 'public, auth, pg_temp'),
    ('public.set_push_subscriptions_updated_at()', 'public, pg_temp'),
    ('public.set_updated_at()', 'public, pg_temp'),
    ('public.create_tree_invitation(uuid,text,text,integer)', 'public, auth, extensions, pg_temp')
  ) AS targets(signature, namespaces)
  LOOP
    IF to_regprocedure(signature) IS NOT NULL THEN
      EXECUTE format('ALTER FUNCTION %s SET search_path = %s', to_regprocedure(signature), namespaces);
    END IF;
  END LOOP;
END;
$advisor_paths$;

-- Remove legacy always-true policies superseded by owner/collaborator policies.
DROP POLICY IF EXISTS "Public Access Trees" ON public.trees;
DROP POLICY IF EXISTS "Allow All Access" ON public.relationships;

-- Keep locations_cache globally useful, but avoid unrestricted true checks.
DROP POLICY IF EXISTS "Allow authenticated users to insert locations cache" ON public.locations_cache;
CREATE POLICY "Allow authenticated users to insert locations cache"
    ON public.locations_cache
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.role() = 'authenticated'
      AND place_name IS NOT NULL
      AND length(trim(place_name)) BETWEEN 2 AND 300
      AND status IN ('pending', 'resolved', 'failed')
    );

DROP POLICY IF EXISTS "Allow authenticated users to update locations cache" ON public.locations_cache;
CREATE POLICY "Allow authenticated users to update locations cache"
    ON public.locations_cache
    FOR UPDATE
    TO authenticated
    USING (auth.role() = 'authenticated')
    WITH CHECK (
      auth.role() = 'authenticated'
      AND place_name IS NOT NULL
      AND length(trim(place_name)) BETWEEN 2 AND 300
      AND status IN ('pending', 'resolved', 'failed')
    );

-- Public buckets can still serve public URLs without broad object-list SELECT.
DROP POLICY IF EXISTS "Allow Public Select" ON storage.objects;
DROP POLICY IF EXISTS "Avatar Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Allow Authenticated Upload 1oj01fe_1" ON storage.objects;

-- Preserve grants on installed RPCs, including legacy ones where present.
DO $advisor_grants$
DECLARE
  signature text;
  target regprocedure;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.accept_tree_invitation(text)',
    'public.accept_tree_invitation_by_id(uuid)',
    'public.can_edit_tree(uuid)',
    'public.claim_collaborator_memberships()',
    'public.create_person_and_relationship(uuid,text,jsonb,text,text)',
    'public.create_tree_invitation(uuid,text,text,integer)',
    'public.create_tree_with_root(text,text,jsonb)',
    'public.current_user_email_text()',
    'public.current_user_id_text()',
    'public.decline_tree_invitation(uuid)',
    'public.delete_person_and_relations(uuid,text,text)',
    'public.is_tree_collaborator(uuid,text)',
    'public.is_tree_owner(uuid)',
    'public.prune_activity_logs(uuid,integer)',
    'public.prune_tree_operations(uuid,integer)',
    'public.replace_tree_content(uuid,jsonb,jsonb)',
    'public.revoke_tree_invitation(uuid)',
    'public.sync_tree_batch(jsonb)'
  ] LOOP
    target := to_regprocedure(signature);
    IF target IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', target);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', target);
    END IF;
  END LOOP;
END;
$advisor_grants$;

COMMIT;

NOTIFY pgrst, 'reload schema';
