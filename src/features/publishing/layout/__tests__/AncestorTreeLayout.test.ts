import { describe, expect, it } from 'vitest';
import { AncestorBuilder } from '../../builders/AncestorBuilder';
import { 
  AncestorTreeLayout, 
  LayoutOptions, 
  PlacedTreeDiagramPayload, 
  PlacedTreeNode, 
  PlacedTreeEdge 
} from '../AncestorTreeLayout';
import type { Person } from '../../../../types';
import { createPerson } from '../../../../utils/familyLogic';

// Helper to create mock persons
const createMockPerson = (id: string, gender: 'male' | 'female', overrides: Partial<Person>): Person => {
  return {
    ...createPerson(gender),
    id,
    gender,
    ...overrides,
  };
};

const mockLayoutOptions: LayoutOptions = {
  pageWidth: 1000,
  pageHeight: 800,
  margins: {
    top: 50,
    bottom: 50,
    left: 50,
    right: 50,
  },
  nodeWidth: 120,
  nodeHeight: 60,
};

describe('AncestorTreeLayout', () => {
  it('correctly maps a simple pedigree tree to absolute positions', () => {
    const simplePeople: Record<string, Person> = {
      'p-root': createMockPerson('p-root', 'male', {
        firstName: 'Root',
        parents: ['p-father', 'p-mother'],
      }),
      'p-father': createMockPerson('p-father', 'male', {
        firstName: 'Father',
      }),
      'p-mother': createMockPerson('p-mother', 'female', {
        firstName: 'Mother',
      }),
    };

    const doc = AncestorBuilder.build(simplePeople, 'p-root', 2);
    const placedDoc = AncestorTreeLayout.layout(doc, mockLayoutOptions);

    expect(placedDoc.documentId).toBe(doc.id);
    expect(placedDoc.totalPages).toBe(1);
    expect(placedDoc.pageSize?.width).toBe(1000);
    expect(placedDoc.pageSize?.height).toBe(800);

    // Find the tree-diagram placed asset
    const treeSection = placedDoc.sections.find((s) => s.type === 'tree');
    expect(treeSection).toBeDefined();
    const treeBlock = treeSection!.blocks[0];
    const treeAsset = treeBlock.assets.find((a) => a.type === 'tree-diagram');
    expect(treeAsset).toBeDefined();

    const payload = treeAsset!.payload as PlacedTreeDiagramPayload;
    expect(payload.rootPersonId).toBe('p-root');

    // 3 nodes placed: root (slot 1), father (slot 2), mother (slot 3)
    expect(payload.nodes).toHaveLength(3);
    const rootNode = payload.nodes.find((n: PlacedTreeNode) => n.slot === 1);
    const fatherNode = payload.nodes.find((n: PlacedTreeNode) => n.slot === 2);
    const motherNode = payload.nodes.find((n: PlacedTreeNode) => n.slot === 3);

    expect(rootNode).toBeDefined();
    expect(fatherNode).toBeDefined();
    expect(motherNode).toBeDefined();

    if (rootNode && fatherNode && motherNode) {
      expect(rootNode.id).toBe('p-root@ahnentafel:1');
      expect(fatherNode.id).toBe('p-father@ahnentafel:2');
      expect(motherNode.id).toBe('p-mother@ahnentafel:3');

      // Assert personSnapshot decoupling
      expect(rootNode.personSnapshot).toBeDefined();
      expect(rootNode.personSnapshot.displayName).toBe('Root Person');
      expect(rootNode.personSnapshot.gender).toBe('male');

      // Root should be centered horizontally at 500
      // available width = 1000 - 50 - 50 = 900
      // level 0 width segment is 900, k=0, center is 50 + (0.5)*900 = 500
      expect(rootNode.x + rootNode.width / 2).toBe(500);

      // Root should be at the bottom (level 0)
      // generation spacing for depth 2 = availableHeight = 800 - 150 - 50 = 600
      // Y center level 0 = 800 - 50 - 0 = 750
      expect(rootNode.y + rootNode.height / 2).toBe(750);

      // Level 1 Y center = 750 - 600 = 150
      expect(fatherNode.y + fatherNode.height / 2).toBe(150);
      expect(motherNode.y + motherNode.height / 2).toBe(150);

      // Root should be exactly centered between father and mother horizontally
      const parentsMidX = (fatherNode.x + fatherNode.width / 2 + (motherNode.x + motherNode.width / 2)) / 2;
      expect(parentsMidX).toBe(500);
    }

    // Verify edges
    expect(payload.edges).toHaveLength(2);
    const fatherEdge = payload.edges.find((e: PlacedTreeEdge) => e.type === 'father');
    expect(fatherEdge).toBeDefined();

    if (fatherEdge) {
      expect(fatherEdge.fromNodeId).toBe('p-father@ahnentafel:2');
      expect(fatherEdge.toNodeId).toBe('p-root@ahnentafel:1');
      // Orthogonal points check
      expect(fatherEdge.points).toHaveLength(4);
      // starts at parent bottom: Y = 150 + 30 = 180
      expect(fatherEdge.points[0].y).toBe(180);
      // ends at child top: Y = 750 - 30 = 720
      expect(fatherEdge.points[3].y).toBe(720);
      // mid point Y = (180 + 720)/2 = 450
      expect(fatherEdge.points[1].y).toBe(450);
      expect(fatherEdge.points[2].y).toBe(450);
    }
  });

  it('proves that a person appears once logically but multiple times visually during pedigree collapse', () => {
    // Pedigree collapse tree:
    // Root -> Father & Mother
    // Father -> Grandfather
    // Mother -> Grandfather (same person!)
    // Grandfather -> Great-Grandfather
    const collapsePeople: Record<string, Person> = {
      'p-root': createMockPerson('p-root', 'male', {
        parents: ['p-father', 'p-mother'],
      }),
      'p-father': createMockPerson('p-father', 'male', {
        parents: ['p-grandfather'],
      }),
      'p-mother': createMockPerson('p-mother', 'female', {
        parents: ['p-grandfather'],
      }),
      'p-grandfather': createMockPerson('p-grandfather', 'male', {
        parents: ['p-great-grandfather'],
      }),
      'p-great-grandfather': createMockPerson('p-great-grandfather', 'male', {}),
    };

    // 1. Build logical document
    const doc = AncestorBuilder.build(collapsePeople, 'p-root', 4);
    
    // Check that Grandfather appears only ONCE logically in tree-diagram asset people map
    const treeSection = doc.sections.find((s) => s.type === 'tree')!;
    const treeBlock = treeSection.blocks[0];
    const treeAsset = treeBlock.assets[0];
    const logicalPayload = treeAsset.payload as {
      rootPersonId: string;
      people: Record<string, Person>;
      relationships: unknown[];
    };
    
    expect(logicalPayload.people['p-grandfather']).toBeDefined();
    // Verify there are exactly 5 keys in the people record
    expect(Object.keys(logicalPayload.people)).toHaveLength(5);

    // 2. Compute Layout
    const placedDoc = AncestorTreeLayout.layout(doc, mockLayoutOptions);
    const placedSection = placedDoc.sections.find((s) => s.type === 'tree')!;
    const placedBlock = placedSection.blocks[0];
    const placedAsset = placedBlock.assets.find((a) => a.type === 'tree-diagram')!;
    const visualPayload = placedAsset.payload as PlacedTreeDiagramPayload;

    // Grandfather should be placed TWICE in PlacedDocument at different slots (4 and 6)
    // Slot 4: paternal line (Root -> Father -> Grandfather)
    // Slot 6: maternal line (Root -> Mother -> Grandfather)
    const grandfatherPlacements = visualPayload.nodes.filter(
      (n: PlacedTreeNode) => n.personId === 'p-grandfather'
    );
    expect(grandfatherPlacements).toHaveLength(2);

    const slot4 = grandfatherPlacements.find((n: PlacedTreeNode) => n.slot === 4);
    const slot6 = grandfatherPlacements.find((n: PlacedTreeNode) => n.slot === 6);
    expect(slot4).toBeDefined();
    expect(slot6).toBeDefined();

    if (slot4 && slot6) {
      expect(slot4.id).toBe('p-grandfather@ahnentafel:4');
      expect(slot6.id).toBe('p-grandfather@ahnentafel:6');

      // They must have different visual coordinates
      expect(slot4.x).not.toBe(slot6.x);
    }
  });

  it('throws an error/safety check if generations depth exceeds 8', () => {
    // Generate a deep chain of 9 generations
    const deepPeople: Record<string, Person> = {};
    for (let i = 1; i <= 9; i++) {
      deepPeople[`p-${i}`] = createMockPerson(`p-${i}`, 'male', {
        parents: i < 9 ? [`p-${i + 1}`] : [],
      });
    }

    const doc = AncestorBuilder.build(deepPeople, 'p-1', 9);
    
    // Call layout and expect error
    expect(() => AncestorTreeLayout.layout(doc, mockLayoutOptions)).toThrow(
      /exceeds the safety limit of 8 generations/
    );
  });
});
