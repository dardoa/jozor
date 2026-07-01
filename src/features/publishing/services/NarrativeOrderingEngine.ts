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
    return this.orderPeopleWithMetadata(input).orderedIds;
  }

  public static orderPeopleWithMetadata(input: NarrativeOrderingInput): NarrativeOrderingResult {
    const { rootPersonId, people, relationships, strategy = 'narrative' } = input;
    const orderedIds: string[] = [];
    const visited = new Set<string>();
    const metadata: Record<string, NarrativePersonMetadata> = {};

    const addPerson = (
      personId: string,
      meta?: { generation: number; branchPath: readonly string[]; relationshipToRoot: string }
    ) => {
      if (!people[personId] || visited.has(personId)) return;
      visited.add(personId);
      orderedIds.push(personId);
      if (meta) {
        metadata[personId] = meta;
      } else {
        // Fallback default metadata for items added outside tree traversal
        metadata[personId] = {
          generation: 0,
          branchPath: [],
          relationshipToRoot: 'relative',
        };
      }
    };

    if (strategy === 'alphabetical') {
      const sorted = sortIdsByPerson(people, Object.keys(people), 'alphabetical');
      sorted.forEach((id) => {
        addPerson(id, id === rootPersonId ? {
          generation: 0,
          branchPath: [rootPersonId],
          relationshipToRoot: 'root',
        } : undefined);
      });
      return { orderedIds, metadata };
    }

    if (strategy === 'chronological') {
      const sorted = sortIdsByPerson(people, Object.keys(people), 'chronological');
      sorted.forEach((id) => {
        addPerson(id, id === rootPersonId ? {
          generation: 0,
          branchPath: [rootPersonId],
          relationshipToRoot: 'root',
        } : undefined);
      });
      return { orderedIds, metadata };
    }

    if (!people[rootPersonId]) {
      const sorted = sortIdsByPerson(people, Object.keys(people));
      sorted.forEach((id) => addPerson(id));
      return { orderedIds, metadata };
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

    const traverseFamily = (
      personId: string,
      currentGen: number,
      parentPath: readonly string[],
      isSpouse: boolean = false
    ) => {
      if (!people[personId] || visited.has(personId)) return;

      let relationship = 'relative';
      if (personId === rootPersonId) {
        relationship = 'root';
      } else if (isSpouse) {
        relationship = 'spouse';
      } else if (currentGen === 1) {
        relationship = 'child';
      } else if (currentGen === 2) {
        relationship = 'grandchild';
      } else if (currentGen > 2) {
        relationship = 'descendant';
      }

      const currentPath = [...parentPath, personId];

      addPerson(personId, {
        generation: currentGen,
        branchPath: currentPath,
        relationshipToRoot: relationship,
      });

      // Spouses of the current person (keep the same generation)
      const personSpouses = sortIdsByPerson(people, spousesByPerson.get(personId) ?? []);
      personSpouses.forEach((spouseId) => {
        if (!visited.has(spouseId)) {
          traverseFamily(spouseId, currentGen, currentPath, true);
        }
      });

      // Children of the current person (generation increments)
      const children = sortIdsByPerson(people, childrenByParent.get(personId) ?? []);
      children.forEach((childId) => {
        if (!visited.has(childId)) {
          traverseFamily(childId, currentGen + 1, currentPath, false);
        }
      });
    };

    traverseFamily(rootPersonId, 0, []);

    const narrativeIds = [...orderedIds];
    if (strategy === 'custom') {
      orderedIds.length = 0;
      visited.clear();
      // Reset metadata map for custom order
      Object.keys(metadata).forEach((key) => delete metadata[key]);

      (input.customPersonOrder ?? []).forEach((id) => {
        addPerson(id);
      });
      narrativeIds.forEach((id) => {
        addPerson(id);
      });
    }

    sortIdsByPerson(people, Object.keys(people)).forEach((id) => {
      addPerson(id);
    });

    return { orderedIds, metadata };
  }
}

export interface NarrativePersonMetadata {
  readonly generation: number;
  readonly branchPath: readonly string[];
  readonly relationshipToRoot: string;
}

export interface NarrativeOrderingResult {
  readonly orderedIds: readonly string[];
  readonly metadata: Record<string, NarrativePersonMetadata>;
}
