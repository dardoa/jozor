-- Maintenance pruning now runs through src/api/maintenance.ts with a
-- service-role client after an explicit owner check. Signed-in browser clients
-- should no longer call these SECURITY DEFINER functions directly.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.prune_tree_operations(UUID, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_activity_logs(UUID, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_tree_operations(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prune_activity_logs(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prune_tree_operations(UUID, INTEGER) FROM anon;
REVOKE EXECUTE ON FUNCTION public.prune_activity_logs(UUID, INTEGER) FROM anon;

COMMIT;

NOTIFY pgrst, 'reload schema';
