import { DeltaOperation } from './SyncTypes';

export class ConflictResolver {
    private reorderBuffer = new Map<number, DeltaOperation>();
    private REORDER_BUFFER_MAX_SIZE = 500;

    constructor(
        private options: {
            onGapDetected: (missingVersion: number) => void;
            onBufferOverflow: () => void;
        }
    ) {}

    public processIncoming(ops: DeltaOperation[], currentVersion: number): DeltaOperation[] {
        // 1. Add to buffer and prune stale
        ops.forEach(op => {
            if (op.version_seq && op.version_seq > currentVersion) {
                this.reorderBuffer.set(op.version_seq, op);
            }
        });

        if (this.reorderBuffer.size > this.REORDER_BUFFER_MAX_SIZE) {
            this.reorderBuffer.clear();
            this.options.onBufferOverflow();
            return [];
        }

        // Prune stale from existing buffer
        for (const seq of this.reorderBuffer.keys()) {
            if (seq <= currentVersion) {
                this.reorderBuffer.delete(seq);
            }
        }

        // 2. Extract sequential
        const sequential: DeltaOperation[] = [];
        let nextVersion = currentVersion + 1;

        if (currentVersion === 0) {
            // Initial load bypass
            const allOps = Array.from(this.reorderBuffer.values()).sort((a, b) => (a.version_seq || 0) - (b.version_seq || 0));
            sequential.push(...allOps);
            this.reorderBuffer.clear();
        } else {
            while (this.reorderBuffer.has(nextVersion)) {
                const op = this.reorderBuffer.get(nextVersion)!;
                sequential.push(op);
                this.reorderBuffer.delete(nextVersion);
                nextVersion++;
            }

            if (sequential.length === 0 && this.reorderBuffer.size > 0) {
                this.options.onGapDetected(nextVersion);
            }
        }

        return sequential;
    }

    public clearBuffer() {
        this.reorderBuffer.clear();
    }
}
