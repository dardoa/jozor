-- Migration: Harden Media Sync Security and Defaults
-- Description: Sets column defaults for tree_operations and implements strict RLS for direct inserts.

BEGIN;

-- 1. Ensure Table Defaults for Direct Insert
-- This allows the frontend to omit these fields, letting the DB handle timing.
-- Some environments already model version_seq as an identity column; identity
-- columns cannot also receive an explicit default, so only set a sequence
-- default for older non-identity schemas.
ALTER TABLE public.tree_operations
  ALTER COLUMN created_at SET DEFAULT NOW();

DO $$
DECLARE
  v_is_identity TEXT;
BEGIN
  SELECT is_identity
  INTO v_is_identity
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'tree_operations'
    AND column_name = 'version_seq';

  IF v_is_identity = 'NO' THEN
    CREATE SEQUENCE IF NOT EXISTS public.tree_version_seq;

    ALTER TABLE public.tree_operations
      ALTER COLUMN version_seq SET DEFAULT nextval('public.tree_version_seq'::regclass);
  END IF;
END $$;

-- 2. Harden tree_operations RLS
-- We replace the temporary "WITH CHECK (true)" with a strict membership check.
ALTER TABLE public.tree_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert their own operations" ON public.tree_operations;

CREATE POLICY "Users can insert their own operations" 
ON public.tree_operations
FOR INSERT 
TO authenticated
WITH CHECK (
  -- Rule 1: The user_id in the operation must match the authenticated user.
  (public.current_user_id_text() = user_id)
  AND
  -- Rule 2: The user must own the target tree or be an editor collaborator.
  (
    EXISTS (
      SELECT 1
      FROM public.trees
      WHERE id = tree_operations.tree_id
        AND owner_id = public.current_user_id_text()
    )
    OR public.is_tree_collaborator(tree_operations.tree_id, 'editor')
  )
);

-- 3. Cleanup Legacy RPC
-- Since we moved to direct insert to avoid 404/schema cache issues, 
-- we keep the function for backward compatibility but ensure it's secure.
-- (We've already updated it in the DB, so no changes needed here unless we want to drop it).

-- 4. Grant Permissions
GRANT INSERT, SELECT ON TABLE public.tree_operations TO authenticated;

COMMIT;
