import { describe, expect, it } from 'vitest';
import { TemplateRegistry } from '../../services/TemplateRegistry';
import { PublishingPipeline } from '../../services/PublishingPipeline';
import type { Person } from '../../../../types';
import { createPerson } from '../../../../utils/familyLogic';
import type { PublicationRequest } from '../../types';
import type { PlacedTreeDiagramPayload, PlacedTreeNode } from '../AncestorTreeLayout';

// Helper to create mock persons
const createMockPerson = (id: string, gender: 'male' | 'female', overrides: Partial<Person>): Person => {
  return {
    ...createPerson(gender),
    id,
    gender,
    ...overrides,
  };
};

const mockPeople: Record<string, Person> = {
  'p-root': createMockPerson('p-root', 'male', {
    firstName: 'Ahmad',
    lastName: 'Al-Jamil',
    parents: ['p-father', 'p-mother'],
    birthDate: '1990-05-15',
  }),
  'p-father': createMockPerson('p-father', 'male', {
    firstName: 'Saleh',
    lastName: 'Al-Jamil',
    birthDate: '1960-01-01',
  }),
  'p-mother': createMockPerson('p-mother', 'female', {
    firstName: 'Fatima',
    lastName: 'Al-Harbi',
    birthDate: '1965-02-02',
  }),
};

describe('BookLayout Engine (Sprint 7)', () => {
  it('correctly layouts a multi-section document into A4 sequential pages', () => {
    const template = TemplateRegistry.getTemplate('classic-book-manuscript');
    
    const request: PublicationRequest = {
      rootPersonId: 'p-root',
      templateId: template.id,
      scope: {
        type: 'all',
      },
    };

    // 1. Compose the document
    const doc = PublishingPipeline.composeDocument(request, mockPeople);
    expect(doc.sections).toHaveLength(4);

    // 2. Layout the document
    const placedDoc = PublishingPipeline.layoutDocument(doc, template);
    
    expect(placedDoc.documentId).toBe(doc.id);
    expect(placedDoc.totalPages).toBe(4);
    expect(placedDoc.pageSize?.width).toBe(595); // A4 width
    expect(placedDoc.pageSize?.height).toBe(842); // A4 height

    // Verify sections have sequential page numbers: 1, 2, 3, 4
    const pageNumbers = placedDoc.sections.map((s) => s.pageNumber);
    expect(pageNumbers).toEqual([1, 2, 3, 4]);

    // Verify each section has A4 dimensions
    placedDoc.sections.forEach((section) => {
      expect(section.width).toBe(595);
      expect(section.height).toBe(842);
    });

    // 3. Page 1: Cover Layout Verification
    const coverPage = placedDoc.sections[0];
    expect(coverPage.type).toBe('cover');
    expect(coverPage.blocks).toHaveLength(1);
    const coverBlock = coverPage.blocks[0];
    // Cover block should be centered vertically on the 842pt height page
    // Block height is 80, so y center is 842/2 - 80/2 = 381
    expect(coverBlock.y).toBe(381);
    expect(coverBlock.assets[0].y).toBe(381);

    // 4. Page 2: Introduction Layout Verification
    const introPage = placedDoc.sections[1];
    expect(introPage.type).toBe('introduction');
    expect(introPage.blocks).toHaveLength(2);
    const headerBlock = introPage.blocks[0];
    const bodyBlock = introPage.blocks[1];
    // Introduction blocks must stack vertically without overlaps
    expect(headerBlock.y).toBe(template.defaultLayoutOptions.margins.top); // start at top margin
    expect(bodyBlock.y).toBeGreaterThan(headerBlock.y + headerBlock.height); // body begins below header

    // 5. Page 3: Tree Layout Verification
    const treePage = placedDoc.sections[2];
    expect(treePage.type).toBe('tree');
    expect(treePage.blocks).toHaveLength(1);
    
    const treeBlock = treePage.blocks[0];
    const treeAsset = treeBlock.assets[0];
    expect(treeAsset.type).toBe('tree-diagram');
    
    const treePayload = treeAsset.payload as PlacedTreeDiagramPayload;
    expect(treePayload.nodes).toHaveLength(3); // Ahmad, father, mother placed

    // Verify node dimensions and root placement
    const rootNode = treePayload.nodes.find((n: PlacedTreeNode) => n.slot === 1)!;
    expect(rootNode.width).toBe(120); // Default node width from template theme
    expect(rootNode.height).toBe(60);

    // 6. Page 4: Timeline Layout Verification
    const timelinePage = placedDoc.sections[3];
    expect(timelinePage.type).toBe('timeline');
    expect(timelinePage.blocks).toHaveLength(1);
    const timelineBlock = timelinePage.blocks[0];
    expect(timelineBlock.assets).toHaveLength(3);
    
    // Timeline events must stack vertically
    const event1 = timelineBlock.assets[0];
    const event2 = timelineBlock.assets[1];
    const event3 = timelineBlock.assets[2];
    
    expect(event2.y).toBeGreaterThan(event1.y + event1.height);
    expect(event3.y).toBeGreaterThan(event2.y + event2.height);
  });
});
