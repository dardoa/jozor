BEGIN;

CREATE TABLE IF NOT EXISTS public.tree_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  invited_uid TEXT,
  role TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  invited_by TEXT NOT NULL,
  accepted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tree_invitations_tree_id
  ON public.tree_invitations(tree_id);

CREATE INDEX IF NOT EXISTS idx_tree_invitations_invited_email
  ON public.tree_invitations(lower(invited_email));

CREATE INDEX IF NOT EXISTS idx_tree_invitations_invited_uid
  ON public.tree_invitations(invited_uid);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tree_invitations_token_hash
  ON public.tree_invitations(token_hash);

CREATE OR REPLACE FUNCTION public.create_tree_invitation(
  p_tree_id UUID,
  p_invited_email TEXT,
  p_role TEXT DEFAULT 'viewer',
  p_expires_in_hours INTEGER DEFAULT 168
)
RETURNS TABLE(invitation_id UUID, invite_token TEXT) AS $$
DECLARE
  v_caller_id TEXT;
  v_token TEXT;
  v_token_hash TEXT;
  v_invitation_id UUID;
BEGIN
  v_caller_id := public.current_user_id_text();

  IF NOT EXISTS (
    SELECT 1 FROM public.trees WHERE id = p_tree_id AND owner_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Only the tree owner can create invitations';
  END IF;

  IF p_role NOT IN ('viewer', 'editor') THEN
    RAISE EXCEPTION 'Invalid invitation role';
  END IF;

  v_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  v_token_hash := encode(digest(v_token, 'sha256'), 'hex');

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.accept_tree_invitation(p_invite_token TEXT)
RETURNS TABLE(tree_id UUID, role TEXT, invitation_id UUID) AS $$
DECLARE
  v_caller_id TEXT;
  v_caller_email TEXT;
  v_token_hash TEXT;
  v_invitation public.tree_invitations%ROWTYPE;
BEGIN
  v_caller_id := public.current_user_id_text();
  v_caller_email := lower(coalesce(auth.jwt() ->> 'email', ''));
  v_token_hash := encode(digest(p_invite_token, 'sha256'), 'hex');

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.revoke_tree_invitation(p_invitation_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_caller_id TEXT;
  v_tree_id UUID;
BEGIN
  v_caller_id := public.current_user_id_text();

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
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.tree_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tree_invitations_owner_all" ON public.tree_invitations;
DROP POLICY IF EXISTS "tree_invitations_invited_read" ON public.tree_invitations;

CREATE POLICY "tree_invitations_owner_all" ON public.tree_invitations
  FOR ALL USING (
    tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
  );

CREATE POLICY "tree_invitations_invited_read" ON public.tree_invitations
  FOR SELECT USING (
    invited_uid = public.current_user_id_text()
    OR lower(invited_email) = lower(auth.jwt() ->> 'email')
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
