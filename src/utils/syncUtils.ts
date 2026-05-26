import { Person } from '../types';
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
