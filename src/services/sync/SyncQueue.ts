import { DeltaOperation, PendingDeltaOp, SyncFlushResult } from './SyncTypes';
import { useAppStore } from '../../store/useAppStore';

export class SyncQueue {
    private outgoingQueue: PendingDeltaOp[] = [];
    private incomingQueue: DeltaOperation[] = [];
    private isFlushing = false;
    private outgoingTimeout: NodeJS.Timeout | null = null;
    private incomingTimeout: NodeJS.Timeout | null = null;

    constructor(
        private options: {
            outgoingBatchDelay: number;
            incomingBatchDelay: number;
            onFlushOutgoing: (batch: PendingDeltaOp[]) => Promise<SyncFlushResult>;
            onFlushIncoming: (batch: DeltaOperation[]) => void;
        }
    ) {}

    public enqueueOutgoing(op: PendingDeltaOp) {
        this.outgoingQueue.push(op);
        if (this.outgoingTimeout) clearTimeout(this.outgoingTimeout);
        this.outgoingTimeout = setTimeout(() => this.flushOutgoing(), this.options.outgoingBatchDelay);
    }

    public enqueueIncoming(op: DeltaOperation) {
        this.incomingQueue.push(op);
        if (this.incomingTimeout) clearTimeout(this.incomingTimeout);
        this.incomingTimeout = setTimeout(() => this.flushIncoming(), this.options.incomingBatchDelay);
    }

    private async flushOutgoing() {
        if (this.outgoingQueue.length === 0 || this.isFlushing) return;

        if (useAppStore.getState().syncStatus.syncBlockedByPlan) {
            return;
        }

        this.isFlushing = true;

        const batch = [...this.outgoingQueue];
        this.outgoingQueue = [];
        this.outgoingTimeout = null;

        try {
            const result = await this.options.onFlushOutgoing(batch);
            if (!result.success) {
                const isBlocked = !!useAppStore.getState().syncStatus.syncBlockedByPlan;

                if (result.shouldRetry || isBlocked) {
                    this.outgoingQueue = [...batch, ...this.outgoingQueue];
                }
            }
        } catch {
            // Unexpected failure: keep the batch retryable so ops are not silently lost.
            this.outgoingQueue = [...batch, ...this.outgoingQueue];
        } finally {
            this.isFlushing = false;
            const isBlocked = !!useAppStore.getState().syncStatus.syncBlockedByPlan;

            if (this.outgoingQueue.length > 0 && !isBlocked) {
                this.outgoingTimeout = setTimeout(() => this.flushOutgoing(), this.options.outgoingBatchDelay);
            }
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
        this.outgoingQueue = [];
        this.isFlushing = false;
    }

    public async flushOutgoingNow(): Promise<void> {
        if (this.outgoingTimeout) {
            clearTimeout(this.outgoingTimeout);
            this.outgoingTimeout = null;
        }
        await this.flushOutgoing();
    }
}
