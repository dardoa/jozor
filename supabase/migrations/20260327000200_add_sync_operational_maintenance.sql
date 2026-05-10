BEGIN;

CREATE INDEX IF NOT EXISTS idx_tree_operations_tree_id_created_at
  ON public.tree_operations(tree_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_logs_tree_id_action_created_at
  ON public.activity_logs(tree_id, action_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.prune_tree_operations(
  p_tree_id UUID,
  p_keep_latest INTEGER DEFAULT 2000
)
RETURNS INTEGER AS $$
DECLARE
  v_caller_id TEXT;
  v_deleted_count INTEGER := 0;
BEGIN
  v_caller_id := public.current_user_id_text();

  IF NOT EXISTS (
    SELECT 1
    FROM public.trees
    WHERE id = p_tree_id
      AND owner_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Only the tree owner can prune tree operations';
  END IF;

  WITH ranked AS (
    SELECT id
    FROM public.tree_operations
    WHERE tree_id = p_tree_id
    ORDER BY version_seq DESC
    OFFSET GREATEST(p_keep_latest, 0)
  )
  DELETE FROM public.tree_operations
  WHERE id IN (SELECT id FROM ranked);

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.prune_activity_logs(
  p_tree_id UUID,
  p_keep_days INTEGER DEFAULT 180
)
RETURNS INTEGER AS $$
DECLARE
  v_caller_id TEXT;
  v_deleted_count INTEGER := 0;
BEGIN
  v_caller_id := public.current_user_id_text();

  IF NOT EXISTS (
    SELECT 1
    FROM public.trees
    WHERE id = p_tree_id
      AND owner_id = v_caller_id
  ) THEN
    RAISE EXCEPTION 'Only the tree owner can prune activity logs';
  END IF;

  DELETE FROM public.activity_logs
  WHERE tree_id = p_tree_id
    AND created_at < NOW() - make_interval(days => GREATEST(p_keep_days, 0));

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.prune_tree_operations(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.prune_activity_logs(UUID, INTEGER) TO authenticated;

COMMIT;

NOTIFY pgrst, 'reload schema';
