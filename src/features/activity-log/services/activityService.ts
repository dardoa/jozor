import { getSupabaseFull, getSupabaseWithAuth } from '../../../services/supabaseClient';
import { useAppStore } from '../../../store/useAppStore';
import { logError, logInfo } from '../../../utils/errorLogger';

export type ActivityActionType =
    | 'ADD_PERSON'
    | 'UPDATE_PERSON'
    | 'DELETE_PERSON'
    | 'ADD_RELATION'
    | 'DELETE_RELATION'
    | 'RENAME_TREE'
    | 'SHARE_INVITE'
    | 'SHARE_INVITE_ACCEPT'
    | 'SHARE_INVITE_DECLINE'
    | 'SHARE_REVOKE'
    | 'SHARE_ROLE_CHANGE'
    | 'TREE_DISCUSSION_MESSAGE'
    | 'TREE_SETTINGS_UPDATE';

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
                logError('ActivityService logAction', error, {
                    category: 'DATABASE',
                    severity: 'LOW',
                    metadata: { treeId, actionType }
                });
                return;
            }

            logInfo('ActivityService logAction', 'Logged activity action.', {
                treeId,
                actionType
            });
        } catch (error) {
            logError('ActivityService logAction', error, {
                category: 'UNEXPECTED',
                severity: 'LOW',
                metadata: { treeId, actionType }
            });
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
            logError('ActivityService fetchLogs', error, {
                category: 'DATABASE',
                severity: 'LOW',
                metadata: { treeId, page, pageSize, userEmail }
            });
            return [];
        }
    },

    /**
     * Subscribes to real-time activity logs for a specific tree.
     */
    subscribeToLogs(treeId: string, callback: (log: ActivityLog) => void) {
        const { user } = useAppStore.getState();
        if (!user || !treeId) return null;

        let channel: { unsubscribe: () => void } | null = null;
        let closed = false;

        const client = getSupabaseFull(user.uid, user.email || '', user.supabaseToken);
        if (!closed) {

            channel = client
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

        return {
            unsubscribe: () => {
                closed = true;
                channel?.unsubscribe();
            },
        };
    }
};
