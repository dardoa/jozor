import type { Language } from '../../../types/common';
import type { Person } from '../../../types/person';
import { getFullName } from '../../../utils/familyLogic';
import { calculateRelationship } from '../../../utils/relationshipLogic';

export type KindiRelationshipPathStep = 'parent' | 'child' | 'spouse';

export interface KindiRelationshipPathResult {
  people: Person[];
  steps: KindiRelationshipPathStep[];
  relationshipText: string;
  commonAncestor?: Person;
}

interface FindKindiRelationshipPathArgs {
  fromPersonId: string;
  toPersonId: string;
  people: readonly Person[];
  language: Language;
}

interface PathPredecessor {
  fromPersonId: string;
  step: KindiRelationshipPathStep;
}

const addUnique = (items: string[], value: string) => {
  if (!items.includes(value)) items.push(value);
};

const normalizeRelationshipDirections = (people: readonly Person[]): Record<string, Person> => {
  const normalized = Object.fromEntries(people.map((person) => [
    person.id,
    {
      ...person,
      parents: Array.from(new Set(person.parents ?? [])),
      children: Array.from(new Set(person.children ?? [])),
      spouses: Array.from(new Set(person.spouses ?? [])),
    },
  ])) as Record<string, Person>;

  for (const person of people) {
    const normalizedPerson = normalized[person.id];
    if (!normalizedPerson) continue;

    for (const parentId of person.parents ?? []) {
      const parent = normalized[parentId];
      if (!parent || parent.id === normalizedPerson.id) continue;
      addUnique(normalizedPerson.parents, parent.id);
      addUnique(parent.children, normalizedPerson.id);
    }

    for (const childId of person.children ?? []) {
      const child = normalized[childId];
      if (!child || child.id === normalizedPerson.id) continue;
      addUnique(normalizedPerson.children, child.id);
      addUnique(child.parents, normalizedPerson.id);
    }

    for (const spouseId of person.spouses ?? []) {
      const spouse = normalized[spouseId];
      if (!spouse || spouse.id === normalizedPerson.id) continue;
      addUnique(normalizedPerson.spouses, spouse.id);
      addUnique(spouse.spouses, normalizedPerson.id);
    }
  }

  return normalized;
};

const buildAdjacency = (people: Record<string, Person>) => {
  const adjacency = new Map<string, Map<string, KindiRelationshipPathStep>>();
  const ensure = (personId: string) => {
    const existing = adjacency.get(personId);
    if (existing) return existing;
    const created = new Map<string, KindiRelationshipPathStep>();
    adjacency.set(personId, created);
    return created;
  };
  const connect = (
    fromPersonId: string,
    toPersonId: string,
    step: KindiRelationshipPathStep
  ) => {
    const connections = ensure(fromPersonId);
    if (!connections.has(toPersonId)) connections.set(toPersonId, step);
  };

  for (const person of Object.values(people).sort((left, right) => left.id.localeCompare(right.id))) {
    ensure(person.id);
    for (const parentId of person.parents) {
      if (!people[parentId]) continue;
      connect(person.id, parentId, 'parent');
      connect(parentId, person.id, 'child');
    }
    for (const spouseId of person.spouses) {
      if (!people[spouseId]) continue;
      connect(person.id, spouseId, 'spouse');
      connect(spouseId, person.id, 'spouse');
    }
  }

  return adjacency;
};

const personSortKey = (person: Person): string =>
  `${getFullName(person).normalize('NFKD').toLocaleLowerCase()}\u0000${person.id}`;

export const findKindiRelationshipPath = ({
  fromPersonId,
  toPersonId,
  people,
  language,
}: FindKindiRelationshipPathArgs): KindiRelationshipPathResult | null => {
  const normalizedPeople = normalizeRelationshipDirections(people);
  const fromPerson = normalizedPeople[fromPersonId];
  const toPerson = normalizedPeople[toPersonId];
  if (!fromPerson || !toPerson) return null;

  const relationship = calculateRelationship(fromPersonId, toPersonId, normalizedPeople, language);
  if (fromPersonId === toPersonId) {
    return {
      people: [fromPerson],
      steps: [],
      relationshipText: relationship.text,
    };
  }

  const adjacency = buildAdjacency(normalizedPeople);
  const visited = new Set([fromPersonId]);
  const predecessors = new Map<string, PathPredecessor>();
  const queue = [fromPersonId];
  let queueIndex = 0;

  while (queueIndex < queue.length && !visited.has(toPersonId)) {
    const currentPersonId = queue[queueIndex];
    queueIndex += 1;
    const neighbors = Array.from(adjacency.get(currentPersonId)?.entries() ?? [])
      .sort(([leftId], [rightId]) => {
        const left = normalizedPeople[leftId];
        const right = normalizedPeople[rightId];
        return personSortKey(left).localeCompare(personSortKey(right));
      });

    for (const [neighborId, step] of neighbors) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      predecessors.set(neighborId, { fromPersonId: currentPersonId, step });
      queue.push(neighborId);
    }
  }

  if (!visited.has(toPersonId)) return null;

  const reversedPersonIds = [toPersonId];
  const reversedSteps: KindiRelationshipPathStep[] = [];
  let currentPersonId = toPersonId;
  while (currentPersonId !== fromPersonId) {
    const predecessor = predecessors.get(currentPersonId);
    if (!predecessor) return null;
    reversedSteps.push(predecessor.step);
    currentPersonId = predecessor.fromPersonId;
    reversedPersonIds.push(currentPersonId);
  }

  const pathPeople = reversedPersonIds
    .reverse()
    .map((personId) => normalizedPeople[personId]);
  const commonAncestor = relationship.commonAncestor
    ? normalizedPeople[relationship.commonAncestor]
    : undefined;

  return {
    people: pathPeople,
    steps: reversedSteps.reverse(),
    relationshipText: relationship.text,
    ...(commonAncestor ? { commonAncestor } : {}),
  };
};
