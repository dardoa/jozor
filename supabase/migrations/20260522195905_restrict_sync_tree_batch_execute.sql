-- The current sync client no longer calls public.sync_tree_batch(JSONB).
-- It projects readable tree rows first and inserts sanitized operation rows
-- into public.tree_operations directly under RLS. Keep the legacy function in
-- place for compatibility analysis, but remove direct REST/RPC execution from
-- browser-authenticated roles.

BEGIN;

REVOKE EXECUTE ON FUNCTION public.sync_tree_batch(JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_tree_batch(JSONB) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_tree_batch(JSONB) FROM PUBLIC;

COMMIT;

NOTIFY pgrst, 'reload schema';
