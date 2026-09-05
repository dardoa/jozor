
import { describe, it, expect } from 'vitest';
import { sanitizeOutgoingBatch } from '../sanitizeBatch';
import { PendingDeltaOp } from '../SyncTypes';

describe('sanitizeOutgoingBatch', () => {
    it('removes localId, retryCount, and removeReason from operations', () => {
        const batch: PendingDeltaOp[] = [
            {
                tree_id: 'tree-1',
                user_id: 'user-1',
                type: 'UPDATE_PROP',
                payload: { id: 'person-1', updates: { name: 'Test' }, client_version: 1, client_id: 'client-1' },
                created_at: '2026-05-01T00:00:00.000Z',
                localId: 1,
                retryCount: 0,
                removeReason: 'none'
            },
            {
                tree_id: 'tree-1',
                user_id: 'user-1',
                type: 'ADD_NODE',
                payload: { id: 'person-2', client_version: 2, client_id: 'client-1' },
                created_at: '2026-05-01T00:01:00.000Z',
                localId: 2,
                // Missing retryCount/removeReason to test optionality
            }
        ];

        const result = sanitizeOutgoingBatch(batch);

        expect(result).toHaveLength(2);
        
        expect(result[0]).not.toHaveProperty('localId');
        expect(result[0]).not.toHaveProperty('retryCount');
        expect(result[0]).not.toHaveProperty('removeReason');
        expect(result[0]).toHaveProperty('tree_id', 'tree-1');
        
        expect(result[1]).not.toHaveProperty('localId');
        expect(result[1]).toHaveProperty('type', 'ADD_NODE');
    });

    it('returns an empty array when given an empty batch', () => {
        expect(sanitizeOutgoingBatch([])).toEqual([]);
    });

    it('preserves an explicit null media removal while dropping undefined values', () => {
        const batch: PendingDeltaOp[] = [{
            tree_id: 'tree-1',
            user_id: 'user-1',
            type: 'UPDATE_PROP',
            payload: {
                id: 'person-1',
                updates: { photoAsset: null, photoUrl: undefined },
            },
            created_at: '2026-09-05T00:00:00.000Z',
        }];

        const [operation] = sanitizeOutgoingBatch(batch);

        expect(operation.payload.updates).toEqual({ photoAsset: null });
    });
});

