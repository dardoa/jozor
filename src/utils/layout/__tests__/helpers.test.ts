import { describe, expect, it } from 'vitest';
import { getBirthYear, findRootAncestor } from '../helpers';
import { Person } from '../../../types';

describe('getBirthYear', () => {
  it('returns 9999 if birthDate is missing or falsy', () => {
    expect(getBirthYear({} as Person)).toBe(9999);
    expect(getBirthYear({ birthDate: '' } as Person)).toBe(9999);
    expect(getBirthYear({ birthDate: null } as unknown as Person)).toBe(9999);
    expect(getBirthYear({ birthDate: undefined } as unknown as Person)).toBe(9999);
  });

  it('returns the year when birthDate is a simple year string', () => {
    expect(getBirthYear({ birthDate: '1990' } as Person)).toBe(1990);
    expect(getBirthYear({ birthDate: ' 2026 ' } as Person)).toBe(2026);
  });

  it('returns the year when birthDate is an ISO date string (YYYY-MM-DD)', () => {
    expect(getBirthYear({ birthDate: '1985-06-15' } as Person)).toBe(1985);
    expect(getBirthYear({ birthDate: '2026-12-31' } as Person)).toBe(2026);
  });

  it('returns the year when birthDate is in YYYY-MM format', () => {
    expect(getBirthYear({ birthDate: '1975-10' } as Person)).toBe(1975);
  });

  it('returns 9999 for invalid birthDate strings', () => {
    expect(getBirthYear({ birthDate: 'completely-invalid' } as Person)).toBe(9999);
  });
});

describe('findRootAncestor', () => {
  it('returns startId if the person does not exist or has no parents', () => {
    const people: Record<string, Person> = {};
    expect(findRootAncestor(people, 'person_1')).toBe('person_1');

    people['person_1'] = { id: 'person_1', parents: [] } as unknown as Person;
    expect(findRootAncestor(people, 'person_1')).toBe('person_1');
  });

  it('traverses up the parents list to the root ancestor', () => {
    const people: Record<string, Person> = {
      person_1: { id: 'person_1', parents: ['person_2'] } as unknown as Person,
      person_2: { id: 'person_2', parents: ['person_3'] } as unknown as Person,
      person_3: { id: 'person_3', parents: [] } as unknown as Person,
    };
    expect(findRootAncestor(people, 'person_1')).toBe('person_3');
  });

  it('ignores missing parents (dangling references) and stops traversal', () => {
    const people: Record<string, Person> = {
      person_1: { id: 'person_1', parents: ['person_2'] } as unknown as Person,
      // person_2 does not exist in people
    };
    expect(findRootAncestor(people, 'person_1')).toBe('person_1');
  });

  it('detects cycles (A -> B -> A) and breaks out of the loop', () => {
    const people: Record<string, Person> = {
      person_A: { id: 'person_A', parents: ['person_B'] } as unknown as Person,
      person_B: { id: 'person_B', parents: ['person_A'] } as unknown as Person,
    };
    const root = findRootAncestor(people, 'person_A');
    expect(['person_A', 'person_B']).toContain(root);
  });

  it('breaks out of the loop when recursion depth exceeds 50', () => {
    const people: Record<string, Person> = {};
    for (let i = 1; i <= 60; i++) {
      people[`person_${i}`] = {
        id: `person_${i}`,
        parents: [`person_${i + 1}`],
      } as unknown as Person;
    }
    const root = findRootAncestor(people, 'person_1');
    expect(root).toBe('person_51');
  });
});
