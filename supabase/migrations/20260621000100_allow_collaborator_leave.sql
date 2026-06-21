-- Migration: Allow collaborators to leave shared trees
-- Description: Adds a Row Level Security (RLS) delete policy on tree_collaborators.

BEGIN;

DROP POLICY IF EXISTS "collabs_self_delete" ON public.tree_collaborators;

CREATE POLICY "collabs_self_delete"
ON public.tree_collaborators
FOR DELETE
TO authenticated
USING (
  lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

COMMIT;

NOTIFY pgrst, 'reload schema';
