import { isUuid } from '../utils/isUuid';
import type { Person } from '../types/person';
import { useAppStore } from '../store/useAppStore';
import { logError, logWarn } from '../utils/errorLogger';
import { showToast } from '../utils/showToast';
import {
    DeltaOperation,
    PendingDeltaOp,
    OperationType,
    DeltaPayload,
} from './sync/SyncTypes';
import { SyncQueue } from './sync/SyncQueue';
import { offlineCache } from './sync/OfflineCache';
import { ConflictResolver } from './sync/ConflictResolver';
import { RealtimeSubscriber } from './sync/RealtimeSubscriber';
import { buildSyncSuccess, buildSyncError, buildSyncSaving } from './sync/syncStatusHelpers';
import { DeltaDebouncedUpdateQueue } from './sync/DeltaDebouncedUpdateQueue';
import { DeltaOperationApplier } from './sync/DeltaOperationApplier';
import { DeltaRemoteSyncClient } from './sync/DeltaRemoteSyncClient';
import { clientInstanceId } from './sync/syncInstance';

/**
 * DeltaSyncService (Modular Refactor)
 * Orchestrates synchronization using specialized modules.
 */
class DeltaSyncService {
    private queue: SyncQueue;
    private resolver: ConflictResolver;
    private subscriber: RealtimeSubscriber;
    private updateQueue: DeltaDebouncedUpdateQueue;
    private operationApplier: DeltaOperationApplier;
    private remoteSyncClient: DeltaRemoteSyncClient;
    private reconcileInFlight = false;
    private permissionListeners = new Set<(share: unknown) => void>();
    private permissionPausedTreeId: string | null = null;
    private readonly flushBeforeUnload = () => {
        void this.flushPendingChanges();
    };

    constructor() {
        this.queue = new SyncQueue({
            outgoingBatchDelay: 300,
            incomingBatchDelay: 150,
            onFlushOutgoing: (batch) => this.flushOutgoingBatch(batch),
            onFlushIncoming: (batch) => this.processIncomingBatch(batch),
        });

        this.resolver = new ConflictResolver({
            onGapDetected: (missing) => {
                const { currentTreeId } = useAppStore.getState();
                logWarn('DeltaSyncService gapDetected', 'Gap detected in incoming operation stream. Reconciling tree.', {
                    category: 'SYNC',
                    metadata: { missingVersion: missing, treeId: currentTreeId }
                });
                if (currentTreeId) this.reconcileTree(currentTreeId);
            },
            onBufferOverflow: () => {
                const { currentTreeId } = useAppStore.getState();
                logWarn('DeltaSyncService bufferOverflow', 'Incoming operation buffer overflowed. Reconciling tree.', {
                    category: 'SYNC',
                    metadata: { treeId: currentTreeId }
                });
                if (currentTreeId) this.reconcileTree(currentTreeId);
            }
        });

        this.updateQueue = new DeltaDebouncedUpdateQueue(
            (treeId, type, payload) => this.pushOperation(treeId, type, payload),
            (personId) => useAppStore.getState().addSyncingNode(personId)
        );
        this.operationApplier = new DeltaOperationApplier(this.resolver);
        this.remoteSyncClient = new DeltaRemoteSyncClient(
            () => this.queue.getPendingOutgoingCount(),
            (message) => this.setPermissionLostStatus(message)
        );

        this.subscriber = new RealtimeSubscriber({
            onOperation: (op) => this.queue.enqueueIncoming(op),
            onPermissionUpdate: (share) => {
                this.permissionListeners.forEach((listener) => listener(share));
            },
            onReconcile: () => {
                const { currentTreeId } = useAppStore.getState();
                if (currentTreeId) this.reconcileTree(currentTreeId);
            }
        });

        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', this.flushBeforeUnload);
        }
    }

    // --- PUBLIC API ---

    private validatePayload(type: OperationType, payload: DeltaPayload): boolean {
        const targetId = this.getPayloadTargetId(payload);
        if (!targetId && type !== 'ADD_NODE' && type !== 'SET_TREE_METADATA') {
            logError('Sync Validation', `Missing target ID for operation: ${type}`, { category: 'VALIDATION', severity: 'MEDIUM' });
            return false;
        }
        return true;
    }

    private getPayloadTargetId(payload: DeltaPayload): string | undefined {
        return payload.id ||
            payload.person?.id ||
            payload.existingId ||
            payload.targetId ||
            payload.treeMetadata?.focusId ||
            payload.treeMetadata?.rootId;
    }

    public async pushOperation(treeId: string, type: OperationType, payload: DeltaPayload): Promise<boolean> {
        const state = useAppStore.getState();
        const { user, setSyncStatus, currentUserRole } = state;

        if (!user || !treeId) return false;
        if (
            this.permissionPausedTreeId === treeId ||
            currentUserRole === null ||
            currentUserRole === 'viewer'
        ) {
            this.setPermissionLostStatus('You no longer have permission to update this tree.');
            return false;
        }

        // Use centralized UUID validator (5 groups: 8-4-4-4-12)
        if (!isUuid(treeId)) return false;

        if (!this.validatePayload(type, payload)) return false;

        setSyncStatus(buildSyncSaving(state.syncStatus, this.queue.getPendingOutgoingCount() + 1));
        state.incrementLocalClientVersion();

        const clientVersion = useAppStore.getState().localClientVersion;
        const targetId =
            payload.id ||
            payload.person?.id ||
            payload.existingId ||
            payload.targetId ||
            payload.treeMetadata?.focusId ||
            payload.treeMetadata?.rootId;
        if (targetId) state.addSyncingNode(targetId);

        const pendingOp: PendingDeltaOp = {
            tree_id: treeId,
            user_id: user.uid,
            type,
            payload: { ...payload, client_version: clientVersion, client_id: clientInstanceId },
            created_at: new Date().toISOString()
        };

        let localId: number;
        try {
            localId = await offlineCache.savePendingOperation(pendingOp);
        } catch (error) {
            logError('DeltaSyncService savePendingOperation', error, {
                category: 'SYNC',
                severity: 'HIGH',
                showToast: true,
                toastMessage: 'Could not queue this change for sync. Please try again.',
                metadata: { treeId, operationType: type },
            });
            setSyncStatus(buildSyncError(state.syncStatus, this.queue.getPendingOutgoingCount(), {
                message: 'Could not queue this change for sync. Please try again.',
                category: 'SYNC',
                retryable: true,
                time: new Date(),
            }));
            return false;
        }

        this.queue.enqueueOutgoing({ ...pendingOp, localId });

        return true;
    }

    public async pushOperations(
        treeId: string,
        operations: Array<{ type: OperationType; payload: DeltaPayload }>
    ): Promise<boolean> {
        if (operations.length === 0) return true;

        const state = useAppStore.getState();
        const { user, setSyncStatus, currentUserRole } = state;

        if (!user || !treeId) return false;
        if (
            this.permissionPausedTreeId === treeId ||
            currentUserRole === null ||
            currentUserRole === 'viewer'
        ) {
            this.setPermissionLostStatus('You no longer have permission to update this tree.');
            return false;
        }

        if (!isUuid(treeId)) return false;
        if (!operations.every(({ type, payload }) => this.validatePayload(type, payload))) return false;

        setSyncStatus(buildSyncSaving(state.syncStatus, this.queue.getPendingOutgoingCount() + operations.length));

        const queuedOps: PendingDeltaOp[] = [];
        const localIds: number[] = [];

        try {
            for (const operation of operations) {
                state.incrementLocalClientVersion();
                const clientVersion = useAppStore.getState().localClientVersion;
                const pendingOp: PendingDeltaOp = {
                    tree_id: treeId,
                    user_id: user.uid,
                    type: operation.type,
                    payload: {
                        ...operation.payload,
                        client_version: clientVersion,
                        client_id: clientInstanceId,
                    },
                    created_at: new Date().toISOString(),
                };

                const localId = await offlineCache.savePendingOperation(pendingOp);
                localIds.push(localId);
                queuedOps.push({ ...pendingOp, localId });
            }
        } catch (error) {
            if (localIds.length > 0) {
                await offlineCache.bulkDeletePendingOperations(localIds).catch((rollbackError) => {
                    logWarn('DeltaSyncService rollbackPendingOperations', 'Failed to rollback partially queued operations.', {
                        category: 'SYNC',
                        metadata: {
                            treeId,
                            operationTypes: operations.map((op) => op.type),
                            rollbackError: rollbackError instanceof Error ? rollbackError.message : String(rollbackError),
                        },
                    });
                });
            }

            logError('DeltaSyncService savePendingOperations', error, {
                category: 'SYNC',
                severity: 'HIGH',
                showToast: true,
                toastMessage: 'Could not queue this change for sync. Please try again.',
                metadata: { treeId, operationTypes: operations.map((op) => op.type) },
            });
            setSyncStatus(buildSyncError(state.syncStatus, this.queue.getPendingOutgoingCount(), {
                message: 'Could not queue this change for sync. Please try again.',
                category: 'SYNC',
                retryable: true,
                time: new Date(),
            }));
            return false;
        }

        queuedOps.forEach((op) => {
            const targetId = this.getPayloadTargetId(op.payload);
            if (targetId) state.addSyncingNode(targetId);
            this.queue.enqueueOutgoing(op);
        });

        return true;
    }

    public async debouncedPush(treeId: string, personId: string, updates: Partial<Person>): Promise<boolean> {
        await this.updateQueue.enqueue(treeId, personId, updates);
        return true;
    }

    private async flushQueuedUpdates(): Promise<void> {
        await this.updateQueue.flush();
    }

    public async flushPendingChanges(): Promise<void> {
        await this.flushQueuedUpdates();
        await this.queue.flushOutgoingNow();
    }

    public applyOperation(op: DeltaOperation) {
        this.queue.enqueueIncoming(op);
    }

    public subscribeToTreeOperations(treeId: string, _onOp: unknown) {
        this.subscriber.subscribe(treeId);
        return { unsubscribe: () => this.subscriber.unsubscribe() };
    }

    public subscribeToPermissions(_treeId: string, onUpdate: (share: unknown) => void) {
        this.permissionListeners.add(onUpdate);
        return {
            unsubscribe: () => {
                this.permissionListeners.delete(onUpdate);
            }
        };
    }

    public async reconcileTree(treeId: string) {
        if (this.reconcileInFlight) return;
        this.reconcileInFlight = true;

        const { lastSyncedVersion, setSyncStatus: updateSyncStatus, syncStatus } = useAppStore.getState();
        updateSyncStatus(buildSyncSaving(syncStatus, this.queue.getPendingOutgoingCount()));

        try {
            const ops = await this.fetchRemoteOperations(treeId, lastSyncedVersion || 0);
            if (ops.length > 0) {
                await this.processIncomingBatch(ops);
            }

            updateSyncStatus(buildSyncSuccess(useAppStore.getState().syncStatus, this.queue.getPendingOutgoingCount(), { lastSyncSupabase: new Date() }));
        } catch (error) {
            logError('Sync Reconciliation', error, { category: 'SYNC', severity: 'HIGH' });
        } finally {
            this.reconcileInFlight = false;
        }
    }

    public async recoverPendingOperations(treeId: string) {
        try {
            const pending = await offlineCache.getPendingOperations(treeId);
            pending.forEach(op => this.queue.enqueueOutgoing(op));
        } catch (error) {
            logError('Sync Recovery', error, { category: 'SYNC', severity: 'LOW' });
        }
    }

    public async clearOutgoingQueue() {
        this.queue.clearOutgoing();
        const { setSyncStatus, syncStatus } = useAppStore.getState();
        setSyncStatus(buildSyncSuccess(syncStatus, 0));
        showToast.error('Sync queue cleared manually.');
    }

    public handlePermissionRevoked(treeId: string) {
        this.permissionPausedTreeId = treeId;
        this.queue.clearOutgoing();
        this.setPermissionLostStatus('Your access to this tree was removed. Editing has been disabled.');
    }

    public handlePermissionReadOnly(treeId: string) {
        this.permissionPausedTreeId = treeId;
        this.queue.clearOutgoing();
        this.setPermissionLostStatus('Your access is now view-only. Editing has been disabled.');
    }

    public handlePermissionGranted(treeId: string) {
        if (this.permissionPausedTreeId !== treeId) return;
        this.permissionPausedTreeId = null;
        const { setSyncStatus, syncStatus } = useAppStore.getState();
        setSyncStatus(buildSyncSuccess(syncStatus, this.queue.getPendingOutgoingCount()));
    }

    // --- INTERNAL HANDLERS ---

    private setPermissionLostStatus(message: string) {
        const timestamp = new Date();
        const { setSyncStatus, syncStatus } = useAppStore.getState();
        setSyncStatus(buildSyncError(syncStatus, 0, { message, category: 'PERMISSION', retryable: false, time: timestamp }));
        window.dispatchEvent(new CustomEvent('supabase-sync-error', {
            detail: {
                rawMessage: message,
                message,
                category: 'PERMISSION',
                retryable: false,
                time: timestamp,
                pendingCount: 0,
            }
        }));
    }

    private async flushOutgoingBatch(batch: PendingDeltaOp[]) {
        return this.remoteSyncClient.flushOutgoingBatch(batch, this.permissionPausedTreeId);
    }

    private async processIncomingBatch(batch: DeltaOperation[]) {
        return this.operationApplier.processIncomingBatch(batch);
    }

    private async fetchRemoteOperations(treeId: string, sinceVersion: number): Promise<DeltaOperation[]> {
        return this.remoteSyncClient.fetchRemoteOperations(treeId, sinceVersion);
    }
}

export const deltaSyncService = new DeltaSyncService();
