import { getSupabaseWithAuth } from '../supabaseClient';
import { useAppStore } from '../../store/useAppStore';
import { getUserFacingErrorInfo, logError, logInfo } from '../../utils/errorLogger';
import type { DeltaOperation, PendingDeltaOp, SyncFlushResult } from './SyncTypes';
import { offlineCache } from './OfflineCache';
import { sanitizeOutgoingBatch } from './sanitizeBatch';
import { buildSyncError, buildSyncSuccess } from './syncStatusHelpers';
import { applyDeltaOperationToFamily } from '../../domain/FamilyDomainReducer';
import { projectPendingOperations } from '../../domain/pendingOperationsProjection';

export class DeltaRemoteSyncClient {
    constructor(
        private readonly getPendingOutgoingCount: () => number,
        private readonly onPermissionLost: (message: string) => void
    ) {}

    async flushOutgoingBatch(batch: PendingDeltaOp[], permissionPausedTreeId: string | null): Promise<SyncFlushResult> {
        const { user } = useAppStore.getState();
        if (!user) {
            return {
                success: false,
                shouldRetry: false,
                error: 'No authenticated user is available for sync.',
            };
        }
        if (permissionPausedTreeId && batch[0]?.tree_id === permissionPausedTreeId) {
            this.onPermissionLost('You no longer have permission to update this tree.');
            return {
                success: false,
                shouldRetry: false,
                error: 'Permission lost for this tree.',
            };
        }

        window.dispatchEvent(new CustomEvent('supabase-sync-start'));

        try {
            const client = getSupabaseWithAuth(user.uid, user.email, user.supabaseToken || undefined);
            const sanitizedBatch = sanitizeOutgoingBatch(batch);

            logInfo('DeltaSyncService sync_tree_batch', 'Flushing outgoing sync batch to Supabase via sync_tree_batch RPC.', {
                treeId: sanitizedBatch[0]?.tree_id,
                userId: user.uid,
                batchSize: sanitizedBatch.length,
            });

            const { error: rpcError } = await client.rpc(
                'sync_tree_batch',
                { p_ops: sanitizedBatch }
            );

            if (rpcError) throw rpcError;

            const store = useAppStore.getState();
            let nextConfirmed = store.confirmedPeople;
            batch.forEach((op) => {
                const updated = applyDeltaOperationToFamily(nextConfirmed, op);
                if (updated) {
                    nextConfirmed = updated;
                }
            });

            const localIds = batch.map((op) => op.localId).filter((id): id is number => !!id);
            const idsSet = new Set(localIds);
            const nextPending = store.pendingOperations.filter(
                (op) => op.localId === undefined || !idsSet.has(op.localId)
            );

            const { people: projected } = projectPendingOperations(nextConfirmed, nextPending);

            store.setConfirmedPeople(nextConfirmed);
            store.removePendingOperations(localIds);
            store.setPeople(projected, false);

            store.incrementOpCount(batch.length);
            await offlineCache.bulkDeletePendingOperations(localIds);

            const successTime = new Date();
            useAppStore.getState().setSyncStatus(
                buildSyncSuccess(useAppStore.getState().syncStatus, this.getPendingOutgoingCount(), {
                    lastSyncSupabase: successTime,
                })
            );

            window.dispatchEvent(new CustomEvent('supabase-sync-success', {
                detail: {
                    time: successTime,
                    pendingCount: this.getPendingOutgoingCount(),
                },
            }));

            return { success: true, shouldRetry: false };
        } catch (error) {
            const userFacing = getUserFacingErrorInfo(error, 'Sync failed. Please try again.');
            const pendingCount = this.getPendingOutgoingCount() + batch.length;
            const errorTime = new Date();

            const syncStatusPatch = {
                ...buildSyncError(useAppStore.getState().syncStatus, pendingCount, {
                    message: userFacing.message,
                    category: userFacing.category,
                    retryable: userFacing.retryable,
                    time: errorTime,
                }),
                ...(userFacing.category === 'BILLING' ? { syncBlockedByPlan: true } : {}),
            };
            useAppStore.getState().setSyncStatus(syncStatusPatch);

            logError('DeltaSyncService sync_tree_batch', error, {
                category: 'SYNC',
                severity: 'HIGH',
                showToast: true,
                toastMessage: userFacing.message,
                metadata: {
                    treeId: batch[0]?.tree_id,
                    userId: user.uid,
                    operationType: 'sync_tree_batch',
                    batchSize: batch.length,
                },
            });

            window.dispatchEvent(new CustomEvent('supabase-sync-error', {
                detail: {
                    rawMessage: error instanceof Error ? error.message : String(error),
                    message: userFacing.message,
                    category: userFacing.category,
                    retryable: userFacing.retryable,
                    time: errorTime,
                    pendingCount,
                },
            }));

            return {
                success: false,
                shouldRetry: userFacing.retryable,
                error: userFacing.message,
            };
        }
    }

    async fetchRemoteOperations(treeId: string, sinceVersion: number): Promise<DeltaOperation[]> {
        const { user } = useAppStore.getState();
        if (!user) return [];

        const client = getSupabaseWithAuth(user.uid, user.email, user.supabaseToken || undefined);
        const { data, error } = await client
            .from('tree_operations')
            .select('*')
            .eq('tree_id', treeId)
            .gt('version_seq', sinceVersion)
            .order('version_seq', { ascending: true });

        if (error) throw error;
        return data as DeltaOperation[];
    }
}
