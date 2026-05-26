import { describe, expect, it } from 'vitest';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import type { Person } from '../../types';
import type { DeltaOperation } from '../../services/sync/SyncTypes';
import { applyDeltaOperationToFamily, applyFamilyDomainAction } from '../FamilyDomainReducer';

const makePerson = (overrides: Partial<Person>): Person => ({
  id: overrides.id || crypto.randomUUID(),
  ...DEFAULT_PERSON_TEMPLATE,
  ...overrides,
});

const makeOperation = (overrides: Partial<DeltaOperation>): DeltaOperation => ({
  tree_id: 'tree-1',
  user_id: 'user-1',
  type: 'UPDATE_PROP',
  payload: {},
  ...overrides,
});

describe('FamilyDomainReducer', () => {
  it('returns the new person id when adding a child through the domain action surface', () => {
    const parent = makePerson({
      id: 'parent-1',
      gender: 'male',
      children: [],
    });

    const result = applyFamilyDomainAction(
      { 'parent-1': parent },
      {
        type: 'addChild',
        targetId: 'parent-1',
        gender: 'female',
      }
    );

    expect(result?.newId).toBeTruthy();
    expect(result?.people[result.newId!].parents).toEqual(['parent-1']);
    expect(result?.people['parent-1'].children).toContain(result?.newId);
  });

  it('applies remote parent links with the same implicit spouse rule used by local tree operations', () => {
    const child = makePerson({
      id: 'child-1',
      firstName: 'Child',
      parents: ['parent-1'],
    });
    const existingParent = makePerson({
      id: 'parent-1',
      firstName: 'Existing Parent',
      children: ['child-1'],
      spouses: [],
    });
    const newParent = makePerson({
      id: 'parent-2',
      firstName: 'New Parent',
      children: [],
      spouses: [],
    });

    const result = applyDeltaOperationToFamily(
      {
        'child-1': child,
        'parent-1': existingParent,
        'parent-2': newParent,
      },
      makeOperation({
        type: 'ADD_RELATION',
        payload: {
          focusId: 'child-1',
          existingId: 'parent-2',
          type: 'parent',
        },
      })
    );

    expect(result?.['child-1'].parents).toEqual(['parent-1', 'parent-2']);
    expect(result?.['parent-2'].children).toContain('child-1');
    expect(result?.['parent-1'].spouses).toContain('parent-2');
    expect(result?.['parent-2'].spouses).toContain('parent-1');
  });

  it('cleans reciprocal references and partner details when applying remote deletions', () => {
    const first = makePerson({
      id: 'person-1',
      spouses: ['person-2'],
      partnerDetails: {
        'person-2': {
          type: 'married',
          startDate: '2000',
        },
      },
    });
    const second = makePerson({
      id: 'person-2',
      spouses: ['person-1'],
    });

    const result = applyDeltaOperationToFamily(
      {
        'person-1': first,
        'person-2': second,
      },
      makeOperation({
        type: 'DELETE_NODE',
        payload: { id: 'person-2' },
      })
    );

    expect(result?.['person-2']).toBeUndefined();
    expect(result?.['person-1'].spouses).toEqual([]);
    expect(result?.['person-1'].partnerDetails).not.toHaveProperty('person-2');
  });

  it('deduplicates relationship ids when applying a remote add-node operation', () => {
    const child = makePerson({
      id: 'child-1',
      parents: ['parent-1'],
    });
    const parent = makePerson({
      id: 'parent-1',
      children: ['child-1', 'child-1'],
    });

    const result = applyDeltaOperationToFamily(
      { 'child-1': child },
      makeOperation({
        type: 'ADD_NODE',
        payload: {
          person: parent,
          relativeId: 'child-1',
          type: 'parent',
        },
      })
    );

    expect(result?.['parent-1'].children).toEqual(['child-1']);
    expect(result?.['child-1'].parents).toEqual(['parent-1']);
  });
});
