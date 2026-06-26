import type { ManuscriptOrderingStrategy, Person } from '../../../types';
import type { PublishingBranchRelationship } from './PublishingRelationshipAdapter';

export interface NarrativeOrderingInput {
  readonly rootPersonId: string;
  readonly people: Record<string, Person>;
  readonly relationships: readonly PublishingBranchRelationship[];
  readonly strategy?: ManuscriptOrderingStrategy;
  readonly customPersonOrder?: readonly string[];
}

function getDisplayName(person: Person): string {
  return [person.title, person.firstName, person.middleName, person.lastName]
    .filter(Boolean)
    .join(' ')
    .trim() || person.nickName || person.id;
}

function comparePeopleAlphabetically(a: Person, b: Person): number {
  return getDisplayName(a).localeCompare(getDisplayName(b));
}

function comparePeopleChronologically(a: Person, b: Person): number {
  const aDate = a.birthDate?.trim() || '';
  const bDate = b.birthDate?.trim() || '';
  if (aDate && bDate && aDate !== bDate) return aDate.localeCompare(bDate);
  if (aDate && !bDate) return -1;
  if (!aDate && bDate) return 1;
  return comparePeopleAlphabetically(a, b);
}

function sortIdsByPerson(
  people: Record<string, Person>,
  ids: Iterable<string>,
  strategy: 'alphabetical' | 'chronological' = 'chronological'
): string[] {
  return [...new Set(ids)]
    .filter((id) => Boolean(people[id]))
    .sort((a, b) => (
      strategy === 'alphabetical'
        ? comparePeopleAlphabetically(people[a], people[b])
        : comparePeopleChronologically(people[a], people[b])
    ));
}

export class NarrativeOrderingEngine {
  public static orderPeople(input: NarrativeOrderingInput): readonly string[] {
    const { rootPersonId, people, relationships, strategy = 'narrative' } = input;
    if (strategy === 'alphabetical') {
      return sortIdsByPerson(people, Object.keys(people), 'alphabetical');
    }
    if (strategy === 'chronological') {
      return sortIdsByPerson(people, Object.keys(people), 'chronological');
    }

    if (!people[rootPersonId]) {
      return sortIdsByPerson(people, Object.keys(people));
    }

    const childrenByParent = new Map<string, string[]>();
    const spousesByPerson = new Map<string, string[]>();

    relationships.forEach((relationship) => {
      if (relationship.type === 'parent' && relationship.parentId && relationship.childId) {
        const children = childrenByParent.get(relationship.parentId) ?? [];
        children.push(relationship.childId);
        childrenByParent.set(relationship.parentId, children);
        return;
      }

      if (relationship.type === 'spouse' && relationship.personId && relationship.spouseId) {
        const personSpouses = spousesByPerson.get(relationship.personId) ?? [];
        personSpouses.push(relationship.spouseId);
        spousesByPerson.set(relationship.personId, personSpouses);

        const spouseSpouses = spousesByPerson.get(relationship.spouseId) ?? [];
        spouseSpouses.push(relationship.personId);
        spousesByPerson.set(relationship.spouseId, spouseSpouses);
      }
    });

    const orderedIds: string[] = [];
    const visited = new Set<string>();

    const addPerson = (personId: string) => {
      if (!people[personId] || visited.has(personId)) return;
      visited.add(personId);
      orderedIds.push(personId);
    };

    const traverseFamily = (personId: string) => {
      if (!people[personId]) return;

      addPerson(personId);

      sortIdsByPerson(people, spousesByPerson.get(personId) ?? []).forEach(addPerson);
      sortIdsByPerson(people, childrenByParent.get(personId) ?? []).forEach((childId) => {
        traverseFamily(childId);
      });
    };

    traverseFamily(rootPersonId);

    const narrativeIds = [...orderedIds];
    if (strategy === 'custom') {
      orderedIds.length = 0;
      visited.clear();
      (input.customPersonOrder ?? []).forEach(addPerson);
      narrativeIds.forEach(addPerson);
    }

    sortIdsByPerson(people, Object.keys(people)).forEach(addPerson);
    return orderedIds;
  }
}
