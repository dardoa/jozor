-- SECURITY DEFINER RPCs should not inherit EXECUTE through PUBLIC. The app
-- calls these through signed-in clients, so keep authenticated access explicit.

BEGIN;

-- These legacy helpers are absent or installed later in fresh environments.
DO $legacy_grants$
DECLARE
  signature text;
  target regprocedure;
BEGIN
  FOREACH signature IN ARRAY ARRAY[
    'public.claim_collaborator_memberships()',
    'public.current_user_email_text()',
    'public.is_tree_owner(uuid)'
  ] LOOP
    target := to_regprocedure(signature);
    IF target IS NOT NULL THEN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', target);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', target);
    END IF;
  END LOOP;
END;
$legacy_grants$;

REVOKE EXECUTE ON FUNCTION public.accept_tree_invitation(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.accept_tree_invitation_by_id(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_edit_tree(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_person_and_relationship(UUID, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_tree_invitation(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_tree_with_root(TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.current_user_id_text() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decline_tree_invitation(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.delete_person_and_relations(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_tree_collaborator(UUID, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prune_activity_logs(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prune_tree_operations(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.replace_tree_content(UUID, JSONB, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.revoke_tree_invitation(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_tree_batch(JSONB) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.accept_tree_invitation(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_tree_invitation_by_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_tree(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_person_and_relationship(UUID, TEXT, JSONB, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tree_invitation(UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_tree_with_root(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_id_text() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decline_tree_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_person_and_relations(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_tree_collaborator(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prune_activity_logs(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prune_tree_operations(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.replace_tree_content(UUID, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_tree_invitation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_tree_batch(JSONB) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
