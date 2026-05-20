-- Reduce broad Supabase security-advisor findings without changing the app's
-- authenticated RPC contract. Higher-risk SECURITY DEFINER redesign remains a
-- separate migration track because those RPCs intentionally enforce app logic.

BEGIN;

-- Pin function search_path for helpers and triggers reported by the advisor.
ALTER FUNCTION public.get_auth_uid() SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.get_auth_email() SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.claim_collaborator_memberships() SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.accept_tree_invitation(TEXT) SET search_path = public, auth, extensions, pg_temp;
ALTER FUNCTION public.sync_tree_batch(JSONB) SET search_path = public, auth, pg_temp;
ALTER FUNCTION public.set_push_subscriptions_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.set_updated_at() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_tree_invitation(UUID, TEXT, TEXT, INTEGER) SET search_path = public, auth, extensions, pg_temp;

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

-- These RPCs are app operations and should not be callable by anonymous users.
REVOKE EXECUTE ON FUNCTION public.accept_tree_invitation(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.accept_tree_invitation_by_id(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_tree(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.claim_collaborator_memberships() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_person_and_relationship(UUID, TEXT, JSONB, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_tree_invitation(UUID, TEXT, TEXT, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_tree_with_root(TEXT, TEXT, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_email_text() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_user_id_text() FROM anon;
REVOKE EXECUTE ON FUNCTION public.decline_tree_invitation(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.delete_person_and_relations(UUID, TEXT, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_tree_collaborator(UUID, TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_tree_owner(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.prune_activity_logs(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.prune_tree_operations(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.replace_tree_content(UUID, JSONB, JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.revoke_tree_invitation(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_tree_batch(JSONB) FROM anon;

-- Preserve the current signed-in client contract explicitly.
GRANT EXECUTE ON FUNCTION public.accept_tree_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_tree_invitation_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_tree(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_collaborator_memberships() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_person_and_relationship(UUID, TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tree_invitation(UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tree_with_root(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_email_text() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_id_text() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_tree_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_person_and_relations(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tree_collaborator(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tree_owner(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prune_activity_logs(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prune_tree_operations(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_tree_content(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_tree_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_tree_batch(JSONB) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
