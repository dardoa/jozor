BEGIN;

-- No profile FK: this record must survive deletion and same-subject onboarding.
CREATE TABLE IF NOT EXISTS private.account_session_generations (
  user_id text PRIMARY KEY,
  generation uuid NOT NULL DEFAULT gen_random_uuid(),
  active boolean NOT NULL DEFAULT true,
  accept_legacy boolean NOT NULL DEFAULT true
);
REVOKE ALL ON private.account_session_generations FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.is_account_session_active()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, private, public AS $$
DECLARE
  claims jsonb := auth.jwt();
  uid text := claims ->> 'sub';
  state private.account_session_generations%ROWTYPE;
BEGIN
  IF uid IS NULL OR btrim(uid) = '' OR claims ->> 'role' IS DISTINCT FROM 'authenticated'
    OR NOT EXISTS (SELECT 1 FROM public.user_profiles WHERE id = uid) THEN
    RETURN false;
  END IF;
  SELECT * INTO state FROM private.account_session_generations WHERE user_id = uid;
  IF NOT FOUND THEN
    -- Existing sessions are grandfathered only until the first account deletion.
    RETURN NOT (claims ? 'account_session');
  END IF;
  RETURN state.active AND (
    claims ->> 'account_session' = state.generation::text
    OR (state.accept_legacy AND NOT (claims ? 'account_session'))
  ) IS TRUE;
END;
$$;
REVOKE ALL ON FUNCTION private.is_account_session_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_account_session_active() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.is_my_account_session_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = pg_catalog, private AS $$
  SELECT private.is_account_session_active();
$$;
REVOKE ALL ON FUNCTION public.is_my_account_session_active() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_my_account_session_active() TO authenticated;

-- Called only after verified Google onboarding. Concurrent live logins share the
-- same generation; revival after deletion never restores a previous generation.
CREATE OR REPLACE FUNCTION public.issue_account_session(p_user_id text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, private, public AS $$
DECLARE result uuid;
BEGIN
  PERFORM 1 FROM public.user_profiles WHERE id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ACCOUNT_PROFILE_REQUIRED'; END IF;
  INSERT INTO private.account_session_generations AS existing (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO UPDATE SET
    generation = CASE WHEN existing.active THEN existing.generation ELSE gen_random_uuid() END,
    active = true
  RETURNING generation INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_account_session(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.issue_account_session(text) TO service_role;

CREATE OR REPLACE FUNCTION private.revoke_deleted_account_sessions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = pg_catalog, private AS $$
BEGIN
  INSERT INTO private.account_session_generations (user_id, active, accept_legacy)
  VALUES (OLD.id, false, false)
  ON CONFLICT (user_id) DO UPDATE SET generation = gen_random_uuid(), active = false, accept_legacy = false;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION private.revoke_deleted_account_sessions() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS revoke_account_sessions_before_delete ON public.user_profiles;
CREATE TRIGGER revoke_account_sessions_before_delete BEFORE DELETE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION private.revoke_deleted_account_sessions();

CREATE OR REPLACE FUNCTION private.current_user_id_text()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, private AS $$
  SELECT CASE WHEN private.is_account_session_active() THEN auth.jwt() ->> 'sub' END;
$$;

CREATE OR REPLACE FUNCTION private.is_tree_collaborator(p_tree_id uuid, p_required_role text DEFAULT 'viewer')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, private, public AS $$
  SELECT private.is_account_session_active() AND EXISTS (
    SELECT 1 FROM public.tree_collaborators WHERE tree_id = p_tree_id
    AND (collaborator_uid = auth.jwt() ->> 'sub' OR lower(email) = lower(auth.jwt() ->> 'email'))
    AND (p_required_role = 'viewer' OR (p_required_role = 'editor' AND role = 'editor'))
  );
$$;

-- An extra restrictive policy cannot grant new access. Covers raw email/subject
-- policies in Realtime and Storage, where PostgREST's pre-request hook is absent.
DO $$
DECLARE target record;
BEGIN
  FOR target IN
    SELECT n.nspname, c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind IN ('r', 'p') AND c.relrowsecurity
      AND (n.nspname = 'public' OR (n.nspname = 'storage' AND c.relname = 'objects'))
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS account_session_boundary ON %I.%I', target.nspname, target.relname);
    EXECUTE format('CREATE POLICY account_session_boundary ON %I.%I AS RESTRICTIVE FOR ALL TO authenticated
      USING ((SELECT private.is_account_session_active()))
      WITH CHECK ((SELECT private.is_account_session_active()))', target.nspname, target.relname);
  END LOOP;
END;
$$;

-- Guards SECURITY DEFINER RPCs/views that intentionally bypass table RLS.
CREATE OR REPLACE FUNCTION public.check_account_session_request()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = pg_catalog, private AS $$
BEGIN
  IF auth.jwt() ->> 'role' = 'authenticated' AND NOT private.is_account_session_active() THEN
    RAISE EXCEPTION 'Account session is no longer active' USING ERRCODE = 'PT401';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.check_account_session_request() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_account_session_request() TO authenticated, anon, service_role;

DO $$
DECLARE prior text;
BEGIN
  FOR prior IN
    SELECT split_part(setting, '=', 2) FROM pg_db_role_setting settings
    JOIN pg_roles roles ON roles.oid = settings.setrole,
    LATERAL unnest(settings.setconfig) setting
    WHERE roles.rolname = 'authenticator' AND setting LIKE 'pgrst.db_pre_request=%'
  LOOP
    IF prior <> '' AND prior <> 'public.check_account_session_request' THEN
      RAISE EXCEPTION 'Existing PostgREST pre-request hook requires explicit composition';
    END IF;
  END LOOP;
  ALTER ROLE authenticator SET pgrst.db_pre_request = 'public.check_account_session_request';
  -- A database-specific setting takes precedence over the role-wide default,
  -- including an explicitly empty value left by a previous deployment.
  EXECUTE format('ALTER ROLE authenticator IN DATABASE %I SET pgrst.db_pre_request = %L',
    current_database(), 'public.check_account_session_request');
END;
$$;

COMMIT;
NOTIFY pgrst, 'reload config';
NOTIFY pgrst, 'reload schema';
