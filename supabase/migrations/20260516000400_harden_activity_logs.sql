-- Migration: Harden Activity Logs Security
-- Description: Enables RLS on activity_logs and ensures only authorized members can view logs.

BEGIN;

-- 1. Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop legacy policies if any (cleanup)
DROP POLICY IF EXISTS "activity_logs_select_policy" ON public.activity_logs;
DROP POLICY IF EXISTS "activity_logs_insert_policy" ON public.activity_logs;

-- 3. Policy: Allow owners and collaborators to SELECT logs
CREATE POLICY "activity_logs_select_policy" ON public.activity_logs
    FOR SELECT USING (
        tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
        OR public.is_tree_collaborator(tree_id, 'viewer')
    );

-- 4. Policy: Allow authenticated users to INSERT logs for trees they have access to
CREATE POLICY "activity_logs_insert_policy" ON public.activity_logs
    FOR INSERT WITH CHECK (
        (
            tree_id IN (SELECT id FROM public.trees WHERE owner_id = public.current_user_id_text())
            OR public.is_tree_collaborator(tree_id, 'editor')
        )
        AND user_id = public.current_user_id_text()
    );

-- 5. Note: No UPDATE or DELETE policies are created. Activity logs are immutable records.
-- Exception: Pruning via security definer functions is allowed if needed for maintenance.

COMMIT;

NOTIFY pgrst, 'reload schema';
