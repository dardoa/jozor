import { describe, expect, it } from 'vitest';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import type { Person } from '../../types';
import type { PendingDeltaOp } from '../../services/sync/SyncTypes';
import { projectPendingOperations } from '../pendingOperationsProjection';

const buildPerson = (id: string, firstName: string, overrides: Partial<Person> = {}): Person => ({
  ...DEFAULT_PERSON_TEMPLATE,
  id,
  firstName,
  ...overrides,
});

const buildPendingOp = (
  localId: number,
  operation: Pick<PendingDeltaOp, 'type' | 'payload'>
): PendingDeltaOp => ({
  tree_id: 'tree-1',
  user_id: 'user-1',
  created_at: '2026-05-26T00:00:00.000Z',
  localId,
  ...operation,
});

describe('projectPendingOperations', () => {
  it('replays pending updates over a confirmed people snapshot without mutating the base', () => {
    const base = {
      'person-1': buildPerson('person-1', 'Before'),
    };

    const projection = projectPendingOperations(base, [
      buildPendingOp(1, {
        type: 'UPDATE_PROP',
        payload: { id: 'person-1', updates: { firstName: 'After' } },
      }),
    ]);

    expect(base['person-1'].firstName).toBe('Before');
    expect(projection.people['person-1'].firstName).toBe('After');
    expect(projection.appliedLocalIds).toEqual([1]);
    expect(projection.failedLocalIds).toEqual([]);
  });

  it('keeps applying later valid operations when an earlier pending op cannot be projected', () => {
    const base = {
      'person-1': buildPerson('person-1', 'Before'),
    };

    const projection = projectPendingOperations(base, [
      buildPendingOp(1, {
        type: 'ADD_NODE',
        payload: {},
      }),
      buildPendingOp(2, {
        type: 'UPDATE_PROP',
        payload: { id: 'person-1', updates: { lastName: 'Projected' } },
      }),
    ]);

    expect(projection.people['person-1'].lastName).toBe('Projected');
    expect(projection.appliedLocalIds).toEqual([2]);
    expect(projection.failedLocalIds).toEqual([1]);
  });
});
