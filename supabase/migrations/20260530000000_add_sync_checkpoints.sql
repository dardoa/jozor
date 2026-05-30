-- Migration: Add Sync Checkpoints
-- Description: Creates the tree_checkpoints table, sets up RLS policies, and registers
--              an automatic trigger to maintain the latest 3 checkpoints and prune old tree operations.

BEGIN;

-- 1. Create table public.tree_checkpoints
CREATE TABLE IF NOT EXISTS public.tree_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
    version_seq BIGINT NOT NULL,
    people JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_tree_checkpoints_tree_version UNIQUE (tree_id, version_seq)
);

-- 2. Create index for fast checkpoint retrieval
CREATE INDEX IF NOT EXISTS idx_tree_checkpoints_lookup
  ON public.tree_checkpoints(tree_id, version_seq DESC);

-- 3. Enable RLS
ALTER TABLE public.tree_checkpoints ENABLE ROW LEVEL SECURITY;

-- 4. Drop and recreate RLS policies
DROP POLICY IF EXISTS "checkpoints_owner_all" ON public.tree_checkpoints;
DROP POLICY IF EXISTS "checkpoints_collaborator_read" ON public.tree_checkpoints;
DROP POLICY IF EXISTS "checkpoints_collaborator_write" ON public.tree_checkpoints;

-- Owner has full control
CREATE POLICY "checkpoints_owner_all" ON public.tree_checkpoints
    FOR ALL USING (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));

-- Collaborators (viewers or editors) can read checkpoints
CREATE POLICY "checkpoints_collaborator_read" ON public.tree_checkpoints
    FOR SELECT USING (public.is_tree_collaborator(tree_id, 'viewer'));

-- Editors can write/delete checkpoints
CREATE POLICY "checkpoints_collaborator_write" ON public.tree_checkpoints
    FOR ALL USING (public.is_tree_collaborator(tree_id, 'editor'));

-- 5. Revoke public/anon privileges and grant to authenticated and service_role
REVOKE ALL ON public.tree_checkpoints FROM public, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tree_checkpoints TO authenticated, service_role;

-- 6. Trigger to keep latest 3 checkpoints and prune older operations
CREATE OR REPLACE FUNCTION private.prune_old_checkpoints_and_ops()
RETURNS TRIGGER AS $$
DECLARE
  v_min_version BIGINT;
BEGIN
  -- Keep only the latest 3 checkpoints for this tree
  DELETE FROM public.tree_checkpoints
  WHERE tree_id = NEW.tree_id
    AND id NOT IN (
      SELECT id FROM (
        SELECT id FROM public.tree_checkpoints
        WHERE tree_id = NEW.tree_id
        ORDER BY version_seq DESC
        LIMIT 3
      ) tmp
    );

  -- Find the minimum version_seq among the remaining checkpoints
  SELECT MIN(version_seq) INTO v_min_version
  FROM public.tree_checkpoints
  WHERE tree_id = NEW.tree_id;

  -- Prune operations older than the minimum checkpoint version
  IF v_min_version IS NOT NULL AND v_min_version > 0 THEN
    DELETE FROM public.tree_operations
    WHERE tree_id = NEW.tree_id
      AND version_seq < v_min_version;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, private, pg_temp;

DROP TRIGGER IF EXISTS prune_old_checkpoints_trigger ON public.tree_checkpoints;
CREATE TRIGGER prune_old_checkpoints_trigger
AFTER INSERT ON public.tree_checkpoints
FOR EACH ROW
EXECUTE FUNCTION private.prune_old_checkpoints_and_ops();

COMMIT;

NOTIFY pgrst, 'reload schema';
