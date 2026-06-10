import { describe, expect, it, vi } from 'vitest';
import { offlineCache } from '../OfflineCache';
import { storageService } from '../../storageService';

vi.mock('../../storageService', () => ({
    storageService: {
        savePendingOperation: vi.fn(),
        savePendingOperations: vi.fn(),
        getPendingOperations: vi.fn(),
        deletePendingOperation: vi.fn(),
        bulkDeletePendingOperations: vi.fn(),
    }
}));

describe('OfflineCache', () => {
    it('saves a single pending operation and removes localId/id during sanitization', async () => {
        const op = { localId: 12, id: 34, tree_id: 'tree-1', user_id: 'user-1', type: 'ADD_NODE', payload: {}, created_at: '2026' };
        vi.mocked(storageService.savePendingOperation).mockResolvedValueOnce(42);

        const result = await offlineCache.savePendingOperation(op as any);
        expect(result).toBe(42);
        expect(storageService.savePendingOperation).toHaveBeenCalledWith({
            tree_id: 'tree-1',
            user_id: 'user-1',
            type: 'ADD_NODE',
            payload: {},
            created_at: '2026'
        });
    });

    it('saves multiple pending operations in bulk and sanitizes them', async () => {
        const ops = [
            { localId: 10, id: 11, tree_id: 'tree-1', user_id: 'user-1', type: 'ADD_NODE', payload: {}, created_at: '2026' },
            { localId: 20, id: 22, tree_id: 'tree-1', user_id: 'user-1', type: 'UPDATE_PROP', payload: {}, created_at: '2026' }
        ];
        vi.mocked(storageService.savePendingOperations).mockResolvedValueOnce([42, 43]);

        const result = await offlineCache.savePendingOperations(ops as any);
        expect(result).toEqual([42, 43]);
        expect(storageService.savePendingOperations).toHaveBeenCalledWith([
            { tree_id: 'tree-1', user_id: 'user-1', type: 'ADD_NODE', payload: {}, created_at: '2026' },
            { tree_id: 'tree-1', user_id: 'user-1', type: 'UPDATE_PROP', payload: {}, created_at: '2026' }
        ]);
    });
});
