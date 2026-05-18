-- Migration: Harden Tree Discussions V2
-- Description: Adds message length limits and tightens message identity checks.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tree_discussions_content_length_check'
  ) THEN
    ALTER TABLE public.tree_discussions
      ADD CONSTRAINT tree_discussions_content_length_check
      CHECK (char_length(btrim(content)) BETWEEN 1 AND 2000) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'tree_discussions_reply_content_length_check'
  ) THEN
    ALTER TABLE public.tree_discussions
      ADD CONSTRAINT tree_discussions_reply_content_length_check
      CHECK (reply_to_content IS NULL OR char_length(reply_to_content) <= 240) NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tree_discussions_tree_created_at
  ON public.tree_discussions(tree_id, created_at DESC);

DROP POLICY IF EXISTS "tree_discussions_insert" ON public.tree_discussions;
CREATE POLICY "tree_discussions_insert" ON public.tree_discussions
  FOR INSERT WITH CHECK (
    (
      public.is_tree_collaborator(tree_id, 'editor')
      OR tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
    )
    AND user_id = public.current_user_id_text()
    AND lower(user_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND char_length(btrim(content)) BETWEEN 1 AND 2000
  );

DROP POLICY IF EXISTS "tree_discussions_delete" ON public.tree_discussions;
CREATE POLICY "tree_discussions_delete" ON public.tree_discussions
  FOR DELETE USING (
    user_id = public.current_user_id_text()
    OR tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
  );

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
