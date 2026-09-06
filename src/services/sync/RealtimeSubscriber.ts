import { useAppStore } from '../../store/useAppStore';
import { getSupabaseFull } from '../supabaseClient';
import type { DeltaOperation } from './SyncTypes';
import type { RealtimeChannel } from '@supabase/supabase-js';

type PermissionPayload = {
    eventType?: 'INSERT' | 'UPDATE' | 'DELETE';
    role?: string;
    email?: string;
    collaborator_uid?: string;
    tree_id?: string;
    [key: string]: unknown;
};

export class RealtimeSubscriber {
    private operationChannel: RealtimeChannel | null = null;
    private permissionChannel: RealtimeChannel | null = null;
    private changeSignalChannel: RealtimeChannel | null = null;

    constructor(
        private options: {
            onOperation: (op: DeltaOperation) => void;
            onPermissionUpdate: (payload: PermissionPayload) => void;
            onReconcile: () => void;
        }
    ) {}

    public subscribe(treeId: string) {
        this.unsubscribe();

        const { user, supabaseAccessToken } = useAppStore.getState();
        if (!user) return;

        if (user) {
            const client = getSupabaseFull(user.uid, user.email, user.supabaseToken || supabaseAccessToken || undefined);
            const isCurrent = () => {
                const state = useAppStore.getState();
                return state.user?.uid === user.uid && state.currentTreeId === treeId;
            };
            const reconcileOnSubscribed = (status: string) => {
                if (status === 'SUBSCRIBED' && isCurrent()) {
                    this.options.onReconcile();
                }
            };

            // 1. Operations Subscription
            this.operationChannel = useAppStore.getState().currentUserRole === 'viewer' ? null : client
            .channel(`public:tree_operations:tree_id=eq.${treeId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'tree_operations',
                    filter: `tree_id=eq.${treeId}`
                },
                (payload) => {
                    if (!isCurrent() || useAppStore.getState().currentUserRole === 'viewer') return;
                    this.options.onOperation(payload.new as DeltaOperation);
                }
            )
            .subscribe(reconcileOnSubscribed);

            // Viewers never need operation payloads. A two-field server signal
            // invalidates the role-filtered people_secure snapshot instead.
            this.changeSignalChannel = client.channel(`tree-change-signals:${treeId}`)
                .on('postgres_changes', {
                    event: '*', schema: 'public', table: 'tree_change_signals', filter: `tree_id=eq.${treeId}`,
                }, () => {
                    if (isCurrent() && useAppStore.getState().currentUserRole === 'viewer') this.options.onReconcile();
                })
                .subscribe(status => {
                    if (useAppStore.getState().currentUserRole === 'viewer') reconcileOnSubscribed(status);
                });

            // 2. Permissions Subscription
            this.permissionChannel = client
            .channel(`public:tree_collaborators:tree_id=eq.${treeId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tree_collaborators',
                    filter: `tree_id=eq.${treeId}`
                },
                (payload) => {
                    if (!isCurrent()) return;
                    const row = payload.eventType === 'DELETE' ? payload.old : payload.new;
                    this.options.onPermissionUpdate({
                        eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
                        ...(row ?? {}),
                    } as PermissionPayload);
                }
            )
            .subscribe();
        }
    }

    public unsubscribe() {
        if (this.changeSignalChannel) {
            this.changeSignalChannel.unsubscribe();
            this.changeSignalChannel = null;
        }
        if (this.operationChannel) {
            this.operationChannel.unsubscribe();
            this.operationChannel = null;
        }
        if (this.permissionChannel) {
            this.permissionChannel.unsubscribe();
            this.permissionChannel = null;
        }
    }
}
