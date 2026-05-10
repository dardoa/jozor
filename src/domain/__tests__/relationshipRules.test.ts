import { describe, expect, it } from 'vitest';
import type { Person } from '../../types';
import { DEFAULT_PERSON_TEMPLATE } from '../../constants';
import {
  getSelectableCoParents,
  resolveCoParentForLinkedChild,
  resolveCoParentForNewChild,
  resolveOtherParentForLinkedParent,
  resolveSpouseForNewParent,
} from '../relationshipRules';

const buildPerson = (id: string, overrides: Partial<Person> = {}): Person => ({
  id,
  ...DEFAULT_PERSON_TEMPLATE,
  firstName: id,
  ...overrides,
});

describe('relationshipRules', () => {
  it('returns selectable co-parents only for child relationships', () => {
    const people = {
      p1: buildPerson('p1', { spouses: ['p2', 'p3'] }),
      p2: buildPerson('p2'),
      p3: buildPerson('p3'),
    };

    expect(getSelectableCoParents(people, 'p1', 'child').map((person) => person.id)).toEqual(['p2', 'p3']);
    expect(getSelectableCoParents(people, 'p1', 'parent')).toEqual([]);
  });

  it('resolves spouse and co-parent fallbacks from the created people shape', () => {
    const newParent = buildPerson('parent-new', { spouses: ['parent-existing'] });
    const newChild = buildPerson('child-new', { parents: ['focus', 'co-parent'] });

    expect(resolveSpouseForNewParent(newParent)).toBe('parent-existing');
    expect(resolveSpouseForNewParent(newParent, 'manual-parent')).toBe('manual-parent');

    expect(resolveCoParentForNewChild(newChild, 'focus')).toBe('co-parent');
    expect(resolveCoParentForNewChild(newChild, 'focus', 'manual-parent')).toBe('manual-parent');
  });

  it('resolves linked parent and child helpers from existing people graph', () => {
    const people = {
      focus: buildPerson('focus', { parents: ['parent-a'], spouses: ['spouse-a'] }),
      child: buildPerson('child', { parents: ['focus'] }),
      'parent-a': buildPerson('parent-a'),
      'spouse-a': buildPerson('spouse-a'),
    };

    expect(resolveOtherParentForLinkedParent(people, 'focus')).toBe('parent-a');
    expect(resolveOtherParentForLinkedParent(people, 'focus', 'manual-parent')).toBe('manual-parent');

    expect(resolveCoParentForLinkedChild(people, 'focus', 'child')).toBe('spouse-a');
    expect(resolveCoParentForLinkedChild(people, 'focus', 'child', 'manual-spouse')).toBe('manual-spouse');
  });
});
