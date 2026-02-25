-- RLS: Comprehensive security for trees, people, relationships, tree_operations, and tree_collaborators.
-- This migration supersedes previous RLS for these tables and introduces sharing logic.

-- Ensure tables have RLS enabled
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tree_shares ENABLE ROW LEVEL SECURITY;

-- Helper function to check if a user is a collaborator with at least a certain role
-- role requirement: 'viewer' (can read), 'editor' (can read/write)
CREATE OR REPLACE FUNCTION public.is_tree_collaborator(p_tree_id UUID, p_required_role TEXT DEFAULT 'viewer')
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tree_collaborators
    WHERE tree_id = p_tree_id
    AND lower(email) = lower(auth.jwt() ->> 'email')
    AND (
      p_required_role = 'viewer' 
      OR (p_required_role = 'editor' AND role = 'editor')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== TREES ==========
DROP POLICY IF EXISTS "trees_owner_all" ON public.trees;
DROP POLICY IF EXISTS "trees_collaborator_read" ON public.trees;

-- Owner has full control
CREATE POLICY "trees_owner_all" ON public.trees
    FOR ALL USING (owner_id = public.current_user_id_text());

-- Collaborators can read
CREATE POLICY "trees_collaborator_read" ON public.trees
    FOR SELECT USING (public.is_tree_collaborator(id, 'viewer'));


-- ========== PEOPLE ==========
DROP POLICY IF EXISTS "people_owner_all" ON public.people;
DROP POLICY IF EXISTS "people_collaborator_read" ON public.people;
DROP POLICY IF EXISTS "people_collaborator_write" ON public.people;

-- Owner has full control
CREATE POLICY "people_owner_all" ON public.people
    FOR ALL USING (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));

-- Collaborators can read
CREATE POLICY "people_collaborator_read" ON public.people
    FOR SELECT USING (public.is_tree_collaborator(tree_id, 'viewer'));

-- Editors can write
CREATE POLICY "people_collaborator_write" ON public.people
    FOR ALL USING (public.is_tree_collaborator(tree_id, 'editor'));


-- ========== RELATIONSHIPS ==========
DROP POLICY IF EXISTS "relationships_owner_all" ON public.relationships;
DROP POLICY IF EXISTS "relationships_collaborator_read" ON public.relationships;
DROP POLICY IF EXISTS "relationships_collaborator_write" ON public.relationships;

CREATE POLICY "relationships_owner_all" ON public.relationships
    FOR ALL USING (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));

CREATE POLICY "relationships_collaborator_read" ON public.relationships
    FOR SELECT USING (public.is_tree_collaborator(tree_id, 'viewer'));

CREATE POLICY "relationships_collaborator_write" ON public.relationships
    FOR ALL USING (public.is_tree_collaborator(tree_id, 'editor'));


-- ========== TREE_OPERATIONS ==========
DROP POLICY IF EXISTS "tree_ops_owner_all" ON public.tree_operations;
DROP POLICY IF EXISTS "tree_ops_collaborator_read" ON public.tree_operations;
DROP POLICY IF EXISTS "tree_ops_collaborator_write" ON public.tree_operations;

CREATE POLICY "tree_ops_owner_all" ON public.tree_operations
    FOR ALL USING (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));

CREATE POLICY "tree_ops_collaborator_read" ON public.tree_operations
    FOR SELECT USING (public.is_tree_collaborator(tree_id, 'viewer'));

CREATE POLICY "tree_ops_collaborator_write" ON public.tree_operations
    FOR ALL USING (public.is_tree_collaborator(tree_id, 'editor'));


-- ========== TREE_COLLABORATORS ==========
DROP POLICY IF EXISTS "collabs_owner_all" ON public.tree_collaborators;
DROP POLICY IF EXISTS "collabs_self_read" ON public.tree_collaborators;

-- Owner manages collaborators
CREATE POLICY "collabs_owner_all" ON public.tree_collaborators
    FOR ALL USING (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));

-- Collaborators can see their own participation
CREATE POLICY "collabs_self_read" ON public.tree_collaborators
    FOR SELECT USING (lower(email) = lower(auth.jwt() ->> 'email'));


-- ========== TREE_SHARES (Legacy/Settings) ==========
DROP POLICY IF EXISTS "shares_owner_all" ON public.tree_shares;
DROP POLICY IF EXISTS "shares_collaborator_read" ON public.tree_shares;

CREATE POLICY "shares_owner_all" ON public.tree_shares
    FOR ALL USING (owner_uid = public.current_user_id_text());

CREATE POLICY "shares_collaborator_read" ON public.tree_shares
    FOR SELECT USING (public.is_tree_collaborator(tree_id, 'viewer'));

NOTIFY pgrst, 'reload schema';
