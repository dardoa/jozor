import { describe, expect, it } from 'vitest';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import type { Person } from '../../types';
import type { DeltaOperation } from '../../services/sync/SyncTypes';
import { applyDeltaOperationToFamily } from '../FamilyDomainReducer';

const makePerson = (overrides: Partial<Person>): Person => ({
  id: overrides.id || 'person-1',
  ...DEFAULT_PERSON_TEMPLATE,
  metadata: {
    lastUpdated: {},
    lastUpdatedOps: {},
  },
  ...overrides,
});

const makeOperation = (overrides: Partial<DeltaOperation>): DeltaOperation => ({
  tree_id: 'tree-1',
  user_id: 'user-1',
  type: 'UPDATE_PROP',
  payload: {},
  ...overrides,
});

describe('FamilyDomainReducer - Conflict Resolution (Stage C4)', () => {
  it('applies property-level updates if incoming timestamp is strictly greater', () => {
    const person = makePerson({
      id: 'person-1',
      firstName: 'Alice',
      lastName: 'Smith',
      metadata: {
        lastUpdated: {
          firstName: '2026-06-09T00:00:00.000Z',
          lastName: '2026-06-09T00:00:00.000Z',
        },
        lastUpdatedOps: {
          firstName: { client_id: 'client-A', client_version: 1 },
          lastName: { client_id: 'client-A', client_version: 1 },
        },
      },
    });

    // Incoming operation with greater timestamp for firstName, smaller for lastName
    const result = applyDeltaOperationToFamily(
      { 'person-1': person },
      makeOperation({
        created_at: '2026-06-09T00:05:00.000Z',
        payload: {
          id: 'person-1',
          client_id: 'client-B',
          client_version: 1,
          updates: {
            firstName: 'Bob',
          },
        },
      })
    );

    expect(result?.['person-1'].firstName).toBe('Bob');
    expect(result?.['person-1'].metadata?.lastUpdated?.firstName).toBe('2026-06-09T00:05:00.000Z');
    expect(result?.['person-1'].metadata?.lastUpdatedOps?.firstName).toEqual({
      client_id: 'client-B',
      client_version: 1,
    });
  });

  it('rejects property-level updates if incoming timestamp is strictly smaller', () => {
    const person = makePerson({
      id: 'person-1',
      firstName: 'Alice',
      metadata: {
        lastUpdated: {
          firstName: '2026-06-09T00:05:00.000Z',
        },
        lastUpdatedOps: {
          firstName: { client_id: 'client-A', client_version: 1 },
        },
      },
    });

    const result = applyDeltaOperationToFamily(
      { 'person-1': person },
      makeOperation({
        created_at: '2026-06-09T00:00:00.000Z',
        payload: {
          id: 'person-1',
          client_id: 'client-B',
          client_version: 1,
          updates: {
            firstName: 'Bob',
          },
        },
      })
    );

    // Should NOT overwrite Alice since incoming operation is older (clock drift simulation)
    expect(result?.['person-1'].firstName).toBe('Alice');
  });

  it('uses lexicographical client_id tie-breaker when timestamps are equal', () => {
    const person = makePerson({
      id: 'person-1',
      firstName: 'Alice',
      metadata: {
        lastUpdated: {
          firstName: '2026-06-09T00:00:00.000Z',
        },
        lastUpdatedOps: {
          firstName: { client_id: 'client-A', client_version: 1 },
        },
      },
    });

    // Incoming with equal timestamp but higher client_id 'client-B' > 'client-A'
    const result1 = applyDeltaOperationToFamily(
      { 'person-1': person },
      makeOperation({
        created_at: '2026-06-09T00:00:00.000Z',
        payload: {
          id: 'person-1',
          client_id: 'client-B',
          client_version: 1,
          updates: {
            firstName: 'Bob',
          },
        },
      })
    );
    expect(result1?.['person-1'].firstName).toBe('Bob');

    // Incoming with equal timestamp but lower client_id 'client-0' < 'client-A'
    const result2 = applyDeltaOperationToFamily(
      { 'person-1': person },
      makeOperation({
        created_at: '2026-06-09T00:00:00.000Z',
        payload: {
          id: 'person-1',
          client_id: 'client-0',
          client_version: 1,
          updates: {
            firstName: 'Charlie',
          },
        },
      })
    );
    expect(result2?.['person-1'].firstName).toBe('Alice');
  });

  it('uses numerical client_version tie-breaker when timestamps and client_ids are equal', () => {
    const person = makePerson({
      id: 'person-1',
      firstName: 'Alice',
      metadata: {
        lastUpdated: {
          firstName: '2026-06-09T00:00:00.000Z',
        },
        lastUpdatedOps: {
          firstName: { client_id: 'client-A', client_version: 2 },
        },
      },
    });

    // Incoming with equal timestamp, same client_id, but smaller version (1 < 2)
    const result1 = applyDeltaOperationToFamily(
      { 'person-1': person },
      makeOperation({
        created_at: '2026-06-09T00:00:00.000Z',
        payload: {
          id: 'person-1',
          client_id: 'client-A',
          client_version: 1,
          updates: {
            firstName: 'Bob',
          },
        },
      })
    );
    expect(result1?.['person-1'].firstName).toBe('Alice');

    // Incoming with equal timestamp, same client_id, but greater version (3 > 2)
    const result2 = applyDeltaOperationToFamily(
      { 'person-1': person },
      makeOperation({
        created_at: '2026-06-09T00:00:00.000Z',
        payload: {
          id: 'person-1',
          client_id: 'client-A',
          client_version: 3,
          updates: {
            firstName: 'Charlie',
          },
        },
      })
    );
    expect(result2?.['person-1'].firstName).toBe('Charlie');
  });

  it('excludes relational fields (parents, spouses, children) and partnerDetails from LWW tracking', () => {
    const person = makePerson({
      id: 'person-1',
      firstName: 'Alice',
      parents: ['parent-A'],
      metadata: {
        lastUpdated: {
          firstName: '2026-06-09T00:10:00.000Z',
        },
        lastUpdatedOps: {
          firstName: { client_id: 'client-A', client_version: 5 },
        },
      },
    });

    // If we update relational fields, they should bypass timestamp checks completely
    const result = applyDeltaOperationToFamily(
      {
        'person-1': person,
        'parent-B': makePerson({ id: 'parent-B' }),
      },
      makeOperation({
        type: 'ADD_RELATION',
        payload: {
          focusId: 'person-1',
          existingId: 'parent-B',
          type: 'parent',
        },
      })
    );

    // The parent link must be successfully applied regardless of operation timestamp
    expect(result?.['person-1'].parents).toEqual(['parent-A', 'parent-B']);
    expect(result?.['person-1'].metadata?.lastUpdated?.parents).toBeUndefined();
  });
});
