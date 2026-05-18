
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncQueue } from '../SyncQueue';
import type { DeltaOperation, PendingDeltaOp, SyncFlushResult } from '../SyncTypes';

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
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('requeues retryable failed batches', async () => {
        const flushMock = vi
            .fn()
            .mockResolvedValueOnce({ success: false, shouldRetry: true, error: 'network' })
            .mockResolvedValueOnce({ success: true, shouldRetry: false });
        const queue = createQueue(flushMock);

        queue.enqueueOutgoing(op);
        await vi.runOnlyPendingTimersAsync();

        expect(queue.getPendingOutgoingCount()).toBe(1);

        await vi.runOnlyPendingTimersAsync();

        expect(flushMock).toHaveBeenCalledTimes(2);
        expect(queue.getPendingOutgoingCount()).toBe(0);
    });

    it('drops non-retryable failed batches from memory', async () => {
        const flushMock = vi
            .fn()
            .mockResolvedValue({ success: false, shouldRetry: false, error: 'permission' });
        const queue = createQueue(flushMock);

        queue.enqueueOutgoing(op);
        await vi.runOnlyPendingTimersAsync();

        expect(flushMock).toHaveBeenCalledTimes(1);
        expect(queue.getPendingOutgoingCount()).toBe(0);
    });
});

