import type { Person } from '../types';

export type RawPerson = Person;

export interface FamilyUnitSemantics {
  missingParentSide: 'none' | 'one-missing';
  unionType: 'parental' | 'single-parent' | 'partnership';
}

export interface PersonGraphNode {
  personId: string;
  parentUnitId: string | null;
  ownUnitIds: string[];
  familyIds: string[];
}

export interface FamilyUnit {
  familyId: string;
  parentIds: string[];
  childIds: string[];
  semantics: FamilyUnitSemantics;
}

export interface FamilyGraph {
  persons: Record<string, PersonGraphNode>;
  families: Record<string, FamilyUnit>;
}

export type PersonGraphRef = PersonGraphNode;

const FAMILY_ID_PREFIX = 'family';

function normalizePeopleInput(people: Record<string, RawPerson> | RawPerson[]): Record<string, RawPerson> {
  if (Array.isArray(people)) {
    return Object.fromEntries(people.map((person) => [person.id, person]));
  }

  return people;
}

function toSortedUniqueIds(ids: Iterable<string>, people: Record<string, RawPerson>): string[] {
  return [...new Set(Array.from(ids).filter((id) => Boolean(id) && Boolean(people[id])))].sort();
}

function buildFamilyId(parentIds: string[]): string {
  return `${FAMILY_ID_PREFIX}:${parentIds.join('__')}`;
}

function deriveFamilySemantics(parentIds: string[], childIds: string[]): FamilyUnitSemantics {
  if (childIds.length === 0) {
    return {
      missingParentSide: parentIds.length >= 2 ? 'none' : 'one-missing',
      unionType: 'partnership',
    };
  }

  if (parentIds.length <= 1) {
    return {
      missingParentSide: 'one-missing',
      unionType: 'single-parent',
    };
  }

  return {
    missingParentSide: 'none',
    unionType: 'parental',
  };
}

function ensurePersonNode(
  persons: Record<string, PersonGraphNode>,
  personId: string
): PersonGraphNode {
  if (!persons[personId]) {
    persons[personId] = {
      personId,
      parentUnitId: null,
      ownUnitIds: [],
      familyIds: [],
    };
  }

  return persons[personId];
}

function addUniqueSorted(ids: string[], value: string): void {
  if (!ids.includes(value)) {
    ids.push(value);
    ids.sort();
  }
}

function ensureFamily(
  families: Record<string, FamilyUnit>,
  persons: Record<string, PersonGraphNode>,
  parentIds: string[]
): FamilyUnit {
  const familyId = buildFamilyId(parentIds);

  if (!families[familyId]) {
    families[familyId] = {
      familyId,
      parentIds: [...parentIds],
      childIds: [],
      semantics: deriveFamilySemantics(parentIds, []),
    };
  }

  parentIds.forEach((parentId) => {
    const node = ensurePersonNode(persons, parentId);
    addUniqueSorted(node.ownUnitIds, familyId);
    addUniqueSorted(node.familyIds, familyId);
  });

  return families[familyId];
}

function syncFamilySemantics(family: FamilyUnit): void {
  family.semantics = deriveFamilySemantics(family.parentIds, family.childIds);
}

export function buildFamilyGraph(peopleInput: Record<string, RawPerson> | RawPerson[]): FamilyGraph {
  const people = normalizePeopleInput(peopleInput);
  const persons: Record<string, PersonGraphNode> = {};
  const families: Record<string, FamilyUnit> = {};
  const reverseParentsByChild = new Map<string, Set<string>>();

  Object.keys(people).forEach((personId) => {
    ensurePersonNode(persons, personId);
  });

  Object.values(people).forEach((person) => {
    (person.children ?? []).forEach((childId) => {
      if (!people[childId]) return;
      const parentSet = reverseParentsByChild.get(childId) ?? new Set<string>();
      parentSet.add(person.id);
      reverseParentsByChild.set(childId, parentSet);
    });
  });

  Object.values(people).forEach((person) => {
    const declaredParents = person.parents ?? [];
    const inferredParents = reverseParentsByChild.get(person.id) ?? new Set<string>();
    const parentIds = toSortedUniqueIds([...declaredParents, ...inferredParents], people);

    if (parentIds.length === 0) return;

    const family = ensureFamily(families, persons, parentIds);
    addUniqueSorted(family.childIds, person.id);
    syncFamilySemantics(family);

    const personNode = ensurePersonNode(persons, person.id);
    personNode.parentUnitId = family.familyId;
    addUniqueSorted(personNode.familyIds, family.familyId);
  });

  Object.values(people).forEach((person) => {
    const spouseIds = toSortedUniqueIds(person.spouses ?? [], people);

    spouseIds.forEach((spouseId) => {
      const parentIds = toSortedUniqueIds([person.id, spouseId], people);
      if (parentIds.length < 2) return;

      const family = ensureFamily(families, persons, parentIds);
      syncFamilySemantics(family);
    });
  });

  Object.values(families).forEach((family) => {
    syncFamilySemantics(family);
  });

  return {
    persons,
    families,
  };
}

export function stringifyFamilyGraph(graph: FamilyGraph): string {
  return JSON.stringify(graph, null, 2);
}
