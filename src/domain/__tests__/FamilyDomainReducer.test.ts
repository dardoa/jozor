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

  it('applies only the recorded remote parent link without inventing a marriage', () => {
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
    expect(result?.['parent-1'].spouses).toEqual([]);
    expect(result?.['parent-2'].spouses).toEqual([]);

    const local = applyFamilyDomainAction({ 'child-1': child, 'parent-1': existingParent, 'parent-2': newParent }, {
      type: 'linkPerson', focusId: 'child-1', existingId: 'parent-2', relationshipType: 'parent',
    });
    expect(local?.people['parent-1'].spouses).toEqual(['parent-2']);
    expect(local?.people['parent-2'].spouses).toEqual(['parent-1']);
  });

  it('replays imported family relationships in every order without assigning a former spouse as parent', () => {
    const edges = [
      ['father', 'mother', 'spouse'], ['father', 'former', 'spouse'],
      ['mother', 'child', 'child'], ['father', 'child', 'child'],
    ] as const;
    const permutations = <T,>(items: readonly T[]): T[][] => items.length === 0 ? [[]]
      : items.flatMap((item, index) => permutations(items.filter((_, i) => i !== index)).map(rest => [item, ...rest]));
    for (const ordered of permutations(edges)) {
      let people = Object.fromEntries(['father', 'mother', 'former', 'child'].map(id => [id,
        makePerson({ id, parents: [], children: [], spouses: [] }),
      ]));
      const input = JSON.stringify(people);
      const original = people;
      for (const [focusId, existingId, type] of [...ordered, ...ordered]) {
        people = applyDeltaOperationToFamily(people, makeOperation({
          type: 'ADD_RELATION', payload: { focusId, existingId, type },
        }))!;
      }
      expect(people.child.parents.slice().sort()).toEqual(['father', 'mother']);
      expect(people.former.children).toEqual([]);
      expect(people.father.children).toEqual(['child']);
      expect(people.mother.children).toEqual(['child']);
      expect(people.father.spouses.slice().sort()).toEqual(['former', 'mother']);
      expect(JSON.stringify(original)).toBe(input);
    }
  });

  it('repairs one-sided remote links and preserves explicit relationships beyond UI entry limits', () => {
    const people = {
      child: makePerson({ id: 'child', parents: ['first', 'second'], children: [], spouses: [] }),
      first: makePerson({ id: 'first', parents: [], children: [], spouses: [] }),
      second: makePerson({ id: 'second', parents: [], children: ['child'], spouses: [] }),
      third: makePerson({ id: 'third', parents: [], children: [], spouses: [] }),
    };
    const repaired = applyDeltaOperationToFamily(people, makeOperation({ type: 'ADD_RELATION',
      payload: { focusId: 'child', existingId: 'first', type: 'parent' } }))!;
    expect(repaired.first.children).toEqual(['child']);
    expect(repaired.child.parents).toEqual(['first', 'second']);
    const extended = applyDeltaOperationToFamily(repaired, makeOperation({ type: 'ADD_RELATION',
      payload: { focusId: 'child', existingId: 'third', type: 'parent' } }))!;
    expect(extended.child.parents).toEqual(['first', 'second', 'third']);
    expect(extended.third.children).toEqual(['child']);
  });

  it.each(['parent', 'child', 'spouse'])('ignores self and missing remote %s endpoints', type => {
    const people = { first: makePerson({ id: 'first', parents: [], children: [], spouses: [] }) };
    for (const existingId of ['first', 'missing']) {
      expect(applyDeltaOperationToFamily(people, makeOperation({ type: 'ADD_RELATION',
        payload: { focusId: 'first', existingId, type },
      }))).toBe(people);
    }
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
