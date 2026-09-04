import { describe, expect, it } from 'vitest';

import { createPerson } from '../../../utils/familyLogic';
import { findKindiRelationshipPath } from '../logic/kindiRelationshipPathEngine';

const person = (
  id: string,
  firstName: string,
  relations: Partial<Pick<ReturnType<typeof createPerson>, 'parents' | 'children' | 'spouses'>> = {}
) => ({
  ...createPerson(),
  id,
  firstName,
  lastName: 'العائلة',
  ...relations,
});

describe('kindiRelationshipPathEngine', () => {
  it('repairs one-way parent links and returns a deterministic ancestor path', () => {
    const people = [
      person('grandfather', 'حسن', { children: ['father'] }),
      person('father', 'محمود', { children: ['sami'] }),
      person('sami', 'سامي'),
    ];

    const first = findKindiRelationshipPath({
      fromPersonId: 'sami',
      toPersonId: 'grandfather',
      people,
      language: 'en',
    });
    const second = findKindiRelationshipPath({
      fromPersonId: 'sami',
      toPersonId: 'grandfather',
      people,
      language: 'en',
    });

    expect(first?.people.map((item) => item.id)).toEqual(['sami', 'father', 'grandfather']);
    expect(first?.steps).toEqual(['parent', 'parent']);
    expect(first?.relationshipText).toBe('Grandparent');
    expect(second).toEqual(first);
  });

  it('finds the shortest path through spouses without inventing a direct blood relationship', () => {
    const people = [
      person('sami', 'سامي', { spouses: ['maryam'] }),
      person('maryam', 'مريم', { parents: ['her-father'] }),
      person('her-father', 'إبراهيم'),
    ];

    const result = findKindiRelationshipPath({
      fromPersonId: 'sami',
      toPersonId: 'her-father',
      people,
      language: 'ar',
    });

    expect(result?.people.map((item) => item.id)).toEqual(['sami', 'maryam', 'her-father']);
    expect(result?.steps).toEqual(['spouse', 'parent']);
    expect(result?.relationshipText).toBe('لا توجد قرابة مباشرة');
  });

  it('handles the same person, disconnected records, and unknown IDs safely', () => {
    const people = [person('sami', 'سامي'), person('other', 'بعيد')];

    expect(findKindiRelationshipPath({
      fromPersonId: 'sami', toPersonId: 'sami', people, language: 'ar',
    })).toMatchObject({ people: [{ id: 'sami' }], steps: [], relationshipText: 'نفس الشخص' });
    expect(findKindiRelationshipPath({
      fromPersonId: 'sami', toPersonId: 'other', people, language: 'ar',
    })).toBeNull();
    expect(findKindiRelationshipPath({
      fromPersonId: 'missing', toPersonId: 'other', people, language: 'ar',
    })).toBeNull();
  });

  it('terminates on malformed cycles and keeps the shortest route', () => {
    const people = [
      person('a', 'ألف', { parents: ['b'], children: ['c'] }),
      person('b', 'باء', { parents: ['c'] }),
      person('c', 'جيم', { children: ['a', 'target'] }),
      person('target', 'هدف'),
    ];

    const result = findKindiRelationshipPath({
      fromPersonId: 'a', toPersonId: 'target', people, language: 'en',
    });

    expect(result?.people.map((item) => item.id)).toEqual(['a', 'c', 'target']);
    expect(result?.steps).toHaveLength(2);
  });
});
