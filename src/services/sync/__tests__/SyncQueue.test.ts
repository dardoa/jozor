import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncQueue } from '../SyncQueue';
import type {
    DeltaOperation,
    PendingDeltaOp,
    SyncFlushResult,
    SyncRetryState,
} from '../SyncTypes';

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

interface QueueHarness {
    queue: SyncQueue;
    retryStates: SyncRetryState[];
    retryBatches: PendingDeltaOp[][];
}

const createQueue = (
    onFlushOutgoing: (batch: PendingDeltaOp[]) => Promise<SyncFlushResult>,
    overrides: Partial<ConstructorParameters<typeof SyncQueue>[0]> = {}
): QueueHarness => {
    const retryStates: SyncRetryState[] = [];
    const retryBatches: PendingDeltaOp[][] = [];
    const queue = new SyncQueue({
        outgoingBatchDelay: 100,
        incomingBatchDelay: 10,
        onFlushOutgoing,
        onFlushIncoming: (_batch: DeltaOperation[]) => undefined,
        retryJitterRatio: 0,
        maxAutoRetryAttempts: 3,
        onRetryStateChange: (state) => {
            retryStates.push(state);
        },
        onRetryBatchUpdated: (batch) => {
            retryBatches.push(batch);
        },
        ...overrides,
    });
    return { queue, retryStates, retryBatches };
};

describe('SyncQueue', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-14T00:00:00.000Z'));
        storeState.syncStatus.syncBlockedByPlan = false;
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    async function advance(milliseconds: number) {
        await vi.advanceTimersByTimeAsync(milliseconds);
        await Promise.resolve();
    }

    it('uses exponential backoff and persists retry counts before succeeding', async () => {
        const flushMock = vi
            .fn()
            .mockResolvedValueOnce({ success: false, shouldRetry: true, error: 'network' })
            .mockResolvedValueOnce({ success: false, shouldRetry: true, error: 'network' })
            .mockResolvedValueOnce({ success: true, shouldRetry: false });
        const { queue, retryStates, retryBatches } = createQueue(flushMock);

        queue.enqueueOutgoing(op);
        await advance(100);

        expect(flushMock).toHaveBeenCalledTimes(1);
        expect(retryBatches[0][0].retryCount).toBe(1);
        expect(retryStates.at(-1)).toMatchObject({
            attempt: 1,
            paused: false,
            nextRetryAt: new Date('2026-06-14T00:00:00.200Z'),
        });

        await advance(99);
        expect(flushMock).toHaveBeenCalledTimes(1);
        await advance(1);
        expect(flushMock).toHaveBeenCalledTimes(2);
        expect(retryBatches[1][0].retryCount).toBe(2);
        expect(retryStates.at(-1)).toMatchObject({
            attempt: 2,
            paused: false,
            nextRetryAt: new Date('2026-06-14T00:00:00.400Z'),
        });

        await advance(200);
        expect(flushMock).toHaveBeenCalledTimes(3);
        expect(queue.getPendingOutgoingCount()).toBe(0);
        expect(retryStates.at(-1)).toMatchObject({
            attempt: 0,
            paused: false,
            nextRetryAt: null,
        });
    });

    it('pauses after the automatic retry threshold without dropping operations', async () => {
        const flushMock = vi.fn().mockResolvedValue({
            success: false,
            shouldRetry: true,
            error: 'offline',
        });
        const { queue, retryStates } = createQueue(flushMock);

        queue.enqueueOutgoing(op);
        await advance(100);
        await advance(100);
        await advance(200);

        expect(flushMock).toHaveBeenCalledTimes(3);
        expect(queue.getPendingOutgoingCount()).toBe(1);
        expect(retryStates.at(-1)).toMatchObject({
            attempt: 3,
            paused: true,
            nextRetryAt: null,
        });

        await advance(10_000);
        expect(flushMock).toHaveBeenCalledTimes(3);
    });

    it('retains and pauses non-retryable failed batches', async () => {
        const flushMock = vi.fn().mockResolvedValue({
            success: false,
            shouldRetry: false,
            error: 'permission',
        });
        const { queue, retryStates } = createQueue(flushMock);

        queue.enqueueOutgoing(op);
        await advance(100);

        expect(flushMock).toHaveBeenCalledTimes(1);
        expect(queue.getPendingOutgoingCount()).toBe(1);
        expect(retryStates.at(-1)).toMatchObject({ attempt: 1, paused: true });
    });

    it('manual retry resets the attempt count and flushes a paused queue', async () => {
        const flushMock = vi
            .fn()
            .mockResolvedValueOnce({ success: false, shouldRetry: false, error: 'server' })
            .mockResolvedValueOnce({ success: true, shouldRetry: false });
        const { queue, retryBatches } = createQueue(flushMock);

        queue.enqueueOutgoing(op);
        await advance(100);
        expect(queue.getPendingOutgoingCount()).toBe(1);

        await queue.retryOutgoingNow();

        expect(flushMock).toHaveBeenCalledTimes(2);
        expect(flushMock.mock.calls[1][0][0].retryCount).toBe(0);
        expect(retryBatches.at(-1)?.[0].retryCount).toBe(0);
        expect(queue.getPendingOutgoingCount()).toBe(0);
    });

    it('keeps a recovered operation paused when it already reached the retry threshold', async () => {
        const flushMock = vi.fn().mockResolvedValue({ success: true, shouldRetry: false });
        const { queue, retryStates } = createQueue(flushMock);

        queue.enqueueOutgoing({ ...op, retryCount: 3 });
        await advance(10_000);

        expect(flushMock).not.toHaveBeenCalled();
        expect(queue.getPendingOutgoingCount()).toBe(1);
        expect(retryStates.at(-1)).toMatchObject({
            attempt: 3,
            paused: true,
            nextRetryAt: null,
        });
    });

    it('keeps retrying in memory if retry metadata persistence fails', async () => {
        const flushMock = vi
            .fn()
            .mockResolvedValueOnce({ success: false, shouldRetry: true, error: 'network' })
            .mockResolvedValueOnce({ success: true, shouldRetry: false });
        const { queue } = createQueue(flushMock, {
            onRetryBatchUpdated: () => Promise.reject(new Error('IndexedDB unavailable')),
        });

        queue.enqueueOutgoing(op);
        await advance(100);
        expect(queue.getPendingOutgoingCount()).toBe(1);

        await advance(100);
        expect(flushMock).toHaveBeenCalledTimes(2);
        expect(queue.getPendingOutgoingCount()).toBe(0);
    });

    it('does not flush outgoing queue if sync is blocked by plan', async () => {
        storeState.syncStatus.syncBlockedByPlan = true;
        const flushMock = vi.fn().mockResolvedValue({ success: true, shouldRetry: false });
        const { queue } = createQueue(flushMock);

        queue.enqueueOutgoing(op);
        await advance(100);

        expect(flushMock).not.toHaveBeenCalled();
        expect(queue.getPendingOutgoingCount()).toBe(1);
    });
});
