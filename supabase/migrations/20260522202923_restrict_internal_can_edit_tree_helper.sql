-- can_edit_tree() is an internal helper for legacy tree-edit functions.
-- Current production RLS policies do not reference it, and current application
-- code does not call it directly. Keep it available to privileged/server roles
-- but remove direct REST/RPC execution from browser-authenticated roles.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.can_edit_tree(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.can_edit_tree(UUID) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_edit_tree(UUID) FROM PUBLIC;

COMMIT;

NOTIFY pgrst, 'reload schema';
