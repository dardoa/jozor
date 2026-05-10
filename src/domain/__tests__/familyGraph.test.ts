// @ts-nocheck
import { describe, expect, it } from 'vitest';
import type { Person } from '../../types';
import { buildFamilyGraph } from '../familyGraph';

function createPerson(overrides: Partial<Person> & Pick<Person, 'id'>): Person {
  return {
    id: overrides.id,
    title: '',
    firstName: '',
    middleName: '',
    lastName: '',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '',
    birthPlace: '',
    birthSource: '',
    marriageDate: '',
    marriagePlace: '',
    deathDate: '',
    deathPlace: '',
    deathSource: '',
    burialPlace: '',
    residence: '',
    isDeceased: false,
    profession: '',
    company: '',
    interests: '',
    bio: '',
    gallery: [],
    voiceNotes: [],
    sources: [],
    events: [],
    email: '',
    website: '',
    blog: '',
    address: '',
    parents: [],
    spouses: [],
    children: [],
    ...overrides,
  };
}

describe('buildFamilyGraph', () => {
  it('normalizes a nuclear family into one parental family unit', () => {
    const people: Record<string, Person> = {
      father: createPerson({ id: 'father', spouses: ['mother'], children: ['child1', 'child2'] }),
      mother: createPerson({
        id: 'mother',
        spouses: ['father'],
        children: ['child1', 'child2'],
        gender: 'female',
      }),
      child1: createPerson({ id: 'child1', parents: ['father', 'mother'] }),
      child2: createPerson({ id: 'child2', parents: ['father', 'mother'] }),
    };

    const graph = buildFamilyGraph(people);

    expect(graph.families).toEqual({
      'family:father__mother': {
        familyId: 'family:father__mother',
        parentIds: ['father', 'mother'],
        childIds: ['child1', 'child2'],
        semantics: {
          missingParentSide: 'none',
          unionType: 'parental',
        },
      },
    });
    expect(graph.persons.father).toEqual({
      personId: 'father',
      parentUnitId: null,
      ownUnitIds: ['family:father__mother'],
      familyIds: ['family:father__mother'],
    });
    expect(graph.persons.child1).toEqual({
      personId: 'child1',
      parentUnitId: 'family:father__mother',
      ownUnitIds: [],
      familyIds: ['family:father__mother'],
    });
  });

  it('creates a single-parent family unit when only one parent is known', () => {
    const people: Record<string, Person> = {
      parent: createPerson({ id: 'parent', children: ['child'] }),
      child: createPerson({ id: 'child', parents: ['parent'] }),
    };

    const graph = buildFamilyGraph(people);

    expect(graph.families).toEqual({
      'family:parent': {
        familyId: 'family:parent',
        parentIds: ['parent'],
        childIds: ['child'],
        semantics: {
          missingParentSide: 'one-missing',
          unionType: 'single-parent',
        },
      },
    });
    expect(graph.persons.parent.ownUnitIds).toEqual(['family:parent']);
    expect(graph.persons.child.parentUnitId).toBe('family:parent');
  });

  it('makes a person bridge multiple family units across multiple partners', () => {
    const people: Record<string, Person> = {
      alex: createPerson({
        id: 'alex',
        spouses: ['sam', 'jordan'],
        children: ['casey', 'morgan'],
      }),
      sam: createPerson({ id: 'sam', spouses: ['alex'], children: ['casey'], gender: 'female' }),
      jordan: createPerson({
        id: 'jordan',
        spouses: ['alex'],
        children: ['morgan'],
        gender: 'female',
      }),
      casey: createPerson({ id: 'casey', parents: ['alex', 'sam'] }),
      morgan: createPerson({ id: 'morgan', parents: ['alex', 'jordan'] }),
    };

    const graph = buildFamilyGraph(people);

    expect(Object.keys(graph.families).sort()).toEqual([
      'family:alex__jordan',
      'family:alex__sam',
    ]);
    expect(graph.persons.alex.ownUnitIds).toEqual(['family:alex__jordan', 'family:alex__sam']);
    expect(graph.persons.casey.parentUnitId).toBe('family:alex__sam');
    expect(graph.persons.morgan.parentUnitId).toBe('family:alex__jordan');
    expect(graph.families['family:alex__sam'].childIds).toEqual(['casey']);
    expect(graph.families['family:alex__jordan'].childIds).toEqual(['morgan']);
  });

  it('normalizes cousin marriage as one downstream family unit with convergent branches', () => {
    const people: Record<string, Person> = {
      grandparent: createPerson({
        id: 'grandparent',
        spouses: ['grandma'],
        children: ['aunt', 'parent'],
      }),
      grandma: createPerson({
        id: 'grandma',
        gender: 'female',
        spouses: ['grandparent'],
        children: ['aunt', 'parent'],
      }),
      aunt: createPerson({ id: 'aunt', gender: 'female', parents: ['grandparent', 'grandma'], children: ['cousin'] }),
      parent: createPerson({ id: 'parent', parents: ['grandparent', 'grandma'], children: ['child'] }),
      cousin: createPerson({
        id: 'cousin',
        gender: 'female',
        parents: ['aunt'],
        spouses: ['child'],
        children: ['shared'],
      }),
      child: createPerson({
        id: 'child',
        parents: ['parent'],
        spouses: ['cousin'],
        children: ['shared'],
      }),
      shared: createPerson({ id: 'shared', parents: ['child', 'cousin'] }),
    };

    const graph = buildFamilyGraph(people);

    expect(Object.keys(graph.families).sort()).toEqual([
      'family:aunt',
      'family:child__cousin',
      'family:grandma__grandparent',
      'family:parent',
    ]);
    expect(graph.persons.child.parentUnitId).toBe('family:parent');
    expect(graph.persons.cousin.parentUnitId).toBe('family:aunt');
    expect(graph.persons.shared.parentUnitId).toBe('family:child__cousin');
    expect(graph.persons.child.ownUnitIds).toContain('family:child__cousin');
    expect(graph.persons.cousin.ownUnitIds).toContain('family:child__cousin');
    expect(graph.families['family:child__cousin']).toEqual({
      familyId: 'family:child__cousin',
      parentIds: ['child', 'cousin'],
      childIds: ['shared'],
      semantics: {
        missingParentSide: 'none',
        unionType: 'parental',
      },
    });
  });

  it('keeps spouse-only partnerships as family units even without children', () => {
    const people: Record<string, Person> = {
      one: createPerson({ id: 'one', spouses: ['two'] }),
      two: createPerson({ id: 'two', spouses: ['one'] }),
    };

    const graph = buildFamilyGraph(people);

    expect(graph.families).toEqual({
      'family:one__two': {
        familyId: 'family:one__two',
        parentIds: ['one', 'two'],
        childIds: [],
        semantics: {
          missingParentSide: 'none',
          unionType: 'partnership',
        },
      },
    });
  });

  it('accepts array input and still builds the same logical graph', () => {
    const people = [
      createPerson({ id: 'mother', children: ['child'], gender: 'female' }),
      createPerson({ id: 'child' }),
    ];

    const graph = buildFamilyGraph(people);

    expect(graph.families).toEqual({
      'family:mother': {
        familyId: 'family:mother',
        parentIds: ['mother'],
        childIds: ['child'],
        semantics: {
          missingParentSide: 'one-missing',
          unionType: 'single-parent',
        },
      },
    });
    expect(graph.persons.child.parentUnitId).toBe('family:mother');
  });
});

