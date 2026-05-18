
import { describe, expect, it } from 'vitest';
import type { Person } from '../../types';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import { performAddChild, performAddParent } from '../treeOperations';

const makePerson = (overrides: Partial<Person>): Person => ({
  id: overrides.id || crypto.randomUUID(),
  ...DEFAULT_PERSON_TEMPLATE,
  ...overrides,
});

describe('treeOperations relationship rules', () => {
  it('auto-links the two parents as spouses when adding the second parent', () => {
    const child = makePerson({
      id: 'child-1',
      firstName: 'Child',
      lastName: 'Family',
      gender: 'male',
      parents: ['parent-1'],
    });

    const existingParent = makePerson({
      id: 'parent-1',
      firstName: 'Existing',
      lastName: 'Family',
      gender: 'female',
      children: ['child-1'],
      spouses: [],
    });

    const result = performAddParent(
      {
        'child-1': child,
        'parent-1': existingParent,
      },
      'child-1',
      'male'
    );

    expect(result).not.toBeNull();
    const { updatedPeople, newId } = result!;

    expect(updatedPeople['child-1'].parents).toContain(newId);
    expect(updatedPeople[newId].children).toContain('child-1');
    expect(updatedPeople[newId].spouses).toContain('parent-1');
    expect(updatedPeople['parent-1'].spouses).toContain(newId);
  });

  it('uses the only spouse automatically as the second parent when adding a child', () => {
    const parent = makePerson({
      id: 'parent-1',
      firstName: 'Father',
      lastName: 'Family',
      gender: 'male',
      spouses: ['parent-2'],
      children: [],
    });

    const spouse = makePerson({
      id: 'parent-2',
      firstName: 'Mother',
      lastName: 'Family',
      gender: 'female',
      spouses: ['parent-1'],
      children: [],
    });

    const result = performAddChild(
      {
        'parent-1': parent,
        'parent-2': spouse,
      },
      'parent-1',
      'female'
    );

    expect(result).not.toBeNull();
    const { updatedPeople, newId } = result!;

    expect(updatedPeople[newId].parents).toEqual(['parent-1', 'parent-2']);
    expect(updatedPeople['parent-1'].children).toContain(newId);
    expect(updatedPeople['parent-2'].children).toContain(newId);
  });

  it('uses the explicitly selected spouse when adding a child for a person with multiple spouses', () => {
    const parent = makePerson({
      id: 'parent-1',
      firstName: 'Parent',
      lastName: 'Family',
      gender: 'female',
      spouses: ['spouse-1', 'spouse-2'],
      children: [],
    });

    const spouseOne = makePerson({
      id: 'spouse-1',
      firstName: 'Older',
      lastName: 'Family',
      gender: 'male',
      spouses: ['parent-1'],
      children: [],
    });

    const spouseTwo = makePerson({
      id: 'spouse-2',
      firstName: 'Selected',
      lastName: 'Family',
      gender: 'male',
      spouses: ['parent-1'],
      children: [],
    });

    const result = performAddChild(
      {
        'parent-1': parent,
        'spouse-1': spouseOne,
        'spouse-2': spouseTwo,
      },
      'parent-1',
      'male',
      'spouse-2'
    );

    expect(result).not.toBeNull();
    const { updatedPeople, newId } = result!;

    expect(updatedPeople[newId].parents).toEqual(['parent-1', 'spouse-2']);
    expect(updatedPeople['spouse-2'].children).toContain(newId);
    expect(updatedPeople['spouse-1'].children).not.toContain(newId);
  });
});

