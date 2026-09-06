BEGIN;

CREATE OR REPLACE FUNCTION public.accept_tree_invitation_by_id(p_invitation_id UUID)
RETURNS TABLE(out_tree_id UUID, out_role TEXT, out_invitation_id UUID) AS $$
DECLARE
  v_caller_id TEXT;
  v_caller_email TEXT;
  -- The invitation table is installed by 20260327000300 before these RPCs run.
  v_invitation RECORD;
BEGIN
  v_caller_id := public.current_user_id_text();
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.decline_tree_invitation(p_invitation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_caller_email TEXT;
  v_invitation RECORD;
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
      public.current_user_id_text(),
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

NOTIFY pgrst, 'reload schema';
