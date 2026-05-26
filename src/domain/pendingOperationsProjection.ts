import type { Person } from '../types';
import type { PendingDeltaOp } from '../services/sync/SyncTypes';
import { applyDeltaOperationToFamily } from './FamilyDomainReducer';

export interface PendingOperationsProjection {
  people: Record<string, Person>;
  appliedLocalIds: number[];
  failedLocalIds: number[];
}

/**
 * Pure replay helper for the future two-layer sync model:
 * confirmed server state + local pending operations = UI projection.
 */
export const projectPendingOperations = (
  confirmedPeople: Record<string, Person>,
  pendingOperations: PendingDeltaOp[]
): PendingOperationsProjection => {
  let people = confirmedPeople;
  const appliedLocalIds: number[] = [];
  const failedLocalIds: number[] = [];

  pendingOperations.forEach((operation) => {
    try {
      const nextPeople = applyDeltaOperationToFamily(people, operation);

      if (!nextPeople) {
        if (operation.localId !== undefined) failedLocalIds.push(operation.localId);
        return;
      }

      people = nextPeople;
      if (operation.localId !== undefined) appliedLocalIds.push(operation.localId);
    } catch {
      if (operation.localId !== undefined) failedLocalIds.push(operation.localId);
    }
  });

  return { people, appliedLocalIds, failedLocalIds };
};
