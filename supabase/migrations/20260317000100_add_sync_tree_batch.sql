-- Migration: Add authenticated batch sync RPC for tree operations.
-- Description: Persists queued delta operations with server-side authorization
--              and monotonically increasing version_seq values per tree.

BEGIN;
CREATE OR REPLACE FUNCTION public.sync_tree_batch(
  p_ops JSONB
) RETURNS INTEGER AS $$
DECLARE
  v_caller_id TEXT;
  v_inserted_count INTEGER := 0;
  v_tree_id UUID;
  v_base_version BIGINT;
BEGIN
  v_caller_id := public.current_user_id_text();

  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Access Denied: Missing authenticated user.';
  END IF;

  IF p_ops IS NULL OR jsonb_typeof(p_ops) <> 'array' OR jsonb_array_length(p_ops) = 0 THEN
    RETURN 0;
  END IF;

  -- This RPC intentionally supports one tree per batch, matching the client contract.
  SELECT (value->>'tree_id')::UUID
  INTO v_tree_id
  FROM jsonb_array_elements(p_ops) AS value
  LIMIT 1;

  IF v_tree_id IS NULL THEN
    RAISE EXCEPTION 'Validation Error: Missing tree_id in sync batch.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_ops) AS value
    WHERE (value->>'tree_id')::UUID IS DISTINCT FROM v_tree_id
  ) THEN
    RAISE EXCEPTION 'Validation Error: sync_tree_batch accepts one tree_id per batch.';
  END IF;

  IF NOT (
    EXISTS (SELECT 1 FROM public.trees WHERE id = v_tree_id AND owner_id = v_caller_id)
    OR public.is_tree_collaborator(v_tree_id, 'editor')
  ) THEN
    RAISE EXCEPTION 'Access Denied: User % cannot sync tree %', v_caller_id, v_tree_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_ops) AS value
    WHERE COALESCE(value->>'user_id', '') <> v_caller_id
  ) THEN
    RAISE EXCEPTION 'Access Denied: Batch contains operations for another user.';
  END IF;

  SELECT COALESCE(MAX(version_seq), 0)
  INTO v_base_version
  FROM public.tree_operations
  WHERE tree_id = v_tree_id;

  INSERT INTO public.tree_operations (
    tree_id,
    user_id,
    type,
    payload,
    version_seq,
    created_at
  )
  SELECT
    (value->>'tree_id')::UUID,
    value->>'user_id',
    value->>'type',
    COALESCE(value->'payload', '{}'::JSONB),
    v_base_version + ROW_NUMBER() OVER (),
    COALESCE((value->>'created_at')::timestamptz, NOW())
  FROM jsonb_array_elements(p_ops) AS value;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;
  RETURN v_inserted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
GRANT EXECUTE ON FUNCTION public.sync_tree_batch(JSONB) TO authenticated;
COMMIT;
NOTIFY pgrst, 'reload schema';
