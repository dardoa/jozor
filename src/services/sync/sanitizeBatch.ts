import { PendingDeltaOp, DeltaOperation } from './SyncTypes';

/**
 * Removes local-only fields from pending operations before sending them to the server.
 * This ensures that only valid schema fields are written to `tree_operations`.
 */
export function sanitizeOutgoingBatch(batch: PendingDeltaOp[]): Omit<PendingDeltaOp, 'localId' | 'retryCount' | 'removeReason'>[] {
    // Deep clean the batch to remove 'undefined' properties which can cause 400 Bad Request in PostgREST
    return JSON.parse(JSON.stringify(
        batch.map(({ localId: _localId, retryCount: _retryCount, removeReason: _removeReason, ...rest }) => rest)
    ));
}
