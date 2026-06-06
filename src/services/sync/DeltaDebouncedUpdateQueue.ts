import type { Person } from '../../types/person';
import type { DeltaPayload, OperationType } from './SyncTypes';

type PushOperation = (
    treeId: string,
    type: OperationType,
    payload: DeltaPayload
) => Promise<boolean>;

export class DeltaDebouncedUpdateQueue {
    private updateQueue = new Map<string, { treeId: string; updates: Partial<Person> }>();
    private updateTimeout: NodeJS.Timeout | null = null;

    constructor(
        private readonly pushOperation: PushOperation,
        private readonly addSyncingNode: (personId: string) => void,
        private readonly delayMs = 1500
    ) {}

    async enqueue(treeId: string, personId: string, updates: Partial<Person>): Promise<boolean> {
        this.addSyncingNode(personId);

        const existing = this.updateQueue.get(personId);
        if (existing) {
            existing.updates = { ...existing.updates, ...updates };
        } else {
            this.updateQueue.set(personId, { treeId, updates });
        }

        if (this.updateTimeout) clearTimeout(this.updateTimeout);

        this.updateTimeout = setTimeout(() => {
            void this.flush();
        }, this.delayMs);

        return true;
    }

    async flush(): Promise<void> {
        if (this.updateTimeout) {
            clearTimeout(this.updateTimeout);
            this.updateTimeout = null;
        }

        const queued = Array.from(this.updateQueue.entries());
        this.updateQueue.clear();

        await Promise.all(
            queued.map(([id, data]) =>
                this.pushOperation(data.treeId, 'UPDATE_PROP', { id, updates: data.updates })
            )
        );
    }
}
