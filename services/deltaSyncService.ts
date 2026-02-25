import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase, getSupabaseWithAuth } from './supabaseClient';
import { Person, SyncStatus, UserProfile } from '../types';
import { useAppStore } from '../store/useAppStore';
import { storageService } from './storageService';
import { showError } from '../utils/toast';
import { logError } from '../utils/errorLogger';
import { validatePerson } from '../utils/familyLogic';
import { formatDateForPostgres } from '../utils/dateUtils';
import { applyOperationToMap as applyOpUtil } from '../utils/syncUtils';

export type OperationType = 'ADD_NODE' | 'UPDATE_PROP' | 'DELETE_RELATION' | 'ADD_RELATION' | 'DELETE_NODE';

/** Payload shapes per operation type (minimal for validation). */
export type DeltaPayload = {
    id?: string;
    person?: Person;
    relativeId?: string;
    type?: string;
    updates?: Record<string, unknown>;
    focusId?: string;
    existingId?: string;
    targetId?: string;
};

export interface DeltaOperation {
    id?: string;
    tree_id: string;
    user_id: string;
    type: OperationType;
    payload: DeltaPayload;
    version_seq?: number;
    created_at?: string;
    localId?: number;
    retryCount?: number;
    removeReason?: string;
}

/** Pending op with localId for queue and cleanup. */
interface PendingDeltaOp extends DeltaOperation {
    created_at: string;
    localId?: number;
}

/** Row shape for tree_operations insert (no id, no localId). */
interface TreeOperationRow {
    tree_id: string;
    user_id: string;
    type: OperationType;
    payload: DeltaPayload;
    created_at?: string;
}

// --- INCOMING BATCHING & SEQUENCING ---
let incomingQueue: DeltaOperation[] = [];
let incomingTimeout: NodeJS.Timeout | null = null;
const BATCH_DELAY = 150; // ms
let isFlushing = false;
let flushSafetyTimeout: NodeJS.Timeout | null = null;
const FLUSH_SAFETY_TIMEOUT = 15000; // 15 seconds
const reorderBuffer = new Map<number, DeltaOperation>();
let gapCount = 0;
const MAX_GAP_RETRIES = 3;

/** Throttle for realtime SUBSCRIBED catch-up reconciliation. */
let lastReconcileTime = 0;

// --- OUTGOING BATCHING & LOCKING ---
let outgoingQueue: PendingDeltaOp[] = [];
let outgoingTimeout: NodeJS.Timeout | null = null;
const OUTGOING_BATCH_DELAY = 300; // ms - slightly longer for outgoing to allow multiple state changes (e.g. adding relationship) to group

export const deltaSyncService = {
    _snapshotCounter: 0,
    /**
     * Pushes a single delta operation to Supabase (internal).
     */
    async _pushOperationImmediate(treeId: string, type: OperationType, payload: DeltaPayload): Promise<boolean> {
        const { user, idToken, setSyncStatus } = useAppStore.getState();
        if (!user || !treeId) return false;
        // Verify we have at least one valid token
        if (!user.supabaseToken && !idToken) return false;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(treeId)) {
            console.warn(`DeltaSync: Skip _pushOperationImmediate (${type}) - Invalid Tree ID: ${treeId}`);
            return false;
        }

        try {
            const client = getSupabaseWithAuth(user.uid, user.email, user.supabaseToken || idToken || undefined);
            const row: TreeOperationRow = { tree_id: treeId, user_id: user.uid, type, payload };
            const { error } = await client.from('tree_operations').insert(row);

            if (error) throw error;
            return true;
        } catch (error: unknown) {
            logError('DeltaSync', error, { showToast: false });
            return false;
        }
    },

    /**
     * Pushes a delta operation using the outgoing batching queue.
     */
    async pushOperation(treeId: string, type: OperationType, payload: DeltaPayload): Promise<boolean> {
        const state = useAppStore.getState();
        const { user, idToken, setSyncStatus } = state;
        if (!user || !treeId) {
            console.warn(`DeltaSync: Skip pushOperation (${type}) - Missing requirements`);
            return false;
        }
        if (!user.supabaseToken && !idToken) return false;

        // Validate Tree ID is a UUID (prevents "invalid input syntax for type uuid" error)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(treeId)) {
            console.warn(`DeltaSync: Skip pushOperation (${type}) - Invalid Tree ID (likely local/demo): ${treeId}`);
            return false;
        }

        const currentStatus = state.syncStatus;
        setSyncStatus({ ...currentStatus, state: 'saving', supabaseStatus: 'syncing' });

        // Sequence Versioning and Optimistic UI lock
        state.incrementLocalClientVersion();
        const clientVersion = useAppStore.getState().localClientVersion;

        const targetId = payload.id || payload.person?.id || payload.existingId || payload.targetId;
        if (targetId) {
            state.addSyncingNode(targetId);
        }

        // Save to IndexedDB for offline persistence BEFORE anything else
        const pendingOp = {
            tree_id: treeId,
            user_id: user.uid,
            type,
            payload: { ...payload, client_version: clientVersion },
            client_version: clientVersion,
            created_at: new Date().toISOString()
        };

        const localId = await storageService.savePendingOperation(pendingOp);

        // Add to batch queue (include localId for cleanup)
        outgoingQueue.push({ ...pendingOp, localId });

        // Clear existing timer
        if (outgoingTimeout) clearTimeout(outgoingTimeout);

        // Schedule batch flush
        outgoingTimeout = setTimeout(() => {
            deltaSyncService.flushOutgoingBatch();
        }, OUTGOING_BATCH_DELAY);

        console.log(`[DeltaSync] 📤 Queued outgoing operation ${type} (LocalID: ${localId}, queue size: ${outgoingQueue.length})`);
        return true;
    },

    /**
     * Clears the current outgoing queue and cancels any pending flush.
     * Useful for recovering from stuck sync states.
     */
    async clearOutgoingQueue() {
        if (outgoingTimeout) {
            clearTimeout(outgoingTimeout);
            outgoingTimeout = null;
        }

        console.warn(`[DeltaSync] 🧹 Manually clearing ${outgoingQueue.length} items from outgoing queue.`);

        const localIds = outgoingQueue.map(op => op.localId).filter((id): id is number => id !== undefined && id !== null);
        outgoingQueue = [];
        isFlushing = false;

        if (localIds.length > 0) {
            await storageService.bulkDeletePendingOperations(localIds);
        }

        // Reset sync status
        const { setSyncStatus } = useAppStore.getState();
        setSyncStatus({
            state: 'synced',
            supabaseStatus: 'idle',
            lastSyncSupabase: new Date(),
            driveStatus: 'idle',
            lastSyncDrive: new Date(),
            lastSyncTime: new Date()
        });

        showError('Sync queue cleared manually.');
    },

    /**
     * Flushes the outgoing operation queue in a single bulk insert.
     */
    async flushOutgoingBatch() {
        if (outgoingQueue.length === 0 || isFlushing) return;

        const { user, setSyncStatus } = useAppStore.getState();
        if (!user) return;

        isFlushing = true;

        // Safety release: prevent permanent deadlock if network request hangs
        if (flushSafetyTimeout) clearTimeout(flushSafetyTimeout);
        flushSafetyTimeout = setTimeout(() => {
            if (isFlushing) {
                console.warn('[DeltaSync] ⚠️ Flush safety timeout reached. Forcibly releasing lock.');
                isFlushing = false;
            }
        }, FLUSH_SAFETY_TIMEOUT);

        console.log(`[DeltaSync] 🔥 Flushing batch of ${outgoingQueue.length} outgoing operations`);

        // Capture current batch and clear queue for new entries
        const rawBatch = [...outgoingQueue];
        outgoingQueue = [];
        outgoingTimeout = null;

        // FILTER: Remove operations with invalid Tree IDs OR User IDs
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const batch: DeltaOperation[] = [];
        const invalidOps: PendingDeltaOp[] = [];
        const maxRetries = 5;

        rawBatch.forEach((op: PendingDeltaOp) => {
            const isTreeIdValid = !op.tree_id || uuidRegex.test(op.tree_id);
            const isUserIdValid = !!op.user_id;
            const isPayloadValid = deltaSyncService._validatePayloadIds(op.payload);
            const retryCount = op.retryCount ?? 0;

            if (!isTreeIdValid || !isUserIdValid || !isPayloadValid) {
                invalidOps.push({ ...op, removeReason: 'Invalid UUID' });
            } else if (retryCount > maxRetries) {
                invalidOps.push({ ...op, removeReason: 'Max Retries Exceeded' });
            } else {
                batch.push(op);
            }
        });

        if (invalidOps.length > 0) {
            console.warn(`[DeltaSync] 🗑️ Discarding ${invalidOps.length} invalid/stale operations:`, invalidOps);
            const invalidLocalIds = invalidOps.map((op: PendingDeltaOp) => op.localId).filter((id): id is number => id !== undefined && id !== null);
            if (invalidLocalIds.length > 0) {
                void storageService.bulkDeletePendingOperations(invalidLocalIds);
            }
        }

        if (batch.length === 0) {
            return;
        }

        // Emit sync start event
        window.dispatchEvent(new CustomEvent('supabase-sync-start'));

        try {
            console.log('[DeltaSync] Sending batch sample:', JSON.stringify(batch[0]));

            const { idToken } = useAppStore.getState();
            const client = getSupabaseWithAuth(user.uid, user.email, user.supabaseToken || idToken || undefined);

            // Sanitize payload for RPC: Remove UI-only properties (localId, retryCount, etc.)
            const sanitizedBatch = batch.map(({ localId, retryCount, removeReason, ...rest }) => ({
                ...rest,
                created_at: rest.created_at || new Date().toISOString()
            }));

            const { error: rpcError } = await client.rpc('sync_tree_batch', { p_ops: sanitizedBatch });

            if (rpcError) {
                console.error('[DeltaSync] RPC Error Details:', rpcError.message, rpcError.details, rpcError.hint);
                throw rpcError;
            }

            console.log(`[DeltaSync] ✅ Successfully flushed ${batch.length} operations via Atomic RPC.`);

            // Strict Atomicity: Only increment opCount on successful DB response
            useAppStore.getState().incrementOpCount(batch.length);

            const localIds = batch.map((op) => op.localId).filter((id): id is number => id !== undefined && id !== null);
            if (localIds.length > 0) {
                await storageService.bulkDeletePendingOperations(localIds);
            }

            const status = useAppStore.getState().syncStatus;
            setSyncStatus({
                ...status,
                state: 'synced',
                supabaseStatus: 'idle',
                lastSyncSupabase: new Date()
            });

            // Emit sync success event
            window.dispatchEvent(new CustomEvent('supabase-sync-success'));
        } catch (error: unknown) {
            const err = error as { code?: string; status?: number; message?: string; details?: string };
            const errorMsg = err.message || 'Unknown error';
            const errorDetails = err.details || '';

            console.error('[DeltaSync Bulk push] Full Error Object:', error);
            logError('DeltaSync Bulk push', error, {
                showToast: false
            });

            const retriedBatch: PendingDeltaOp[] = batch.map(op => ({
                ...op,
                retryCount: (op.retryCount ?? 0) + 1,
                created_at: op.created_at || new Date().toISOString()
            }));

            const isPermanentError =
                err.code === '22P02' ||
                err.code === '23505' ||
                err.code === '42P01' ||
                err.status === 400;

            if (isPermanentError) {
                console.error('[DeltaSync] 🛑 PERMANENT ERROR DETECTED. Discarding batch to prevent loop.', error);
                showError(`Sync permanently failed for ${batch.length} items: ${err.message ?? 'Unknown error'}`);

                const batchLocalIds = batch.map((op) => op.localId).filter((id): id is number => id !== undefined && id !== null);
                if (batchLocalIds.length > 0) {
                    void storageService.bulkDeletePendingOperations(batchLocalIds);
                }

                // Rollback Mechanism: Clear UI locks and fetch truth from server
                const state = useAppStore.getState();
                batch.forEach(op => {
                    const pTarget = op.payload?.id || op.payload?.person?.id || op.payload?.existingId || op.payload?.targetId;
                    if (pTarget) state.removeSyncingNode(pTarget);
                });

                if (state.currentTreeId) {
                    console.log('[DeltaSync] 🔄 Rolling back local state due to permanent sync failure...');
                    void deltaSyncService.reconcileTree(state.currentTreeId);
                }
            } else {
                // Temporary error (network, timeout) - Re-queue with incremented retry count
                console.warn('[DeltaSync] 🔄 Temporary error. Re-queuing batch with retry counts.');
                outgoingQueue = [...retriedBatch, ...outgoingQueue];
            }

            const status = useAppStore.getState().syncStatus;
            setSyncStatus({ ...status, state: 'error', supabaseStatus: 'error', errorMessage: err.message ?? 'Unknown error' });

            window.dispatchEvent(new CustomEvent('supabase-sync-error', {
                detail: { message: err.message ?? 'Unknown error' }
            }));
        } finally {
            isFlushing = false;
            if (flushSafetyTimeout) {
                clearTimeout(flushSafetyTimeout);
                flushSafetyTimeout = null;
            }
            // If new items were added during flush, schedule another flush
            if (outgoingQueue.length > 0 && !outgoingTimeout) {
                outgoingTimeout = setTimeout(() => deltaSyncService.flushOutgoingBatch(), OUTGOING_BATCH_DELAY);
            }
        }
    },


    /**
     * Validates that payload IDs are valid UUIDs if present.
     */
    _validatePayloadIds(payload: DeltaPayload | undefined): boolean {
        if (!payload || typeof payload !== 'object') return true;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const p = payload as Record<string, unknown>;

        if (p.id && typeof p.id === 'string' && !uuidRegex.test(p.id)) {
            console.warn(`[DeltaSync] Invalid payload.id detected: ${p.id}`);
            return false;
        }

        if (p.relativeId && typeof p.relativeId === 'string' && !uuidRegex.test(p.relativeId)) {
            console.warn(`[DeltaSync] Invalid payload.relativeId detected: ${p.relativeId}`);
            return false;
        }

        return true;
    },
    /**
    * Fetches operations from Supabase since a specific version.
    */
    async fetchRemoteOperations(treeId: string, sinceVersion: number) {
        const { user, idToken } = useAppStore.getState();
        if (!user || !treeId) return [];

        const client = getSupabaseWithAuth(user.uid, user.email, user.supabaseToken || idToken || undefined);
        const { data, error } = await client
            .from('tree_operations')
            .select('*')
            .eq('tree_id', treeId)
            .gt('version_seq', sinceVersion)
            .order('version_seq', { ascending: true });

        if (error) throw error;
        return data as DeltaOperation[];
    },

    /**
     * Replays an operation into the local state and IndexedDB.
     * This is the public method that uses batching.
     */
    applyOperation(op: DeltaOperation) {
        // Queue for batched processing
        deltaSyncService.queueIncomingOperation(op);
    },

    /**
     * Queues an incoming operation for batched processing.
     */
    queueIncomingOperation(op: DeltaOperation) {
        incomingQueue.push(op);

        // Clear existing timeout
        if (incomingTimeout) clearTimeout(incomingTimeout);

        // Schedule batch processing
        incomingTimeout = setTimeout(() => {
            deltaSyncService.processIncomingBatch();
        }, BATCH_DELAY);

        console.log(`[DeltaSync] 📦 Queued incoming operation ${op.type} (queue size: ${incomingQueue.length})`);
    },

    /**
     * Processes a batch of incoming operations in a single render cycle.
     */
    async processIncomingBatch() {
        if (incomingQueue.length === 0) return;

        const { lastSyncedVersion } = useAppStore.getState();
        const currentVersion = Number(lastSyncedVersion);

        // 1. Add everything to reorder buffer and prune stale versions
        incomingQueue.forEach(op => {
            if (op.version_seq) {
                if (op.version_seq > currentVersion) {
                    reorderBuffer.set(op.version_seq, op);
                } else {
                    console.log(`[DeltaSync] Pruning stale operation from buffer: ${op.version_seq} (Current: ${currentVersion})`);
                }
            }
        });

        // Also prune existing buffer entries that might have become stale
        for (const seq of reorderBuffer.keys()) {
            if (seq <= currentVersion) {
                reorderBuffer.delete(seq);
            }
        }
        incomingQueue = [];
        incomingTimeout = null;

        // 2. Extract sequential operations
        const sequentialBatch: DeltaOperation[] = [];
        let nextVersion = currentVersion + 1;

        if (currentVersion === 0) {
            // BYPASS: Initial load. Accept everything in the buffer and jump to highest version.
            console.log(`[DeltaSync] ⚡ Initial load detected (version 0). Bypassing sequence check.`);
            const allOps = Array.from(reorderBuffer.values()).sort((a, b) => (a.version_seq || 0) - (b.version_seq || 0));
            sequentialBatch.push(...allOps);
            reorderBuffer.clear();
            if (allOps.length > 0) {
                nextVersion = (allOps[allOps.length - 1].version_seq || 0) + 1;
            }
        } else {
            // Normal sequential extraction
            while (reorderBuffer.has(nextVersion)) {
                const op = reorderBuffer.get(nextVersion)!;
                sequentialBatch.push(op);
                reorderBuffer.delete(nextVersion);
                nextVersion++;
            }

            if (sequentialBatch.length === 0) {
                // Gap detected in sequence. Wait for missing version or reconcile if stuck.
                if (reorderBuffer.size > 0) {
                    const missing = nextVersion;
                    const { currentTreeId } = useAppStore.getState();
                    console.warn(`[DeltaSync] 🚨 Gap detected at version ${missing}. Attempting immediate reconciliation...`);

                    // Immediate Reconcile logic
                    if (currentTreeId) {
                        void deltaSyncService.reconcileTree(currentTreeId);
                        window.dispatchEvent(new CustomEvent('sync-gap-resolved', { detail: { treeId: currentTreeId, version: currentVersion } }));
                    }
                }
                return;
            }
        }

        // Reset gap count on successful sequence extraction
        gapCount = 0;

        console.log(`[DeltaSync] 🔥 Applying sequence of ${sequentialBatch.length} operations (${currentVersion + 1} to ${nextVersion - 1})`);

        // 3. Apply all operations batched in a single animation frame
        requestAnimationFrame(async () => {
            const state = useAppStore.getState();
            let people = { ...state.people };
            let maxVersion = currentVersion;

            sequentialBatch.forEach(op => {
                const updated = deltaSyncService.applyOperationToMap(people, op);
                if (updated) {
                    people = updated;
                }
                if (op.version_seq && op.version_seq > maxVersion) {
                    maxVersion = op.version_seq;
                }

                // If this op has a client_version matching ours or if user matches and payload reveals it, remove the optimistic lock
                const pTarget = op.payload?.id || op.payload?.person?.id || op.payload?.existingId || op.payload?.targetId;
                if (pTarget) {
                    state.removeSyncingNode(pTarget);
                }
            });

            // 4. Update the store once for the entire batch
            state.setPeople(people, false); // addToHistory = false
            state.setLastSyncedVersion(maxVersion);

            // 5. Save to IndexedDB (Snapshot mode conditionally)
            deltaSyncService._snapshotCounter += sequentialBatch.length;
            if (deltaSyncService._snapshotCounter >= 50) {
                deltaSyncService._snapshotCounter = 0;
                await storageService.createSnapshot(people);
            } else {
                await storageService.saveFullTree(people);
            }

            console.log(`[DeltaSync] ✅ Sequence application complete. Applied ${sequentialBatch.length} operations.`);
        });
    },

    /**
     * Applies a single operation to a people map and returns the UPDATED map.
     * Does NOT call store actions directly (except via reciprocity if needed, but ideally pure).
     */
    applyOperationToMap(people: Record<string, Person>, op: DeltaOperation): Record<string, Person> | null {
        // Delegate to shared utility to ensure consistency with "Replay on Load" logic.
        return applyOpUtil(people, op);
    },

    /**
     * Subscribes to real-time changes on tree_operations for a specific tree.
     */
    subscribeToTreeOperations(treeId: string, onOp: (op: DeltaOperation) => void) {
        const { user, idToken } = useAppStore.getState();
        if (!user) {
            console.warn('DeltaSync: Cannot subscribe - missing user UID/email');
            return null;
        }

        const client = getSupabaseWithAuth(user.uid, user.email, user.supabaseToken || idToken || undefined);
        const channel = client
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
                    console.log('DeltaSync: Realtime INSERT received', payload);
                    onOp(payload.new as DeltaOperation);
                }
            )
            .subscribe((status, err) => {
                console.log(`Realtime subscription status for tree ${treeId}:`, status);
                if (err) console.error(`Realtime subscription error for tree ${treeId}:`, err);

                // CATCH-UP LOGIC:
                // If we disconnected and reconnected, we might have missed operations.
                // Trigger reconciliation when transitioning back to SUBSCRIBED, but throttle it.
                if (status === 'SUBSCRIBED') {
                    const now = Date.now();
                    if (now - lastReconcileTime > 5000) {
                        console.log(`[DeltaSync] Realtime SUBSCRIBED - triggering catch-up reconciliation for ${treeId}`);
                        lastReconcileTime = now;
                        deltaSyncService.reconcileTree(treeId);
                    } else {
                        console.log(`[DeltaSync] Realtime SUBSCRIBED - skipping redundant reconciliation (throttled)`);
                    }
                }
            });

        return channel;
    },

    /**
     * Subscribes to permission changes (tree_shares) for a specific tree.
     */
    subscribeToPermissions(treeId: string, onUpdate: (share: unknown) => void) {
        const { user, idToken } = useAppStore.getState();
        if (!user) return null;

        const client = getSupabaseWithAuth(user.uid, user.email, user.supabaseToken || idToken || undefined);
        const channel = client
            .channel(`public:tree_shares:tree_id=eq.${treeId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'tree_shares',
                    filter: `tree_id=eq.${treeId}`
                },
                (payload) => {
                    console.log('DeltaSync: Permission change received', payload);
                    onUpdate(payload.new);
                }
            )
            .subscribe();

        return channel;
    },

    /**
     * Performs a full sync on startup or when switching trees.
     */
    async reconcileTree(treeId: string) {
        const { lastSyncedVersion, setSyncStatus: updateSyncStatus } = useAppStore.getState();

        const currentStatus = useAppStore.getState().syncStatus;
        updateSyncStatus({ ...currentStatus, state: 'saving', supabaseStatus: 'syncing' });
        try {
            const ops = await deltaSyncService.fetchRemoteOperations(treeId, lastSyncedVersion || 0);
            for (const op of ops) {
                deltaSyncService.applyOperation(op);
            }

            if (ops.length > 0) {
                const versions = ops.map(o => o.version_seq).filter((v): v is number => typeof v === 'number');
                if (versions.length > 0) {
                    const maxVersion = Math.max(...versions);
                    useAppStore.getState().setLastSyncedVersion(maxVersion);
                }
            }

            const status = useAppStore.getState().syncStatus;
            updateSyncStatus({ ...status, state: 'synced', supabaseStatus: 'idle', lastSyncSupabase: new Date() });

            // Broadcast successful reconciliation
            window.dispatchEvent(new CustomEvent('sync-reconciled', { detail: { treeId } }));
        } catch (error) {
            console.error('Reconciliation failed:', error);
            const status = useAppStore.getState().syncStatus;
            setSyncStatus({ ...status, state: 'error', supabaseStatus: 'error', errorMessage: (error as Error).message });
        }
    },

    // --- DEBOUNCED QUEUE FOR UPDATE_PROP ---
    _updateQueue: new Map<string, { treeId: string, updates: Partial<Person> }>(),
    _updateTimeout: null as NodeJS.Timeout | null,

    /**
     * Debounced version of pushOperation specifically for UPDATE_PROP.
     * Batches updates for the same person node.
     */
    async debouncedPush(treeId: string, personId: string, updates: Partial<Person>): Promise<void> {
        // Optimistic UI lock
        const state = useAppStore.getState();
        state.addSyncingNode(personId);

        // Merge updates for this person
        const existing = this._updateQueue.get(personId);
        if (existing) {
            existing.updates = { ...existing.updates, ...updates };
        } else {
            this._updateQueue.set(personId, { treeId, updates });
        }

        if (this._updateTimeout) clearTimeout(this._updateTimeout);

        this._updateTimeout = setTimeout(async () => {
            const queue = Array.from(this._updateQueue.entries());
            this._updateQueue.clear();
            this._updateTimeout = null;

            if (queue.length > 0) {
                const status = useAppStore.getState().syncStatus;
                setSyncStatus({ ...status, state: 'saving', supabaseStatus: 'syncing' });

                for (const [id, data] of queue) {
                    await this.pushOperation(data.treeId, 'UPDATE_PROP', { id, updates: data.updates });
                }

                const updatedStatus = useAppStore.getState().syncStatus;
                setSyncStatus({
                    ...updatedStatus,
                    state: 'synced',
                    supabaseStatus: 'idle',
                    lastSyncSupabase: new Date(),
                    lastSyncTime: new Date()
                });
            }
        }, 1500); // 1.5s debounce window
    },

    /**
     * Recovers any unsynced operations from IndexedDB on startup.
     */
    async recoverPendingOperations(treeId: string) {
        try {
            const pending = await storageService.getPendingOperations(treeId);
            if (pending.length === 0) return;

            console.log(`[DeltaSync] 🕒 Recovering ${pending.length} unsynced operations from storage...`);

            // Populate the memory queue
            pending.forEach((op: { id?: number; tree_id?: string; user_id?: string; type?: string; payload?: Record<string, unknown>; created_at?: string }) => {
                outgoingQueue.push({
                    tree_id: op.tree_id ?? '',
                    user_id: op.user_id ?? '',
                    type: (op.type ?? 'ADD_NODE') as OperationType,
                    payload: (op.payload as DeltaPayload) ?? {},
                    localId: typeof op.id === 'number' ? op.id : undefined,
                    created_at: op.created_at || new Date().toISOString()
                });
            });

            this.flushOutgoingBatch();
        } catch (e) {
            logError('DeltaSync Recovery', e, { showToast: false });
        }
    }
};

// --- HELPER WRAPPERS ---
const setSyncStatus = (status: SyncStatus) => useAppStore.getState().setSyncStatus(status);
