-- Harden legacy SECURITY DEFINER functions by pinning their search path.
-- This prevents attacker-controlled schemas from influencing unqualified names
-- inside privileged RPCs.

BEGIN;

DO $$
BEGIN
  IF to_regprocedure('public.is_tree_collaborator(uuid,text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.is_tree_collaborator(UUID, TEXT) SET search_path = public';
  END IF;

  IF to_regprocedure('public.replace_tree_content(uuid,jsonb,jsonb)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.replace_tree_content(UUID, JSONB, JSONB) SET search_path = public';
  END IF;

  IF to_regprocedure('public.accept_tree_invitation_by_id(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.accept_tree_invitation_by_id(UUID) SET search_path = public';
  END IF;

  IF to_regprocedure('public.decline_tree_invitation(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.decline_tree_invitation(UUID) SET search_path = public';
  END IF;

  IF to_regprocedure('public.prune_tree_operations(uuid,integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.prune_tree_operations(UUID, INTEGER) SET search_path = public';
  END IF;

  IF to_regprocedure('public.prune_activity_logs(uuid,integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.prune_activity_logs(UUID, INTEGER) SET search_path = public';
  END IF;

  IF to_regprocedure('public.create_tree_invitation(uuid,text,text,integer)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.create_tree_invitation(UUID, TEXT, TEXT, INTEGER) SET search_path = public';
  END IF;

  IF to_regprocedure('public.accept_tree_invitation(text)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.accept_tree_invitation(TEXT) SET search_path = public';
  END IF;

  IF to_regprocedure('public.revoke_tree_invitation(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.revoke_tree_invitation(UUID) SET search_path = public';
  END IF;

  IF to_regprocedure('public.current_user_id_text()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.current_user_id_text() SET search_path = public';
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
