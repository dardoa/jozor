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
import { projectPendingOperations } from '../domain/pendingOperationsProjection';
import { fetchTree } from './supabaseTreeReadService';

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
    private reconcileRequestedTreeId: string | null = null;
    private permissionListeners = new Set<(share: unknown) => void>();
    private permissionPausedTreeId: string | null = null;
    private lastCheckpointVersion = 0;
    private activeTreeId: string | null = null;
    private readonly flushBeforeUnload = () => {
        void this.flushPendingChanges();
    };

    constructor() {
        this.queue = new SyncQueue({
            outgoingBatchDelay: 300,
            incomingBatchDelay: 150,
            onFlushOutgoing: (batch) => this.flushOutgoingBatch(batch),
            onFlushIncoming: (batch) => this.processIncomingBatch(batch),
            onRetryBatchUpdated: (batch) => offlineCache.updatePendingOperationRetryCounts(batch),
            onRetryStateChange: (retryState) => {
                const store = useAppStore.getState();
                store.setSyncStatus({
                    ...store.syncStatus,
                    pendingCount: this.queue.getPendingOutgoingCount(),
                    retryAttempt: retryState.attempt,
                    retryPaused: retryState.paused,
                    nextRetryAt: retryState.nextRetryAt,
                    ...(retryState.error ? { errorMessage: retryState.error } : {}),
                });
            },
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

        const opWithLocalId = { ...pendingOp, localId };
        state.addPendingOperation(opWithLocalId);

        const { people: projected } = projectPendingOperations(
            state.confirmedPeople,
            state.pendingOperations
        );
        state.setPeople(projected, false);

        this.queue.enqueueOutgoing(opWithLocalId);

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
            const pendingOpsToSave: PendingDeltaOp[] = [];
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
                pendingOpsToSave.push(pendingOp);
            }

            const ids = await offlineCache.savePendingOperations(pendingOpsToSave);
            for (let i = 0; i < pendingOpsToSave.length; i++) {
                const localId = ids[i];
                localIds.push(localId);
                queuedOps.push({ ...pendingOpsToSave[i], localId });
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
            state.addPendingOperation(op);
            const targetId = this.getPayloadTargetId(op.payload);
            if (targetId) state.addSyncingNode(targetId);
            this.queue.enqueueOutgoing(op);
        });

        const { people: projected } = projectPendingOperations(
            state.confirmedPeople,
            state.pendingOperations
        );
        state.setPeople(projected, false);

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

    public async retryPendingChanges(): Promise<void> {
        await this.flushQueuedUpdates();
        await this.queue.retryOutgoingNow();
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

    public getLastCheckpointVersion(): number {
        return this.lastCheckpointVersion;
    }

    private checkActiveTree(treeId: string) {
        if (this.activeTreeId !== treeId) {
            this.activeTreeId = treeId;
            this.lastCheckpointVersion = useAppStore.getState().lastSyncedVersion || 0;
        }
    }



    private async reloadFullTreeFromServer(treeId: string): Promise<boolean> {
        try {
            const store = useAppStore.getState();
            const user = store.user;
            if (!user) return false;

            const full = await fetchTree(treeId, user.uid, user.email || '', user.supabaseToken || undefined);
            const current = useAppStore.getState();
            if (current.user?.uid !== user.uid || current.currentTreeId !== treeId
                || current.currentUserRole !== store.currentUserRole) return false;
            current.setConfirmedPeople(full.people);
            current.setLastSyncedVersion(full.lastVersion);

            const { people: projected } = projectPendingOperations(full.people,
                current.currentUserRole === 'viewer' ? [] : current.pendingOperations);
            current.setPeople(projected, false);

            this.lastCheckpointVersion = full.lastVersion;
            logWarn('DeltaSyncService reloadFullTreeFromServer', 'Successfully reloaded tree from server checkpoint.', {
                category: 'SYNC',
                metadata: { treeId, lastVersion: full.lastVersion }
            });
            return true;
        } catch (error) {
            logError('DeltaSyncService reloadFullTreeFromServer', error, {
                category: 'SYNC',
                severity: 'HIGH',
                metadata: { treeId }
            });
            throw error;
        }
    }

    public async reconcileTree(treeId: string) {
        if (this.reconcileInFlight) {
            this.reconcileRequestedTreeId = treeId;
            return;
        }
        this.reconcileInFlight = true;

        this.checkActiveTree(treeId);

        const initialState = useAppStore.getState();
        const { lastSyncedVersion, setSyncStatus: updateSyncStatus, syncStatus } = initialState;
        updateSyncStatus(buildSyncSaving(syncStatus, this.queue.getPendingOutgoingCount()));

        try {
            if (useAppStore.getState().currentUserRole === 'viewer') {
                if (await this.reloadFullTreeFromServer(treeId)) {
                    updateSyncStatus(buildSyncSuccess(useAppStore.getState().syncStatus, 0, { lastSyncSupabase: new Date() }));
                }
                return;
            }
            const started = useAppStore.getState();
            const ops = await this.fetchRemoteOperations(treeId, lastSyncedVersion || 0);
            const current = useAppStore.getState();
            if (current.user?.uid !== started.user?.uid || current.currentTreeId !== treeId
                || current.currentUserRole !== started.currentUserRole) return;
            if (ops.length > 0) {
                if (lastSyncedVersion > 0 && ops[0].version_seq && Number(ops[0].version_seq) > lastSyncedVersion + 1) {
                    logWarn('DeltaSyncService reconcileTree', 'Operations gap detected (old operations pruned). Triggering full tree reload.', {
                        category: 'SYNC',
                        metadata: { lastSyncedVersion, dbFirstVersion: ops[0].version_seq, treeId }
                    });
                    if (await this.reloadFullTreeFromServer(treeId)) {
                        updateSyncStatus(buildSyncSuccess(useAppStore.getState().syncStatus,
                            this.queue.getPendingOutgoingCount(), { lastSyncSupabase: new Date() }));
                    }
                    return;
                }
                await this.processIncomingBatch(ops);
            }

            updateSyncStatus(buildSyncSuccess(useAppStore.getState().syncStatus, this.queue.getPendingOutgoingCount(), { lastSyncSupabase: new Date() }));
        } catch (error) {
            logError('Sync Reconciliation', error, { category: 'SYNC', severity: 'HIGH' });
            const current = useAppStore.getState();
            if (current.currentTreeId === treeId && current.user?.uid === initialState.user?.uid
                && current.currentUserRole === initialState.currentUserRole) {
                updateSyncStatus(buildSyncError(useAppStore.getState().syncStatus, this.queue.getPendingOutgoingCount(), {
                    message: 'Sync failed. Please try again.', retryable: true,
                }));
            }
        } finally {
            this.reconcileInFlight = false;
            const requestedTreeId = this.reconcileRequestedTreeId;
            this.reconcileRequestedTreeId = null;
            if (requestedTreeId && useAppStore.getState().currentTreeId === requestedTreeId) {
                void this.reconcileTree(requestedTreeId);
            }
        }
    }

    public async recoverPendingOperations(treeId: string) {
        try {
            const pending = await offlineCache.getPendingOperations(treeId);
            const store = useAppStore.getState();
            store.setPendingOperations(pending);

            const { people: projected } = projectPendingOperations(
                store.confirmedPeople,
                pending
            );
            store.setPeople(projected, false);

            pending.forEach(op => this.queue.enqueueOutgoing(op));
            if (pending.length > 0) {
                // Enqueue may restore a paused retry state from IndexedDB.
                store.setSyncStatus(buildSyncSaving(useAppStore.getState().syncStatus, this.queue.getPendingOutgoingCount()));
            }
        } catch (error) {
            logError('Sync Recovery', error, { category: 'SYNC', severity: 'LOW' });
        }
    }

    public async clearOutgoingQueue() {
        this.queue.clearOutgoing();
        const store = useAppStore.getState();
        store.setPendingOperations([]);
        store.setPeople(store.confirmedPeople, false);
        store.setSyncStatus(buildSyncSuccess(store.syncStatus, 0));
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
