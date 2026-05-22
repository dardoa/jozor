-- Keep claim_collaborator_memberships callable by authenticated users because
-- the app uses it during access restoration, but make the privileged update
-- explicit about the caller identity it is willing to trust.

BEGIN;

CREATE OR REPLACE FUNCTION public.claim_collaborator_memberships()
RETURNS INTEGER AS $$
DECLARE
  v_claimed_count INTEGER := 0;
  v_caller_id TEXT;
  v_caller_email TEXT;
BEGIN
  v_caller_id := public.current_user_id_text();
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp;

COMMIT;

NOTIFY pgrst, 'reload schema';
