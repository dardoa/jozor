-- Migration: Add Tree Discussions
-- Description: Creates a shared discussion space for each tree where collaborators can communicate.

BEGIN;

-- 1. Create the tree_discussions table
CREATE TABLE IF NOT EXISTS public.tree_discussions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id UUID NOT NULL REFERENCES public.trees(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  content TEXT NOT NULL,
  reply_to_event_id UUID REFERENCES public.activity_logs(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tree_discussions_tree_id 
  ON public.tree_discussions(tree_id);

CREATE INDEX IF NOT EXISTS idx_tree_discussions_created_at 
  ON public.tree_discussions(created_at DESC);

-- 3. Enable RLS
ALTER TABLE public.tree_discussions ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
-- Use the existing is_tree_collaborator helper function

DROP POLICY IF EXISTS "tree_discussions_select" ON public.tree_discussions;
CREATE POLICY "tree_discussions_select" ON public.tree_discussions
  FOR SELECT USING (
    public.is_tree_collaborator(tree_id, 'viewer')
    OR tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
  );

DROP POLICY IF EXISTS "tree_discussions_insert" ON public.tree_discussions;
CREATE POLICY "tree_discussions_insert" ON public.tree_discussions
  FOR INSERT WITH CHECK (
    public.is_tree_collaborator(tree_id, 'editor')
    OR tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
  );

-- 5. Enable Realtime
-- This is critical for the "Discussion" feel.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'tree_discussions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tree_discussions;
  END IF;
END $$;

COMMIT;

NOTIFY pgrst, 'reload schema';
