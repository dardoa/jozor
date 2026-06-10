import { beforeEach, describe, expect, it, vi } from 'vitest';
import { deltaSyncService } from '../deltaSyncService';
import { offlineCache } from '../sync/OfflineCache';

vi.mock('../sync/OfflineCache', () => ({
    offlineCache: {
        savePendingOperation: vi.fn(),
        savePendingOperations: vi.fn(),
        bulkDeletePendingOperations: vi.fn(),
    }
}));

const storeState = {
    user: { uid: 'user-123' },
    currentUserRole: 'editor',
    incrementLocalClientVersion: vi.fn(),
    localClientVersion: 1,
    addPendingOperation: vi.fn(),
    addSyncingNode: vi.fn(),
    setPeople: vi.fn(),
    confirmedPeople: [],
    pendingOperations: [],
    setSyncStatus: vi.fn(),
    syncStatus: {},
};

vi.mock('../../store/useAppStore', () => ({
    useAppStore: {
        getState: vi.fn(() => storeState),
    }
}));

describe('DeltaSyncService pushOperations', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        storeState.localClientVersion = 1;
        storeState.pendingOperations = [];
    });

    it('saves operations in bulk using savePendingOperations and maintains index alignment', async () => {
        vi.mocked(offlineCache.savePendingOperations).mockResolvedValueOnce([101, 102]);

        const ops = [
            { type: 'ADD_NODE' as const, payload: { id: 'person-1' } },
            { type: 'UPDATE_PROP' as const, payload: { id: 'person-1', updates: { name: 'A' } } }
        ];

        const success = await deltaSyncService.pushOperations('11111111-1111-4111-8111-111111111111', ops);
        expect(success).toBe(true);
        expect(offlineCache.savePendingOperations).toHaveBeenCalledTimes(1);

        // Verify that client_version/created_at ordering is preserved
        const calledOps = vi.mocked(offlineCache.savePendingOperations).mock.calls[0][0];
        expect(calledOps).toHaveLength(2);
        expect(calledOps[0].type).toBe('ADD_NODE');
        expect(calledOps[1].type).toBe('UPDATE_PROP');

        // Verify that index alignment mapping maps ids[i] to ops[i]
        expect(storeState.addPendingOperation).toHaveBeenCalledTimes(2);
        expect(storeState.addPendingOperation).toHaveBeenNthCalledWith(1, expect.objectContaining({ localId: 101, type: 'ADD_NODE' }));
        expect(storeState.addPendingOperation).toHaveBeenNthCalledWith(2, expect.objectContaining({ localId: 102, type: 'UPDATE_PROP' }));
    });

    it('rolls back operations using bulkDeletePendingOperations if save fails', async () => {
        vi.mocked(offlineCache.savePendingOperations).mockRejectedValueOnce(new Error('IndexedDB transaction failed'));

        const ops = [
            { type: 'ADD_NODE' as const, payload: { id: 'person-1' } },
            { type: 'UPDATE_PROP' as const, payload: { id: 'person-1', updates: {} } }
        ];

        const success = await deltaSyncService.pushOperations('11111111-1111-4111-8111-111111111111', ops);
        expect(success).toBe(false);
        expect(offlineCache.savePendingOperations).toHaveBeenCalledTimes(1);
        // Transaction failure means no IDs were successfully returned, so no rollback delete is called
        expect(offlineCache.bulkDeletePendingOperations).not.toHaveBeenCalled();
    });
});
