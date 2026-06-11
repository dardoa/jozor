import { describe, expect, it } from 'vitest';
import { calculateRelationship } from '../relationshipLogic';
import { Person } from '../../types';

describe('calculateRelationship', () => {
  // Construct a small family tree:
  // root (spouse: spouse1)
  //  ├── c1
  //  │    └── c1_child
  //  │         └── c1_grandchild
  //  └── c2
  //       └── gc2
  //            └── ggc2 (whose child is gggc2)
  const people: Record<string, Person> = {
    root: { id: 'root', parents: [], spouses: ['spouse1'] } as unknown as Person,
    spouse1: { id: 'spouse1', parents: [], spouses: ['root'] } as unknown as Person,
    c1: { id: 'c1', parents: ['root'], spouses: [] } as unknown as Person,
    c2: { id: 'c2', parents: ['root'], spouses: [] } as unknown as Person,
    c1_child: { id: 'c1_child', parents: ['c1'], spouses: [] } as unknown as Person,
    gc2: { id: 'gc2', parents: ['c2'], spouses: [] } as unknown as Person,
    c1_grandchild: { id: 'c1_grandchild', parents: ['c1_child'], spouses: [] } as unknown as Person,
    ggc2: { id: 'ggc2', parents: ['gc2'], spouses: [] } as unknown as Person,
    gggc2: { id: 'gggc2', parents: ['ggc2'], spouses: [] } as unknown as Person,
    unconnected: { id: 'unconnected', parents: [], spouses: [] } as unknown as Person,
  };

  it('handles same person comparison in both English and Arabic', () => {
    expect(calculateRelationship('root', 'root', people, 'en')).toEqual({
      text: 'Same person',
    });
    expect(calculateRelationship('root', 'root', people, 'ar')).toEqual({
      text: 'نفس الشخص',
    });
  });

  it('handles spouse relationships in both English and Arabic', () => {
    expect(calculateRelationship('root', 'spouse1', people, 'en')).toEqual({
      text: 'Spouse',
    });
    expect(calculateRelationship('root', 'spouse1', people, 'ar')).toEqual({
      text: 'زوج/زوجة',
    });
  });

  it('handles unconnected people in both English and Arabic', () => {
    expect(calculateRelationship('root', 'unconnected', people, 'en')).toEqual({
      text: 'No direct relationship found',
    });
    expect(calculateRelationship('root', 'unconnected', people, 'ar')).toEqual({
      text: 'لا توجد قرابة مباشرة',
    });
  });

  it('handles direct ancestors and descendants (Child, Grandchild, Great-Grandchild)', () => {
    // Parent to Child
    expect(calculateRelationship('root', 'c1', people, 'en')).toEqual({
      text: 'Child',
      commonAncestor: 'root',
    });
    expect(calculateRelationship('root', 'c1', people, 'ar')).toEqual({
      text: 'ابن/ابنة',
      commonAncestor: 'root',
    });

    // Parent to Grandchild
    expect(calculateRelationship('root', 'gc2', people, 'en')).toEqual({
      text: 'Grandchild',
      commonAncestor: 'root',
    });

    // Parent to Great-Grandchild
    expect(calculateRelationship('root', 'ggc2', people, 'en')).toEqual({
      text: 'Great-Grandchild',
      commonAncestor: 'root',
    });
  });

  it('handles direct ancestors (Parent, Grandparent, Great-Grandparent)', () => {
    // Child to Parent
    expect(calculateRelationship('c1', 'root', people, 'en')).toEqual({
      text: 'Parent',
      commonAncestor: 'root',
    });
    expect(calculateRelationship('c1', 'root', people, 'ar')).toEqual({
      text: 'أب/أم',
      commonAncestor: 'root',
    });

    // Grandchild to Grandparent
    expect(calculateRelationship('gc2', 'root', people, 'en')).toEqual({
      text: 'Grandparent',
      commonAncestor: 'root',
    });

    // Great-Grandchild to Great-Grandparent
    expect(calculateRelationship('ggc2', 'root', people, 'en')).toEqual({
      text: 'Great-Grandparent',
      commonAncestor: 'root',
    });
  });

  it('handles siblings (same parents)', () => {
    expect(calculateRelationship('c1', 'c2', people, 'en')).toEqual({
      text: 'Sibling',
      commonAncestor: 'root',
    });
    expect(calculateRelationship('c1', 'c2', people, 'ar')).toEqual({
      text: 'أخ/أخت',
      commonAncestor: 'root',
    });
  });

  it('handles Aunt/Uncle and Niece/Nephew', () => {
    // Aunt/Uncle to Niece/Nephew (c1 is aunt/uncle of gc2)
    expect(calculateRelationship('c1', 'gc2', people, 'en')).toEqual({
      text: 'Niece/Nephew',
      commonAncestor: 'root',
    });
    expect(calculateRelationship('c1', 'gc2', people, 'ar')).toEqual({
      text: 'ابن أخ/أخت',
      commonAncestor: 'root',
    });

    // Niece/Nephew to Aunt/Uncle (gc2 to c1)
    expect(calculateRelationship('gc2', 'c1', people, 'en')).toEqual({
      text: 'Aunt/Uncle',
      commonAncestor: 'root',
    });
    expect(calculateRelationship('gc2', 'c1', people, 'ar')).toEqual({
      text: 'عم/خال/عمة/خالة',
      commonAncestor: 'root',
    });
  });

  it('handles first and second cousins', () => {
    // First Cousin
    expect(calculateRelationship('c1_child', 'gc2', people, 'en')).toEqual({
      text: 'First Cousin',
      commonAncestor: 'root',
    });
    expect(calculateRelationship('c1_child', 'gc2', people, 'ar')).toEqual({
      text: 'ابن عم/خال',
      commonAncestor: 'root',
    });

    // Second Cousin
    expect(calculateRelationship('c1_grandchild', 'ggc2', people, 'en')).toEqual({
      text: 'Second Cousin',
      commonAncestor: 'root',
    });
    expect(calculateRelationship('c1_grandchild', 'ggc2', people, 'ar')).toEqual({
      text: 'ابن عم (درجة ثانية)',
      commonAncestor: 'root',
    });
  });

  it('handles distant cousins and general relatives fallback', () => {
    // Distant Cousin (both distances from common ancestor are > 2)
    expect(calculateRelationship('c1_grandchild', 'gggc2', people, 'en')).toEqual({
      text: 'Distant Cousin',
      commonAncestor: 'root',
    });
    expect(calculateRelationship('c1_grandchild', 'gggc2', people, 'ar')).toEqual({
      text: 'قريب',
      commonAncestor: 'root',
    });

    // Relative fallback when one distance is <= 2 and the other is > 2, but no specific rule matches
    // e.g. c1 (dist 1) and ggc2 (dist 3)
    expect(calculateRelationship('c1', 'ggc2', people, 'en')).toEqual({
      text: 'Relative',
      commonAncestor: 'root',
    });
    expect(calculateRelationship('c1', 'ggc2', people, 'ar')).toEqual({
      text: 'قريب',
      commonAncestor: 'root',
    });
  });
});
