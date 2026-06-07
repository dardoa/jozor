import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DeltaRemoteSyncClient } from '../DeltaRemoteSyncClient';
import type { PendingDeltaOp } from '../SyncTypes';
import type { Person } from '../../../types';

const mocks = vi.hoisted(() => ({
    rpc: vi.fn(),
    bulkDeletePendingOperations: vi.fn(),
    setSyncStatus: vi.fn(),
    incrementOpCount: vi.fn(),
    setConfirmedPeople: vi.fn(),
    removePendingOperations: vi.fn(),
    setPeople: vi.fn(),
    people: {} as Record<string, Person>,
    confirmedPeople: {} as Record<string, Person>,
    pendingOperations: [] as PendingDeltaOp[],
}));

vi.mock('../../supabaseClient', () => ({
    getSupabaseWithAuth: vi.fn(() => ({
        rpc: mocks.rpc,
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
            people: mocks.people,
            confirmedPeople: mocks.confirmedPeople,
            pendingOperations: mocks.pendingOperations,
            setConfirmedPeople: mocks.setConfirmedPeople,
            removePendingOperations: mocks.removePendingOperations,
            setPeople: mocks.setPeople,
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
        } as unknown as Person,
    },
    created_at: '2026-05-09T00:00:00.000Z',
    localId: 7,
};

describe('DeltaRemoteSyncClient', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.rpc.mockResolvedValue({ error: null });
        mocks.bulkDeletePendingOperations.mockResolvedValue(undefined);
        mocks.people = {};
        mocks.confirmedPeople = {};
        mocks.pendingOperations = [];
    });

    it('persists batch by calling sync_tree_batch RPC', async () => {
        const client = new DeltaRemoteSyncClient(() => 0, vi.fn());

        const result = await client.flushOutgoingBatch([addNodeOp], null);

        expect(result).toEqual({ success: true, shouldRetry: false });
        const { localId, ...expectedOp } = addNodeOp;
        expect(mocks.rpc).toHaveBeenCalledWith('sync_tree_batch', { p_ops: [expectedOp] });
        expect(mocks.bulkDeletePendingOperations).toHaveBeenCalledWith([7]);
        expect(mocks.incrementOpCount).toHaveBeenCalledWith(1);
    });

    it('sets syncBlockedByPlan = true when it catches a BILLING category error', async () => {
        const client = new DeltaRemoteSyncClient(() => 0, vi.fn());
        mocks.rpc.mockResolvedValueOnce({
            error: {
                message: 'LIMIT_EXCEEDED_FREE',
            },
        });

        const result = await client.flushOutgoingBatch([addNodeOp], null);

        expect(result.success).toBe(false);
        expect(result.shouldRetry).toBe(false);
        expect(mocks.setSyncStatus).toHaveBeenCalledWith(
            expect.objectContaining({
                syncBlockedByPlan: true,
                errorMessage: 'Plan limit reached. Please upgrade your subscription to continue.',
            })
        );
    });

    it('does not acknowledge the batch when the RPC fails', async () => {
        const client = new DeltaRemoteSyncClient(() => 0, vi.fn());
        mocks.rpc.mockResolvedValueOnce({
            error: {
                message: 'Internal Database Error',
            },
        });

        const result = await client.flushOutgoingBatch([addNodeOp], null);

        expect(result.success).toBe(false);
        expect(result.shouldRetry).toBe(true);
        expect(mocks.bulkDeletePendingOperations).not.toHaveBeenCalled();
    });
});
