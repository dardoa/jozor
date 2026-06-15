import {
    DeltaOperation,
    PendingDeltaOp,
    SyncFlushResult,
    SyncRetryState,
} from './SyncTypes';
import { useAppStore } from '../../store/useAppStore';

const DEFAULT_MAX_AUTO_RETRY_ATTEMPTS = 6;
const DEFAULT_MAX_RETRY_DELAY = 30_000;
const DEFAULT_RETRY_JITTER_RATIO = 0.2;

interface SyncQueueOptions {
    outgoingBatchDelay: number;
    incomingBatchDelay: number;
    onFlushOutgoing: (batch: PendingDeltaOp[]) => Promise<SyncFlushResult>;
    onFlushIncoming: (batch: DeltaOperation[]) => void;
    onRetryBatchUpdated?: (batch: PendingDeltaOp[]) => Promise<void> | void;
    onRetryStateChange?: (state: SyncRetryState) => void;
    maxAutoRetryAttempts?: number;
    maxRetryDelay?: number;
    retryJitterRatio?: number;
    random?: () => number;
}

export class SyncQueue {
    private outgoingQueue: PendingDeltaOp[] = [];
    private incomingQueue: DeltaOperation[] = [];
    private isFlushing = false;
    private outgoingTimeout: NodeJS.Timeout | null = null;
    private incomingTimeout: NodeJS.Timeout | null = null;
    private retryPaused = false;

    constructor(private options: SyncQueueOptions) {}

    public enqueueOutgoing(op: PendingDeltaOp) {
        this.outgoingQueue.push(op);
        const maxAttempts = this.options.maxAutoRetryAttempts ?? DEFAULT_MAX_AUTO_RETRY_ATTEMPTS;
        if ((op.retryCount ?? 0) >= maxAttempts) {
            this.pauseRetries(op.retryCount ?? maxAttempts);
            return;
        }
        if (this.retryPaused) return;
        if (this.outgoingTimeout) clearTimeout(this.outgoingTimeout);
        this.outgoingTimeout = setTimeout(() => {
            this.outgoingTimeout = null;
            void this.flushOutgoing();
        }, this.options.outgoingBatchDelay);
    }

    public enqueueIncoming(op: DeltaOperation) {
        this.incomingQueue.push(op);
        if (this.incomingTimeout) clearTimeout(this.incomingTimeout);
        this.incomingTimeout = setTimeout(() => this.flushIncoming(), this.options.incomingBatchDelay);
    }

    private async flushOutgoing(forcePausedRetry = false) {
        if (this.outgoingQueue.length === 0 || this.isFlushing) return;
        if (this.retryPaused && !forcePausedRetry) return;
        if (useAppStore.getState().syncStatus.syncBlockedByPlan) return;

        this.isFlushing = true;

        const batch = [...this.outgoingQueue];
        this.outgoingQueue = [];
        this.outgoingTimeout = null;

        try {
            const result = await this.options.onFlushOutgoing(batch);
            if (result.success) {
                this.resetRetryState();
            } else {
                await this.handleFailedBatch(batch, result);
            }
        } catch (error) {
            await this.handleFailedBatch(batch, {
                success: false,
                shouldRetry: true,
                error: error instanceof Error ? error.message : String(error),
            });
        } finally {
            this.isFlushing = false;
            const isBlocked = !!useAppStore.getState().syncStatus.syncBlockedByPlan;

            if (
                this.outgoingQueue.length > 0
                && !isBlocked
                && !this.retryPaused
                && !this.outgoingTimeout
            ) {
                this.outgoingTimeout = setTimeout(() => {
                    this.outgoingTimeout = null;
                    void this.flushOutgoing();
                }, this.options.outgoingBatchDelay);
            }
        }
    }

    private async handleFailedBatch(batch: PendingDeltaOp[], result: SyncFlushResult) {
        const nextBatch = batch.map((op) => ({
            ...op,
            retryCount: (op.retryCount ?? 0) + 1,
        }));
        this.outgoingQueue = [...nextBatch, ...this.outgoingQueue];

        await this.notifyRetryBatchUpdated(nextBatch);

        const attempt = Math.max(...nextBatch.map((op) => op.retryCount ?? 0));
        const isBlocked = !!useAppStore.getState().syncStatus.syncBlockedByPlan;
        const maxAttempts = this.options.maxAutoRetryAttempts ?? DEFAULT_MAX_AUTO_RETRY_ATTEMPTS;

        if (!result.shouldRetry || isBlocked || attempt >= maxAttempts) {
            this.pauseRetries(attempt, result.error);
            return;
        }

        const delay = this.getRetryDelay(attempt);
        const nextRetryAt = new Date(Date.now() + delay);
        this.options.onRetryStateChange?.({
            attempt,
            paused: false,
            nextRetryAt,
            error: result.error,
        });
        this.outgoingTimeout = setTimeout(() => {
            this.outgoingTimeout = null;
            void this.flushOutgoing();
        }, delay);
    }

    private getRetryDelay(attempt: number): number {
        const baseDelay = this.options.outgoingBatchDelay;
        const maxDelay = this.options.maxRetryDelay ?? DEFAULT_MAX_RETRY_DELAY;
        const jitterRatio = this.options.retryJitterRatio ?? DEFAULT_RETRY_JITTER_RATIO;
        const random = this.options.random ?? Math.random;
        const exponentialDelay = Math.min(
            maxDelay,
            baseDelay * (2 ** Math.max(0, attempt - 1))
        );
        const jitterMultiplier = 1 + ((random() * 2 - 1) * jitterRatio);
        return Math.max(
            baseDelay,
            Math.min(maxDelay, Math.round(exponentialDelay * jitterMultiplier))
        );
    }

    private pauseRetries(attempt: number, error?: string) {
        this.retryPaused = true;
        if (this.outgoingTimeout) {
            clearTimeout(this.outgoingTimeout);
            this.outgoingTimeout = null;
        }
        this.options.onRetryStateChange?.({
            attempt,
            paused: true,
            nextRetryAt: null,
            error,
        });
    }

    private resetRetryState() {
        this.retryPaused = false;
        this.options.onRetryStateChange?.({
            attempt: 0,
            paused: false,
            nextRetryAt: null,
        });
    }

    private async notifyRetryBatchUpdated(batch: PendingDeltaOp[]) {
        try {
            await this.options.onRetryBatchUpdated?.(batch);
        } catch {
            // Retry metadata is diagnostic. The in-memory batch must remain retryable
            // even if IndexedDB is temporarily unavailable.
        }
    }

    private flushIncoming() {
        if (this.incomingQueue.length === 0) return;
        const batch = [...this.incomingQueue];
        this.incomingQueue = [];
        this.incomingTimeout = null;
        this.options.onFlushIncoming(batch);
    }

    public getPendingOutgoingCount(): number {
        return this.outgoingQueue.length;
    }

    public clearOutgoing() {
        if (this.outgoingTimeout) clearTimeout(this.outgoingTimeout);
        this.outgoingTimeout = null;
        this.outgoingQueue = [];
        this.isFlushing = false;
        this.resetRetryState();
    }

    public async flushOutgoingNow(): Promise<void> {
        if (this.outgoingTimeout) {
            clearTimeout(this.outgoingTimeout);
            this.outgoingTimeout = null;
        }
        await this.flushOutgoing();
    }

    public async retryOutgoingNow(): Promise<void> {
        if (this.outgoingTimeout) {
            clearTimeout(this.outgoingTimeout);
            this.outgoingTimeout = null;
        }
        this.retryPaused = false;
        this.outgoingQueue = this.outgoingQueue.map((op) => ({ ...op, retryCount: 0 }));
        await this.notifyRetryBatchUpdated(this.outgoingQueue);
        this.options.onRetryStateChange?.({
            attempt: 0,
            paused: false,
            nextRetryAt: null,
        });
        await this.flushOutgoing(true);
    }
}
