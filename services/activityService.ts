import { getSupabaseWithAuth } from './supabaseClient';
import { useAppStore } from '../store/useAppStore';

export type ActivityActionType =
    | 'ADD_PERSON'
    | 'UPDATE_PERSON'
    | 'DELETE_PERSON'
    | 'ADD_RELATION'
    | 'DELETE_RELATION'
    | 'RENAME_TREE';

export interface ActivityLog {
    id: string;
    tree_id: string;
    user_id: string;
    user_email: string;
    action_type: ActivityActionType;
    details: Record<string, unknown>;
    created_at: string;
}

export const activityService = {
    /**
     * Logs an action to the activity_logs table.
     */
    async logAction(
        treeId: string,
        actionType: ActivityActionType,
        details: Record<string, unknown>
    ) {
        const { user } = useAppStore.getState();
        if (!user || !treeId) return;

        try {
            const client = getSupabaseWithAuth(user.uid, user.email || '', user.supabaseToken);
            const { error } = await client.from('activity_logs').insert({
                tree_id: treeId,
                user_id: user.uid,
                user_email: user.email,
                action_type: actionType,
                details
            });

            if (error) {
                console.error('ActivityService: Failed to log action:', error);
            }
        } catch (error) {
            console.error('ActivityService: Unexpected error logging action:', error);
        }
    },

    /**
     * Fetches paginated logs for a specific tree.
     */
    async fetchLogs(treeId: string, page: number = 0, pageSize: number = 50, userEmail?: string): Promise<ActivityLog[]> {
        const { user } = useAppStore.getState();
        if (!user || !treeId) return [];

        try {
            const client = getSupabaseWithAuth(user.uid, user.email || '', user.supabaseToken);
            const from = page * pageSize;
            const to = from + pageSize - 1;

            let query = client
                .from('activity_logs')
                .select('*')
                .eq('tree_id', treeId);

            if (userEmail) {
                query = query.eq('user_email', userEmail);
            }

            const { data, error } = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            return data as ActivityLog[];
        } catch (error) {
            console.error('ActivityService: Failed to fetch logs:', error);
            return [];
        }
    },

    /**
     * Subscribes to real-time activity logs for a specific tree.
     */
    subscribeToLogs(treeId: string, callback: (log: ActivityLog) => void) {
        const { user } = useAppStore.getState();
        if (!user || !treeId) return null;

        const client = getSupabaseWithAuth(user.uid, user.email || '', user.supabaseToken);

        return client
            .channel(`activity_logs:${treeId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'activity_logs',
                    filter: `tree_id=eq.${treeId}`
                },
                (payload) => {
                    callback(payload.new as ActivityLog);
                }
            )
            .subscribe();
    }
};
