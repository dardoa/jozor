import { storageService } from '../storageService';
import type { PendingDeltaOp, DeltaPayload, OperationType } from './SyncTypes';
import type { Person } from '../../types';

type StoredPendingOperation = Omit<PendingDeltaOp, 'localId' | 'id' | 'type' | 'payload'> & {
    id: number;
    type: OperationType;
    payload: DeltaPayload;
};

export class OfflineCache {
    public async savePendingOperation(op: PendingDeltaOp): Promise<number> {
        // Sanitize for storageService/Dexie (remove numeric PK confusion)
        const sanitized = { ...op };
        delete sanitized.localId;
        delete sanitized.id;
        return await storageService.savePendingOperation(sanitized);
    }

    public async savePendingOperations(ops: PendingDeltaOp[]): Promise<number[]> {
        const sanitized = ops.map(op => {
            const copy = { ...op };
            delete copy.localId;
            delete copy.id;
            return copy;
        });
        return await storageService.savePendingOperations(sanitized);
    }

    public async getPendingOperations(treeId: string): Promise<PendingDeltaOp[]> {
        const rows = await storageService.getPendingOperations(treeId) as StoredPendingOperation[];
        return rows.map(row => ({
            ...row,
            id: undefined, // Clear 'id' as it's the numeric PK from Dexie, not the UUID
            localId: row.id,
            type: row.type,
            payload: row.payload
        }));
    }

    public async deletePendingOperation(localId: number): Promise<void> {
        await storageService.deletePendingOperation(localId);
    }

    public async bulkDeletePendingOperations(localIds: number[]): Promise<void> {
        await storageService.bulkDeletePendingOperations(localIds);
    }

    public async updatePendingOperationRetryCounts(ops: PendingDeltaOp[]): Promise<void> {
        const updates = ops.flatMap((op) =>
            op.localId === undefined
                ? []
                : [{ id: op.localId, retryCount: op.retryCount ?? 0 }]
        );
        await storageService.updatePendingOperationRetryCounts(updates);
    }

    public async saveFullTree(people: Record<string, Person>, treeId?: string): Promise<void> {
        await storageService.saveFullTree(people, treeId);
    }

    public async createSnapshot(people: Record<string, Person>, treeId?: string): Promise<void> {
        await storageService.createSnapshot(people, treeId);
    }
}

export const offlineCache = new OfflineCache();
