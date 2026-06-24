import type { Person, RelationshipEdge } from '../../../types';
import type { PublicationDocument, PublicationSection, PublicationBlock } from '../types';
import { PublishingRelationshipAdapter } from '../services/PublishingRelationshipAdapter';

export class BranchBuilder {
  /**
   * Extracts a specific branch starting from a target person, including their descendants and spouses.
   */
  public static build(
    people: Record<string, Person>,
    rootPersonId: string,
    relationshipEdges?: Record<string, RelationshipEdge> | readonly RelationshipEdge[]
  ): PublicationDocument {
    const rootPerson = people[rootPersonId];
    if (!rootPerson) {
      throw new Error(`Root person ${rootPersonId} not found in the family tree.`);
    }

    const graph = PublishingRelationshipAdapter.buildBranchGraph(
      people,
      rootPersonId,
      relationshipEdges
    );

    const treeBlock: PublicationBlock = {
      id: `block-tree-${crypto.randomUUID()}`,
      type: 'tree',
      assets: [
        {
          id: `asset-tree-diagram-${crypto.randomUUID()}`,
          type: 'tree-diagram',
          payload: {
            rootPersonId,
            people: graph.people,
            relationships: graph.relationships,
            warnings: graph.warnings,
          },
        },
      ],
    };

    const treeSection: PublicationSection = {
      id: `section-tree-${crypto.randomUUID()}`,
      type: 'tree',
      blocks: [treeBlock],
    };

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
