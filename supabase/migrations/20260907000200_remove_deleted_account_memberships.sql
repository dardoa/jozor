BEGIN;

CREATE OR REPLACE FUNCTION private.delete_my_profile_data()
RETURNS VOID AS $$
DECLARE
  v_user_id TEXT;
  v_email TEXT;
BEGIN
  v_user_id := private.current_user_id_text();
  IF v_user_id IS NULL OR btrim(v_user_id) = '' THEN
    RAISE EXCEPTION 'Access Denied: Missing authenticated user.';
  END IF;
  v_email := nullif(lower(auth.jwt() ->> 'email'), '');

  -- Also protect direct RPC callers; scheduled cancellation is not canceled yet.
  IF EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = v_user_id AND status IS DISTINCT FROM 'canceled'
  ) THEN
    RAISE EXCEPTION 'ACCOUNT_HAS_OPEN_SUBSCRIPTION';
  END IF;

  -- Memberships are keyed by UID or email, not by a cascading profile FK.
  -- Remove access to other owners' trees without deleting their content.
  DELETE FROM public.tree_collaborators
  WHERE collaborator_uid = v_user_id OR lower(email) = v_email;

  DELETE FROM public.tree_invitations
  WHERE invited_uid = v_user_id OR accepted_by = v_user_id
     OR lower(invited_email) = v_email;

  DELETE FROM public.user_keys WHERE user_id = v_user_id;
  DELETE FROM public.trees WHERE owner_id = v_user_id;
  DELETE FROM public.user_profiles WHERE id = v_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

REVOKE ALL ON FUNCTION private.delete_my_profile_data() FROM PUBLIC, anon;
-- CREATE OR REPLACE preserves existing ACLs, including an operator's admission pause.
-- Do not restore authenticated EXECUTE while upgrading a paused legacy database.

COMMIT;
