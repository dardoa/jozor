import { Person, MutationActionResult } from '../types';
import type { DeltaOperation } from '../services/sync/SyncTypes';
import { applyDeltaOperationToFamily } from '../domain/FamilyDomainReducer';

/**
 * Applies a single operation to a people map and returns the UPDATED map.
 * Pure function: Does not mutate the input map directly, returns a new shallow copy if changed.
 */
export const applyOperationToMap = (people: Record<string, Person>, op: DeltaOperation): Record<string, Person> | null => {
    try {
        return applyDeltaOperationToFamily(people, op);
    } catch (e) {
        console.error('[SyncUtils] Failed to apply operation:', e);
        return null;
    }
};

export interface ExecuteCommandSyncOptions {
    treeId: string | null | undefined;
    operationType: string;
    errorPrefix: string;
    fallbackErrorMessage: string;
    rollback?: () => void;
    syncAction: () => Promise<MutationActionResult | void>;
}

/**
 * Unified helper to wrap command sync calls, handle missing tree ID,
 * catch exceptions, run rollbacks, and return MutationActionResult consistently.
 */
export const executeCommandSync = async (
    options: ExecuteCommandSyncOptions
): Promise<MutationActionResult> => {
    const { treeId, operationType, errorPrefix, fallbackErrorMessage, rollback, syncAction } = options;

    if (!treeId) {
        console.warn(`DeltaSync: Skip pushOperation (${operationType}) - currentTreeId is missing`);
        return { success: true };
    }

    try {
        const result = await syncAction();
        if (result && !result.success) {
            if (rollback) rollback();
            return result;
        }
        return { success: true };
    } catch (error) {
        console.error(errorPrefix, error);
        if (rollback) rollback();
        return {
            success: false,
            error: error instanceof Error ? error.message : fallbackErrorMessage,
        };
    }
};

