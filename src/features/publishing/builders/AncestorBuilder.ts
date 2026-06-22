import type { Person } from '../../../types';
import type { PublicationDocument, PublicationSection, PublicationBlock } from '../types';

export class AncestorBuilder {
  /**
   * Builds an ancestor document starting from a specific target person, going upwards to their parents and grandparents.
   */
  public static build(
    people: Record<string, Person>,
    rootPersonId: string,
    generationsDepth: number = 4
  ): PublicationDocument {
    const rootPerson = people[rootPersonId];
    if (!rootPerson) {
      throw new Error(`Root person ${rootPersonId} not found in the family tree.`);
    }

    const collectedPersonIds = new Set<string>();
    const relationships: { childId: string; parentId: string; type: 'father' | 'mother' }[] = [];
    const recordedRelationships = new Set<string>();

    const addRelationship = (childId: string, parentId: string, type: 'father' | 'mother') => {
      const relationshipKey = `${childId}:${parentId}:${type}`;
      if (recordedRelationships.has(relationshipKey)) {
        return;
      }
      recordedRelationships.add(relationshipKey);
      relationships.push({ childId, parentId, type });
    };

    const traverse = (currentId: string, currentDepth: number) => {
      if (currentDepth > generationsDepth) return;

      const person = people[currentId];
      if (!person) return;

      collectedPersonIds.add(currentId);

      // In Jozor, parents can be explicitly linked via person.parents array
      const personWithExtra = person as Person & { fatherId?: string; motherId?: string };
      const fatherId = personWithExtra.fatherId || person.parents?.[0];
      const motherId = personWithExtra.motherId || person.parents?.[1];

      if (fatherId && people[fatherId]) {
        addRelationship(currentId, fatherId, 'father');
        traverse(fatherId, currentDepth + 1);
      }
      if (motherId && people[motherId]) {
        addRelationship(currentId, motherId, 'mother');
        traverse(motherId, currentDepth + 1);
      }
    };

    traverse(rootPersonId, 1);

    // Build a single tree-diagram asset containing all nodes and edges
    const treePeople = Array.from(collectedPersonIds).reduce((acc, id) => {
      acc[id] = people[id];
      return acc;
    }, {} as Record<string, Person>);

    const treeBlock: PublicationBlock = {
      id: `block-tree-${crypto.randomUUID()}`,
      type: 'tree',
      assets: [
        {
          id: `asset-tree-diagram-${crypto.randomUUID()}`,
          type: 'tree-diagram',
          payload: {
            rootPersonId,
            people: treePeople,
            relationships,
          },
        },
      ],
    };

    const treeSection: PublicationSection = {
      id: `section-tree-${crypto.randomUUID()}`,
      type: 'tree',
      blocks: [treeBlock],
    };

    // Cover Section
    const coverBlock: PublicationBlock = {
      id: `block-cover-${crypto.randomUUID()}`,
      type: 'header',
      assets: [
        {
          id: `asset-cover-title-${crypto.randomUUID()}`,
          type: 'text',
          payload: {
            text: `شجرة أسلاف ${rootPerson.firstName} ${rootPerson.lastName}`.trim(),
            subtext: 'تم التوليد بواسطة محرك جذور للنشر',
          },
        },
      ],
    };

    const coverSection: PublicationSection = {
      id: `section-cover-${crypto.randomUUID()}`,
      type: 'cover',
      blocks: [coverBlock],
    };

    return {
      id: `doc-${crypto.randomUUID()}`,
      title: `شجرة أسلاف ${rootPerson.firstName} ${rootPerson.lastName}`.trim(),
      theme: 'classic',
      type: 'single-page',
      sections: [coverSection, treeSection],
    };
  }
}
