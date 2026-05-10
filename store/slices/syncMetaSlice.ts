import { StateCreator } from 'zustand';
import { AppStore } from '../storeTypes';

export interface SyncMetaSlice {
    lastSyncedVersion: number;
    opCount: number;
    localClientVersion: number;
    syncingNodes: Set<string>;
    
    setLastSyncedVersion: (version: number) => void;
    incrementOpCount: (count?: number) => void;
    incrementLocalClientVersion: () => void;
    addSyncingNode: (id: string) => void;
    removeSyncingNode: (id: string) => void;
}

export const createSyncMetaSlice: StateCreator<AppStore, [["zustand/devtools", never]], [], SyncMetaSlice> = (set, get) => ({
    lastSyncedVersion: 0,
    opCount: 0,
    localClientVersion: 0,
    syncingNodes: new Set(),

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
});
