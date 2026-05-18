-- Migration: Harden Tree Discussions Security
-- Description: Ensures users can only send messages as themselves.

BEGIN;

-- Update the INSERT policy to check the user_id
DROP POLICY IF EXISTS "tree_discussions_insert" ON public.tree_discussions;

CREATE POLICY "tree_discussions_insert" ON public.tree_discussions
  FOR INSERT WITH CHECK (
    (
      public.is_tree_collaborator(tree_id, 'editor')
      OR tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
    )
    AND user_id = public.current_user_id_text()
  );

-- Also add a policy for DELETE so users can delete their own messages
DROP POLICY IF EXISTS "tree_discussions_delete" ON public.tree_discussions;

CREATE POLICY "tree_discussions_delete" ON public.tree_discussions
  FOR DELETE USING (
    user_id = public.current_user_id_text()
    OR tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
  );

COMMIT;
