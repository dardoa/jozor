import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import type { Person } from '../../types';
import { calculateHighlightedPath } from '../treeBranch';

const buildPerson = (overrides: Partial<Person>): Person => ({
  id: overrides.id || crypto.randomUUID(),
  ...DEFAULT_PERSON_TEMPLATE,
  ...overrides,
});

describe('calculateHighlightedPath', () => {
  it('returns undefined if rootId is missing or person does not exist', () => {
    expect(calculateHighlightedPath({}, undefined)).toBeUndefined();
    expect(calculateHighlightedPath({}, 'nonexistent')).toBeUndefined();
  });

  it('calculates path correctly for a standard tree without cycles', () => {
    const father = buildPerson({ id: 'father', gender: 'male', parents: [], children: ['child'] });
    const mother = buildPerson({ id: 'mother', gender: 'female', parents: [], children: ['child'] });
    const child = buildPerson({ id: 'child', parents: ['father', 'mother'], children: [] });

    const people = { father, mother, child };
    const path = calculateHighlightedPath(people, 'child');
    expect(path).toBeDefined();
    expect(path?.has('child')).toBe(true);
    expect(path?.has('father')).toBe(true);
    expect(path?.has('mother')).toBe(true);
  });

  it('safely handles and breaks infinite loops when directed cycles exist', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    // Person A is father of Person B, Person B is father of Person A (directed cycle)
    const personA = buildPerson({
      id: 'A',
      gender: 'male',
      parents: ['B'], // B is A's parent
      children: ['B'],
    });
    const personB = buildPerson({
      id: 'B',
      gender: 'male',
      parents: ['A'], // A is B's parent
      children: ['A'],
    });

    const people = { A: personA, B: personB };

    // This would freeze before adding the cycle guard
    const path = calculateHighlightedPath(people, 'A');
    expect(path).toBeDefined();
    expect(path?.has('A')).toBe(true);
    expect(path?.has('B')).toBe(true);
    expect(warnSpy).toHaveBeenCalledWith(
      '[calculateHighlightedPath] Directed cycle detected in paternal lineage:',
      'B'
    );
    warnSpy.mockRestore();
  });
});
