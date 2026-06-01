import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncQueue } from '../SyncQueue';
import type { DeltaOperation, PendingDeltaOp, SyncFlushResult } from '../SyncTypes';

const storeState = {
    syncStatus: { syncBlockedByPlan: false }
};

vi.mock('../../../store/useAppStore', () => ({
    useAppStore: {
        getState: () => storeState
    }
}));

const op: PendingDeltaOp = {
    tree_id: 'tree-1',
    user_id: 'user-1',
    type: 'UPDATE_PROP',
    payload: { id: 'person-1', updates: { firstName: 'A' } },
    created_at: '2026-05-06T00:00:00.000Z',
    localId: 1,
};

const createQueue = (onFlushOutgoing: (batch: PendingDeltaOp[]) => Promise<SyncFlushResult>) =>
    new SyncQueue({
        outgoingBatchDelay: 10,
        incomingBatchDelay: 10,
        onFlushOutgoing,
        onFlushIncoming: (_batch: DeltaOperation[]) => undefined,
    });

describe('SyncQueue', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        storeState.syncStatus.syncBlockedByPlan = false;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    async function runTimersAndMicrotasks() {
        await vi.runOnlyPendingTimersAsync();
        for (let i = 0; i < 10; i++) {
            await Promise.resolve();
        }
    }

    it('requeues retryable failed batches', async () => {
        const flushMock = vi
            .fn()
            .mockResolvedValueOnce({ success: false, shouldRetry: true, error: 'network' })
            .mockResolvedValueOnce({ success: true, shouldRetry: false });
        const queue = createQueue(flushMock);

        queue.enqueueOutgoing(op);
        await runTimersAndMicrotasks();

        expect(queue.getPendingOutgoingCount()).toBe(1);

        await runTimersAndMicrotasks();

        expect(flushMock).toHaveBeenCalledTimes(2);
        expect(queue.getPendingOutgoingCount()).toBe(0);
    });

    it('drops non-retryable failed batches from memory', async () => {
        const flushMock = vi
            .fn()
            .mockResolvedValue({ success: false, shouldRetry: false, error: 'permission' });
        const queue = createQueue(flushMock);

        queue.enqueueOutgoing(op);
        await runTimersAndMicrotasks();

        expect(flushMock).toHaveBeenCalledTimes(1);
        expect(queue.getPendingOutgoingCount()).toBe(0);
    });

    it('does not flush outgoing queue and retains batch if syncBlockedByPlan is true', async () => {
        storeState.syncStatus.syncBlockedByPlan = true;
        const flushMock = vi.fn().mockResolvedValue({ success: true, shouldRetry: false });
        const queue = createQueue(flushMock);

        queue.enqueueOutgoing(op);
        await runTimersAndMicrotasks();

        expect(flushMock).not.toHaveBeenCalled();
        expect(queue.getPendingOutgoingCount()).toBe(1);
    });

    it('prepends outgoing batch back onto queue if flush fails and syncBlockedByPlan becomes true during/after flush', async () => {
        storeState.syncStatus.syncBlockedByPlan = false;
        const flushMock = vi.fn().mockImplementation(async () => {
            storeState.syncStatus.syncBlockedByPlan = true;
            return { success: false, shouldRetry: false, error: 'LIMIT_EXCEEDED_FREE' };
        });
        const queue = createQueue(flushMock);

        queue.enqueueOutgoing(op);
        await runTimersAndMicrotasks();

        expect(flushMock).toHaveBeenCalledTimes(1);
        expect(queue.getPendingOutgoingCount()).toBe(1);
    });
});

