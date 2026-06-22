import type { Person } from '../../../types';
import type { PublicationDocument, PublicationSection, PublicationBlock } from '../types';

export class BranchBuilder {
  /**
   * Extracts a specific branch starting from a target person, including their descendants and spouses.
   */
  public static build(
    people: Record<string, Person>,
    rootPersonId: string
  ): PublicationDocument {
    const rootPerson = people[rootPersonId];
    if (!rootPerson) {
      throw new Error(`Root person ${rootPersonId} not found in the family tree.`);
    }

    const collectedPersonIds = new Set<string>();
    const relationships: { parentId: string; childId: string; type: 'parent' }[] = [];
    const spouses: { personId: string; spouseId: string }[] = [];
    const visited = new Set<string>();

    const traverseDescendants = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);

      const person = people[currentId];
      if (!person) return;

      collectedPersonIds.add(currentId);

      // Collect spouses of the current person
      if (person.spouses) {
        person.spouses.forEach((spouseId) => {
          if (people[spouseId]) {
            collectedPersonIds.add(spouseId);
            // Record spouse relation (prevent duplicate pairs)
            const pairKey = [currentId, spouseId].sort().join('-');
            if (!visited.has(pairKey)) {
              spouses.push({ personId: currentId, spouseId });
              visited.add(pairKey);
            }
          }
        });
      }

      // Collect children and recurse
      if (person.children) {
        person.children.forEach((childId) => {
          if (people[childId]) {
            relationships.push({ parentId: currentId, childId, type: 'parent' });
            traverseDescendants(childId);
          }
        });
      }
    };

    traverseDescendants(rootPersonId);

    // Build a single tree-diagram asset containing all branch nodes and edges
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
            relationships: [
              ...relationships.map((rel) => ({ ...rel, type: 'parent' as const })),
              ...spouses.map((sp) => ({ ...sp, type: 'spouse' as const })),
            ],
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
            text: `فرع سلالة ${rootPerson.firstName} ${rootPerson.lastName}`.trim(),
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
      title: `فرع سلالة ${rootPerson.firstName} ${rootPerson.lastName}`.trim(),
      theme: 'classic',
      type: 'single-page',
      sections: [coverSection, treeSection],
    };
  }
}
