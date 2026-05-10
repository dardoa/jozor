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
    private lastReconcileTime = 0;

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

            // 1. Operations Subscription
            this.operationChannel = client
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
                    this.options.onOperation(payload.new as DeltaOperation);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    const now = Date.now();
                    if (now - this.lastReconcileTime > 5000) {
                        this.lastReconcileTime = now;
                        this.options.onReconcile();
                    }
                }
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
