-- RLS: Secure trees, people, and tree_operations.
-- Depends on public.current_user_id_text() from 20260221_user_profiles_rls_auth_uid.sql.
-- trees: access only when owner_uid = current user.
-- people / tree_operations: access only when the linked tree is owned by the current user.
-- Note: If your trees table uses owner_id instead of owner_uid, replace owner_uid with owner_id below.

-- ========== TREES ==========
ALTER TABLE public.trees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "trees_select_owner" ON public.trees;
DROP POLICY IF EXISTS "trees_insert_owner" ON public.trees;
DROP POLICY IF EXISTS "trees_update_owner" ON public.trees;
DROP POLICY IF EXISTS "trees_delete_owner" ON public.trees;

CREATE POLICY "trees_select_owner" ON public.trees FOR SELECT USING (owner_id = public.current_user_id_text());
CREATE POLICY "trees_insert_owner" ON public.trees FOR INSERT WITH CHECK (owner_id = public.current_user_id_text());
CREATE POLICY "trees_update_owner" ON public.trees FOR UPDATE USING (owner_id = public.current_user_id_text()) WITH CHECK (owner_id = public.current_user_id_text());
CREATE POLICY "trees_delete_owner" ON public.trees FOR DELETE USING (owner_id = public.current_user_id_text());

ALTER TABLE public.people ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "people_select_tree_owner" ON public.people;
DROP POLICY IF EXISTS "people_insert_tree_owner" ON public.people;
DROP POLICY IF EXISTS "people_update_tree_owner" ON public.people;
DROP POLICY IF EXISTS "people_delete_tree_owner" ON public.people;

CREATE POLICY "people_select_tree_owner" ON public.people FOR SELECT USING (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));
CREATE POLICY "people_insert_tree_owner" ON public.people FOR INSERT WITH CHECK (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));
CREATE POLICY "people_update_tree_owner" ON public.people FOR UPDATE USING (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())) WITH CHECK (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));
CREATE POLICY "people_delete_tree_owner" ON public.people FOR DELETE USING (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));

ALTER TABLE public.tree_operations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tree_operations_select_tree_owner" ON public.tree_operations;
DROP POLICY IF EXISTS "tree_operations_insert_tree_owner" ON public.tree_operations;
DROP POLICY IF EXISTS "tree_operations_update_tree_owner" ON public.tree_operations;
DROP POLICY IF EXISTS "tree_operations_delete_tree_owner" ON public.tree_operations;

CREATE POLICY "tree_operations_select_tree_owner" ON public.tree_operations FOR SELECT USING (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));
CREATE POLICY "tree_operations_insert_tree_owner" ON public.tree_operations FOR INSERT WITH CHECK (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));
CREATE POLICY "tree_operations_update_tree_owner" ON public.tree_operations FOR UPDATE USING (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())) WITH CHECK (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));
CREATE POLICY "tree_operations_delete_tree_owner" ON public.tree_operations FOR DELETE USING (tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text()));

NOTIFY pgrst, 'reload schema';
