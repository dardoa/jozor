// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeltaRemoteSyncClient } from '../DeltaRemoteSyncClient';
import type { PendingDeltaOp } from '../SyncTypes';
import type { Person } from '../../../types';

const mocks = vi.hoisted(() => ({
    insert: vi.fn(),
    upsertPeople: vi.fn(),
    upsertRelationships: vi.fn(),
    bulkDeletePendingOperations: vi.fn(),
    setSyncStatus: vi.fn(),
    incrementOpCount: vi.fn(),
}));

vi.mock('../../supabaseClient', () => ({
    getSupabaseWithAuth: vi.fn(() => ({
        from: (table: string) => {
            if (table === 'tree_operations') {
                return { insert: mocks.insert };
            }
            if (table === 'people') {
                return { upsert: mocks.upsertPeople };
            }
            if (table === 'relationships') {
                return { upsert: mocks.upsertRelationships };
            }
            if (table === 'trees') {
                return {
                    update: vi.fn(() => ({
                        eq: vi.fn(async () => ({ error: null })),
                    })),
                };
            }
            throw new Error(`Unexpected table: ${table}`);
        },
    })),
}));

vi.mock('../../../store/useAppStore', () => ({
    useAppStore: {
        getState: vi.fn(() => ({
            user: {
                uid: 'user-1',
                email: 'user@example.com',
                supabaseToken: 'token-1',
            },
            syncStatus: { state: 'saving', pendingCount: 1 },
            setSyncStatus: mocks.setSyncStatus,
            incrementOpCount: mocks.incrementOpCount,
        })),
    },
}));

vi.mock('../OfflineCache', () => ({
    offlineCache: {
        bulkDeletePendingOperations: mocks.bulkDeletePendingOperations,
    },
}));

const addNodeOp: PendingDeltaOp = {
    tree_id: '11111111-1111-4111-8111-111111111111',
    user_id: 'user-1',
    type: 'ADD_NODE',
    payload: {
        relativeId: 'parent-1',
        type: 'child',
        person: {
            id: 'child-1',
            firstName: 'Child',
            lastName: 'One',
            gender: 'male',
            parents: ['parent-1'],
            spouses: [],
            children: [],
        } as Person,
    },
    created_at: '2026-05-09T00:00:00.000Z',
    localId: 7,
};

describe('DeltaRemoteSyncClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.insert.mockResolvedValue({ error: null });
        mocks.upsertPeople.mockResolvedValue({ error: null });
        mocks.upsertRelationships.mockResolvedValue({ error: null });
        mocks.bulkDeletePendingOperations.mockResolvedValue(undefined);
    });

    it('persists ADD_NODE to both the operation log and the readable tree projection', async () => {
        const client = new DeltaRemoteSyncClient(() => 0, vi.fn());

        const result = await client.flushOutgoingBatch([addNodeOp], null);

        expect(result).toEqual({ success: true, shouldRetry: false });
        expect(mocks.insert).toHaveBeenCalledTimes(1);
        expect(mocks.upsertPeople).toHaveBeenCalledWith(
            expect.objectContaining({
                id: 'child-1',
                tree_id: addNodeOp.tree_id,
                first_name: 'Child',
            }),
            { onConflict: 'id' }
        );
        expect(mocks.upsertRelationships).toHaveBeenCalledWith(
            {
                tree_id: addNodeOp.tree_id,
                person_id: 'parent-1',
                relative_id: 'child-1',
                type: 'child',
            },
            {
                onConflict: 'tree_id,person_id,relative_id,type',
                ignoreDuplicates: true,
            }
        );
        expect(mocks.bulkDeletePendingOperations).toHaveBeenCalledWith([7]);
    });

    it('does not acknowledge the batch when the readable projection fails', async () => {
        const client = new DeltaRemoteSyncClient(() => 0, vi.fn());
        mocks.upsertPeople.mockResolvedValueOnce({ error: new Error('people write failed') });

        const result = await client.flushOutgoingBatch([addNodeOp], null);

        expect(result.success).toBe(false);
        expect(result.shouldRetry).toBe(true);
        expect(mocks.insert).not.toHaveBeenCalled();
        expect(mocks.bulkDeletePendingOperations).not.toHaveBeenCalled();
    });
});

