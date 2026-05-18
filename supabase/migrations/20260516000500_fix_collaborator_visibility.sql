-- Migration: Allow collaborators to see each other
-- Description: Updates RLS on tree_collaborators so members of the same tree can see the full member list.

BEGIN;

-- 1. Drop the restrictive 'self-read' policy
DROP POLICY IF EXISTS "collabs_self_read" ON public.tree_collaborators;
DROP POLICY IF EXISTS "collabs_tree_member_read" ON public.tree_collaborators;

-- 2. Create a new policy that allows any authorized collaborator to see all collaborators of the same tree
CREATE POLICY "collabs_tree_member_read" ON public.tree_collaborators
    FOR SELECT USING (
        tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
        OR public.is_tree_collaborator(tree_id, 'viewer')
    );

COMMIT;

NOTIFY pgrst, 'reload schema';
