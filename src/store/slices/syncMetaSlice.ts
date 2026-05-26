import { StateCreator } from 'zustand';
import { AppStore } from '../storeTypes';
import type { PendingDeltaOp } from '../../services/sync/SyncTypes';

export interface SyncMetaSlice {
    lastSyncedVersion: number;
    opCount: number;
    localClientVersion: number;
    syncingNodes: Set<string>;
    pendingOperations: PendingDeltaOp[];
    
    setLastSyncedVersion: (version: number) => void;
    incrementOpCount: (count?: number) => void;
    incrementLocalClientVersion: () => void;
    addSyncingNode: (id: string) => void;
    removeSyncingNode: (id: string) => void;
    setPendingOperations: (ops: PendingDeltaOp[]) => void;
    addPendingOperation: (op: PendingDeltaOp) => void;
    removePendingOperations: (localIds: number[]) => void;
}

export const createSyncMetaSlice: StateCreator<AppStore, [["zustand/devtools", never]], [], SyncMetaSlice> = (set, get) => ({
    lastSyncedVersion: 0,
    opCount: 0,
    localClientVersion: 0,
    syncingNodes: new Set(),
    pendingOperations: [],

    setLastSyncedVersion: (version) => set({ lastSyncedVersion: version }),
    
    incrementOpCount: (count = 1) => {
        const newCount = get().opCount + count;
        set({ opCount: newCount });
    },

    incrementLocalClientVersion: () => set((state) => ({ localClientVersion: state.localClientVersion + 1 })),
    
    addSyncingNode: (id) => set((state) => {
        const next = new Set(state.syncingNodes);
        next.add(id);
        return { syncingNodes: next };
    }),
    
    removeSyncingNode: (id) => set((state) => {
        const next = new Set(state.syncingNodes);
        next.delete(id);
        return { syncingNodes: next };
    }),

    setPendingOperations: (ops) => set({ pendingOperations: ops }),

    addPendingOperation: (op) => set((state) => ({
        pendingOperations: [...state.pendingOperations, op]
    })),

    removePendingOperations: (localIds) => set((state) => {
        const idsSet = new Set(localIds);
        return {
            pendingOperations: state.pendingOperations.filter(
                (op) => op.localId === undefined || !idsSet.has(op.localId)
            )
        };
    }),
});
