BEGIN;

-- =========================================================================
-- 1. Table RLS Policies
-- =========================================================================

-- Enable RLS (already enabled, but let's make sure it's consistent)
ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_reminder_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

-- Drop existing service role policies if any
DROP POLICY IF EXISTS "service_role_all" ON public.ai_usage;
DROP POLICY IF EXISTS "service_role_all" ON public.push_reminder_deliveries;
DROP POLICY IF EXISTS "service_role_all" ON public.user_keys;

-- Create service role policies to resolve "RLS Enabled No Policy" warnings
CREATE POLICY "service_role_all" ON public.ai_usage FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.push_reminder_deliveries FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON public.user_keys FOR ALL TO service_role USING (true) WITH CHECK (true);

-- The old media table is not part of the current fresh-install schema.
DO $legacy_media$
BEGIN
  IF to_regclass('public.media') IS NOT NULL THEN
    ALTER TABLE public.media ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "service_role_all" ON public.media;
    CREATE POLICY "service_role_all" ON public.media FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END;
$legacy_media$;


-- =========================================================================
-- 2. Secure implementations in private schema (SECURITY DEFINER)
-- =========================================================================

-- 2.1 accept_tree_invitation
CREATE OR REPLACE FUNCTION private.accept_tree_invitation(p_invite_token text)
 RETURNS TABLE(tree_id uuid, role text, invitation_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth, extensions, pg_temp
AS $function$
DECLARE
  v_caller_id TEXT;
  v_caller_email TEXT;
  v_token_hash TEXT;
  v_invitation public.tree_invitations%ROWTYPE;
BEGIN
  v_caller_id := private.current_user_id_text();
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  
  v_token_hash := encode(extensions.digest(p_invite_token, 'sha256'), 'hex');

  SELECT *
  INTO v_invitation
  FROM public.tree_invitations
  WHERE token_hash = v_token_hash
    AND status = 'pending'
    AND expires_at > NOW()
  LIMIT 1;

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invitation is invalid or expired';
  END IF;

  IF lower(v_invitation.invited_email) <> v_caller_email THEN
    RAISE EXCEPTION 'Invitation email does not match the current user';
  END IF;

  INSERT INTO public.tree_collaborators (
    tree_id,
    email,
    collaborator_uid,
    role,
    invited_by
  )
  VALUES (
    v_invitation.tree_id,
    v_caller_email,
    v_caller_id,
    v_invitation.role,
    v_invitation.invited_by
  )
  ON CONFLICT (tree_id, email)
  DO UPDATE SET
    collaborator_uid = EXCLUDED.collaborator_uid,
    role = EXCLUDED.role;

  UPDATE public.tree_invitations
  SET
    invited_uid = v_caller_id,
    accepted_by = v_caller_id,
    accepted_at = NOW(),
    status = 'accepted'
  WHERE id = v_invitation.id;

  INSERT INTO public.activity_logs (
    tree_id,
    user_id,
    user_email,
    action_type,
    details
  )
  VALUES (
    v_invitation.tree_id,
    v_caller_id,
    v_caller_email,
    'SHARE_INVITE_ACCEPT',
    jsonb_build_object(
      'email', v_caller_email,
      'role', v_invitation.role,
      'invitationId', v_invitation.id
    )
  );

  RETURN QUERY SELECT v_invitation.tree_id, v_invitation.role, v_invitation.id;
END;
$function$;

-- 2.2 accept_tree_invitation_by_id
CREATE OR REPLACE FUNCTION private.accept_tree_invitation_by_id(p_invitation_id uuid)
 RETURNS TABLE(out_tree_id uuid, out_role text, out_invitation_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_caller_id TEXT;
  v_caller_email TEXT;
  v_invitation public.tree_invitations%ROWTYPE;
BEGIN
  v_caller_id := private.current_user_id_text();
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  SELECT *
  INTO v_invitation
  FROM public.tree_invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > NOW()
  LIMIT 1;

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invitation is invalid or expired';
  END IF;

  IF lower(v_invitation.invited_email) <> v_caller_email THEN
    RAISE EXCEPTION 'Invitation email does not match the current user';
  END IF;

  INSERT INTO public.tree_collaborators (
    tree_id,
    email,
    collaborator_uid,
    role,
    invited_by
  )
  VALUES (
    v_invitation.tree_id,
    v_caller_email,
    v_caller_id,
    v_invitation.role,
    v_invitation.invited_by
  )
  ON CONFLICT (tree_id, email)
  DO UPDATE SET
    collaborator_uid = EXCLUDED.collaborator_uid,
    role = EXCLUDED.role;

  UPDATE public.tree_invitations
  SET
    invited_uid = v_caller_id,
    accepted_by = v_caller_id,
    accepted_at = NOW(),
    status = 'accepted'
  WHERE id = v_invitation.id;

  INSERT INTO public.activity_logs (
    tree_id,
    user_id,
    user_email,
    action_type,
    details
  )
  VALUES (
    v_invitation.tree_id,
    v_caller_id,
    v_caller_email,
    'SHARE_INVITE_ACCEPT',
    jsonb_build_object(
      'email', v_caller_email,
      'role', v_invitation.role,
      'invitationId', v_invitation.id
    )
  );

  RETURN QUERY
  SELECT
    v_invitation.tree_id AS out_tree_id,
    v_invitation.role AS out_role,
    v_invitation.id AS out_invitation_id;
END;
$function$;

-- 2.3 claim_collaborator_memberships
CREATE OR REPLACE FUNCTION private.claim_collaborator_memberships()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_claimed_count INTEGER := 0;
  v_caller_id TEXT;
  v_caller_email TEXT;
BEGIN
  v_caller_id := private.current_user_id_text();
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  IF v_caller_id IS NULL OR trim(v_caller_id) = '' OR trim(v_caller_email) = '' THEN
    RETURN 0;
  END IF;

  UPDATE public.tree_collaborators
  SET collaborator_uid = v_caller_id
  WHERE collaborator_uid IS NULL
    AND lower(email) = v_caller_email;

  GET DIAGNOSTICS v_claimed_count = ROW_COUNT;
  RETURN v_claimed_count;
END;
$function$;

-- 2.4 create_tree_invitation
CREATE OR REPLACE FUNCTION private.create_tree_invitation(
  p_tree_id uuid,
  p_invited_email text,
  p_role text DEFAULT 'viewer'::text,
  p_expires_in_hours integer DEFAULT 168
)
 RETURNS TABLE(invitation_id uuid, invite_token text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth, extensions, pg_temp
AS $function$
DECLARE
  v_caller_id TEXT;
  v_token TEXT;
  v_token_hash TEXT;
  v_invitation_id UUID;
BEGIN
  v_caller_id := private.current_user_id_text();

  IF NOT EXISTS (
    SELECT 1 FROM public.trees WHERE id = p_tree_id AND owner_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Only the tree owner can create invitations';
  END IF;

  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'Invalid invitation role';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_token_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.tree_invitations (
    tree_id,
    invited_email,
    role,
    token_hash,
    invited_by,
    expires_at
  )
  VALUES (
    p_tree_id,
    lower(trim(p_invited_email)),
    p_role,
    v_token_hash,
    v_caller_id,
    NOW() + make_interval(hours => GREATEST(p_expires_in_hours, 1))
  )
  RETURNING id INTO v_invitation_id;

  RETURN QUERY SELECT v_invitation_id, v_token;
END;
$function$;

-- 2.5 create_tree_with_root
CREATE OR REPLACE FUNCTION private.create_tree_with_root(
  p_owner_id text,
  p_tree_name text,
  p_root_person_data jsonb,
  p_settings jsonb DEFAULT '{}'::jsonb
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_tree_id uuid;
  v_root_id text;
  v_caller_id text;
  v_tree_name text;
BEGIN
  v_caller_id := auth.uid()::text;
  v_tree_name := nullif(trim(coalesce(p_tree_name, '')), '');

  IF v_caller_id is null or v_caller_id <> p_owner_id then
    raise exception 'Access Denied: Cannot create tree for another user.';
  END IF;

  IF v_tree_name is null then
    raise exception 'Tree name is required.';
  END IF;

  IF p_root_person_data is null or jsonb_typeof(p_root_person_data) <> 'object' then
    raise exception 'Root person data must be an object.';
  END IF;

  IF p_settings is null or jsonb_typeof(p_settings) <> 'object' then
    p_settings := '{}'::jsonb;
  END IF;

  v_tree_id := gen_random_uuid();
  v_root_id := nullif(p_root_person_data->>'id', '');

  IF v_root_id is null then
    v_root_id := gen_random_uuid()::text;
  END IF;

  INSERT INTO public.trees (id, owner_id, name, focus_id, settings)
  VALUES (v_tree_id, p_owner_id, v_tree_name, null, p_settings);

  INSERT INTO public.people (
    id, tree_id, first_name, last_name, gender
  ) VALUES (
    v_root_id,
    v_tree_id,
    coalesce(p_root_person_data->>'first_name', ''),
    coalesce(p_root_person_data->>'last_name', ''),
    coalesce(nullif(p_root_person_data->>'gender', ''), 'male')
  );

  UPDATE public.trees
  SET focus_id = v_root_id
  WHERE id = v_tree_id;

  RETURN v_tree_id;
END;
$function$;

-- 2.6 decline_tree_invitation
CREATE OR REPLACE FUNCTION private.decline_tree_invitation(p_invitation_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_caller_email TEXT;
  v_invitation public.tree_invitations%ROWTYPE;
BEGIN
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  SELECT *
  INTO v_invitation
  FROM public.tree_invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
    AND expires_at > NOW()
    AND lower(invited_email) = v_caller_email
  LIMIT 1;

  UPDATE public.tree_invitations
  SET
    status = 'declined',
    revoked_at = NOW()
  WHERE id = v_invitation.id;

  IF FOUND THEN
    INSERT INTO public.activity_logs (
      tree_id,
      user_id,
      user_email,
      action_type,
      details
    )
    VALUES (
      v_invitation.tree_id,
      private.current_user_id_text(),
      v_caller_email,
      'SHARE_INVITE_DECLINE',
      jsonb_build_object(
        'email', v_caller_email,
        'role', v_invitation.role,
        'invitationId', v_invitation.id
      )
    );
  END IF;

  RETURN FOUND;
END;
$function$;

-- 2.7 replace_tree_content
CREATE OR REPLACE FUNCTION private.replace_tree_content(
  p_tree_id uuid,
  p_people jsonb,
  p_relationships jsonb
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_caller_id TEXT;
BEGIN
  v_caller_id := private.current_user_id_text();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Missing authenticated user.';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.trees WHERE id = p_tree_id AND owner_id = v_caller_id)
    OR private.is_tree_collaborator(p_tree_id, 'editor')
  ) THEN
    RAISE EXCEPTION 'Access Denied: User % cannot edit tree %', v_caller_id, p_tree_id;
  END IF;

  DELETE FROM public.relationships
  WHERE tree_id = p_tree_id;

  DELETE FROM public.people
  WHERE tree_id = p_tree_id;

  INSERT INTO public.people (
    id,
    tree_id,
    first_name,
    last_name,
    middle_name,
    gender,
    birth_date,
    death_date,
    birth_place,
    death_place,
    bio,
    profession,
    interests,
    photo_url,
    email,
    website,
    blog,
    address,
    custom_fields,
    metadata
  )
  SELECT
    (person->>'id')::UUID,
    p_tree_id,
    COALESCE(person->>'first_name', ''),
    COALESCE(person->>'last_name', ''),
    COALESCE(person->>'middle_name', ''),
    COALESCE(person->>'gender', 'male'),
    NULLIF(person->>'birth_date', '')::DATE,
    NULLIF(person->>'death_date', '')::DATE,
    COALESCE(person->>'birth_place', ''),
    COALESCE(person->>'death_place', ''),
    COALESCE(person->>'bio', ''),
    COALESCE(person->>'profession', ''),
    COALESCE(person->>'interests', ''),
    NULLIF(person->>'photo_url', ''),
    COALESCE(person->>'email', ''),
    COALESCE(person->>'website', ''),
    COALESCE(person->>'blog', ''),
    COALESCE(person->>'address', ''),
    COALESCE(person->'custom_fields', '{}'::JSONB),
    COALESCE(person->'metadata', '{}'::JSONB)
  FROM jsonb_array_elements(COALESCE(p_people, '[]'::JSONB)) AS person;

  INSERT INTO public.relationships (
    tree_id,
    person_id,
    relative_id,
    type
  )
  SELECT
    p_tree_id,
    (rel->>'person_id')::UUID,
    (rel->>'relative_id')::UUID,
    rel->>'type'
  FROM jsonb_array_elements(COALESCE(p_relationships, '[]'::JSONB)) AS rel;
END;
$function$;

-- 2.8 revoke_tree_invitation
CREATE OR REPLACE FUNCTION private.revoke_tree_invitation(p_invitation_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, auth, pg_temp
AS $function$
DECLARE
  v_caller_id TEXT;
  v_tree_id UUID;
BEGIN
  v_caller_id := private.current_user_id_text();

  SELECT tree_id
  INTO v_tree_id
  FROM public.tree_invitations
  WHERE id = p_invitation_id
    AND status = 'pending'
  LIMIT 1;

  IF v_tree_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.trees WHERE id = v_tree_id AND owner_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Only the tree owner can revoke invitations';
  END IF;

  UPDATE public.tree_invitations
  SET status = 'revoked', revoked_at = NOW()
  WHERE id = p_invitation_id;

  RETURN TRUE;
END;
$function$;


-- =========================================================================
-- 3. Public thin wrappers (SECURITY INVOKER)
-- =========================================================================

-- 3.1 accept_tree_invitation
CREATE OR REPLACE FUNCTION public.accept_tree_invitation(p_invite_token text)
 RETURNS TABLE(tree_id uuid, role text, invitation_id uuid)
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
  SELECT * FROM private.accept_tree_invitation(p_invite_token);
$function$;

-- 3.2 accept_tree_invitation_by_id
CREATE OR REPLACE FUNCTION public.accept_tree_invitation_by_id(p_invitation_id uuid)
 RETURNS TABLE(out_tree_id uuid, out_role text, out_invitation_id uuid)
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
  SELECT * FROM private.accept_tree_invitation_by_id(p_invitation_id);
$function$;

-- 3.3 claim_collaborator_memberships
CREATE OR REPLACE FUNCTION public.claim_collaborator_memberships()
 RETURNS integer
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
  SELECT private.claim_collaborator_memberships();
$function$;

-- 3.4 create_tree_invitation
CREATE OR REPLACE FUNCTION public.create_tree_invitation(
  p_tree_id uuid,
  p_invited_email text,
  p_role text DEFAULT 'viewer'::text,
  p_expires_in_hours integer DEFAULT 168
)
 RETURNS TABLE(invitation_id uuid, invite_token text)
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
  SELECT * FROM private.create_tree_invitation(p_tree_id, p_invited_email, p_role, p_expires_in_hours);
$function$;

-- 3.5 create_tree_with_root
CREATE OR REPLACE FUNCTION public.create_tree_with_root(
  p_owner_id text,
  p_tree_name text,
  p_root_person_data jsonb,
  p_settings jsonb DEFAULT '{}'::jsonb
)
 RETURNS uuid
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
  SELECT private.create_tree_with_root(p_owner_id, p_tree_name, p_root_person_data, p_settings);
$function$;

-- 3.6 decline_tree_invitation
CREATE OR REPLACE FUNCTION public.decline_tree_invitation(p_invitation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
  SELECT private.decline_tree_invitation(p_invitation_id);
$function$;

-- 3.7 replace_tree_content
CREATE OR REPLACE FUNCTION public.replace_tree_content(
  p_tree_id uuid,
  p_people jsonb,
  p_relationships jsonb
)
 RETURNS void
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
  SELECT private.replace_tree_content(p_tree_id, p_people, p_relationships);
$function$;

-- 3.8 revoke_tree_invitation
CREATE OR REPLACE FUNCTION public.revoke_tree_invitation(p_invitation_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
  SELECT private.revoke_tree_invitation(p_invitation_id);
$function$;


-- =========================================================================
-- 4. Manage execution permissions
-- =========================================================================

-- 4.1 Revoke default PUBLIC/anon execute access
REVOKE EXECUTE ON FUNCTION private.accept_tree_invitation(text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION private.accept_tree_invitation_by_id(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION private.claim_collaborator_memberships() FROM public, anon;
REVOKE EXECUTE ON FUNCTION private.create_tree_invitation(uuid, text, text, integer) FROM public, anon;
REVOKE EXECUTE ON FUNCTION private.create_tree_with_root(text, text, jsonb, jsonb) FROM public, anon;
REVOKE EXECUTE ON FUNCTION private.decline_tree_invitation(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION private.replace_tree_content(uuid, jsonb, jsonb) FROM public, anon;
REVOKE EXECUTE ON FUNCTION private.revoke_tree_invitation(uuid) FROM public, anon;

REVOKE EXECUTE ON FUNCTION public.accept_tree_invitation(text) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.accept_tree_invitation_by_id(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.claim_collaborator_memberships() FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.create_tree_invitation(uuid, text, text, integer) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.create_tree_with_root(text, text, jsonb, jsonb) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.decline_tree_invitation(uuid) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.replace_tree_content(uuid, jsonb, jsonb) FROM public, anon;
REVOKE EXECUTE ON FUNCTION public.revoke_tree_invitation(uuid) FROM public, anon;

-- 4.2 Grant explicit execute rights to authenticated and service_role
GRANT EXECUTE ON FUNCTION private.accept_tree_invitation(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.accept_tree_invitation_by_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.claim_collaborator_memberships() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.create_tree_invitation(uuid, text, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.create_tree_with_root(text, text, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.decline_tree_invitation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.replace_tree_content(uuid, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.revoke_tree_invitation(uuid) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.accept_tree_invitation(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_tree_invitation_by_id(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_collaborator_memberships() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_tree_invitation(uuid, text, text, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.create_tree_with_root(text, text, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.decline_tree_invitation(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.replace_tree_content(uuid, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.revoke_tree_invitation(uuid) TO authenticated, service_role;

-- Reload Schema
NOTIFY pgrst, 'reload schema';

COMMIT;
