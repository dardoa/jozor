import type { 
  PublicationDocument, 
  PlacedDocument, 
  PlacedSection, 
  PlacedBlock, 
  PlacedAsset, 
  AssetType,
  BlockType,
  SectionType,
  PublicationAsset,
  PublicationPersonSnapshot,
  PublicationTheme
} from '../types';
import type { Person } from '../../../types';

export interface LayoutOptions {
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly margins: {
    readonly top: number;
    readonly bottom: number;
    readonly left: number;
    readonly right: number;
  };
  readonly nodeWidth?: number;
  readonly nodeHeight?: number;
  readonly generationSpacing?: number;
  readonly theme?: PublicationTheme;
}

export interface PlacedTreeNode {
  readonly id: string; // e.g. `${personId}@ahnentafel:${slotNumber}`
  readonly personId: string;
  readonly x: number; // top-left x
  readonly y: number; // top-left y
  readonly width: number;
  readonly height: number;
  readonly slot: number;
  readonly level: number;
  readonly personSnapshot: PublicationPersonSnapshot;
}

export interface PlacedTreeEdge {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly type: 'father' | 'mother';
  readonly points: readonly { readonly x: number; readonly y: number }[];
}

export interface PlacedTreeDiagramPayload {
  readonly rootPersonId: string;
  readonly nodes: readonly PlacedTreeNode[];
  readonly edges: readonly PlacedTreeEdge[];
}

export const MAX_LAYOUT_GENERATIONS = 8;

export class AncestorTreeLayout {
  /**
   * Lays out an ancestor PublicationDocument into a PlacedDocument using the Ahnentafel pedigree slot system.
   * Bounded by a safety limit of MAX_LAYOUT_GENERATIONS.
   */
  public static layout(
    doc: PublicationDocument,
    options: LayoutOptions
  ): PlacedDocument {
    // 1. Locate the tree-diagram asset to determine depth and configuration
    let treeAsset: PublicationAsset | null = null;
    for (const section of doc.sections) {
      for (const block of section.blocks) {
        const found = block.assets.find((a) => a.type === 'tree-diagram');
        if (found) {
          treeAsset = found;
          break;
        }
      }
      if (treeAsset) break;
    }

    if (!treeAsset) {
      throw new Error('No tree-diagram asset found in the PublicationDocument.');
    }

    const payload = treeAsset.payload as {
      rootPersonId: string;
      people: Record<string, Person>;
      relationships: { childId: string; parentId: string; type: 'father' | 'mother' }[];
    };

    const { rootPersonId, people, relationships } = payload;

    // 2. Compute actual generations depth in the diagram
    const getDepth = (id: string, currentDepth: number): number => {
      const fatherRel = relationships.find((r) => r.childId === id && r.type === 'father');
      const motherRel = relationships.find((r) => r.childId === id && r.type === 'mother');

      let maxChildDepth = currentDepth;
      if (fatherRel) {
        maxChildDepth = Math.max(maxChildDepth, getDepth(fatherRel.parentId, currentDepth + 1));
      }
      if (motherRel) {
        maxChildDepth = Math.max(maxChildDepth, getDepth(motherRel.parentId, currentDepth + 1));
      }
      return maxChildDepth;
    };

    const actualDepth = getDepth(rootPersonId, 1);

    // Safety check to prevent exponential space explosion
    if (actualDepth > MAX_LAYOUT_GENERATIONS) {
      throw new Error(`Generation depth ${actualDepth} exceeds the safety limit of ${MAX_LAYOUT_GENERATIONS} generations.`);
    }

    // 3. Map logical graph nodes to Ahnentafel slots
    const slotToPersonId = new Map<number, string>();
    
    const assignSlots = (personId: string, slotNumber: number) => {
      const level = Math.floor(Math.log2(slotNumber));
      if (level >= actualDepth) return;

      slotToPersonId.set(slotNumber, personId);

      const fatherRel = relationships.find((r) => r.childId === personId && r.type === 'father');
      const motherRel = relationships.find((r) => r.childId === personId && r.type === 'mother');

      if (fatherRel && people[fatherRel.parentId]) {
        assignSlots(fatherRel.parentId, 2 * slotNumber);
      }
      if (motherRel && people[motherRel.parentId]) {
        assignSlots(motherRel.parentId, 2 * slotNumber + 1);
      }
    };

    assignSlots(rootPersonId, 1);

    // 4. Calculate layout parameters
    const leftMargin = options.margins.left;
    const rightMargin = options.margins.right;
    const topMargin = options.margins.top + 100; // Leave 100px space for the title block
    const bottomMargin = options.margins.bottom;
    
    const availableWidth = options.pageWidth - leftMargin - rightMargin;
    const availableHeight = options.pageHeight - topMargin - bottomMargin;

    const nodeWidth = options.nodeWidth || options.theme?.node.width || 120;
    const nodeHeight = options.nodeHeight || options.theme?.node.height || 60;

    const generationSpacing = options.generationSpacing || 
      (actualDepth > 1 ? availableHeight / (actualDepth - 1) : 0);

    // Helper to get centers
    const getSlotCenters = (slot: number) => {
      const level = Math.floor(Math.log2(slot));
      const k = slot - Math.pow(2, level);
      
      const xCenter = leftMargin + (k + 0.5) * (availableWidth / Math.pow(2, level));
      // Root (level 0) is at the bottom, top level is at topMargin
      const yCenter = (options.pageHeight - bottomMargin) - level * generationSpacing;

      return { xCenter, yCenter, level };
    };

    // 5. Generate PlacedTreeNodes
    const placedNodes: PlacedTreeNode[] = [];
    slotToPersonId.forEach((personId, slot) => {
      const { xCenter, yCenter, level } = getSlotCenters(slot);
      const p = people[personId];
      if (!p) return;

      const displayName = [p.title, p.firstName, p.middleName, p.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || p.nickName || 'Unnamed Person';

      placedNodes.push({
        id: `${personId}@ahnentafel:${slot}`,
        personId,
        x: xCenter - nodeWidth / 2,
        y: yCenter - nodeHeight / 2,
        width: nodeWidth,
        height: nodeHeight,
        slot,
        level,
        personSnapshot: {
          id: p.id,
          displayName,
          birthDate: p.birthDate || undefined,
          deathDate: p.isDeceased && p.deathDate ? p.deathDate : undefined,
          gender: p.gender,
          photoUrl: p.photoUrl || undefined,
        },
      });
    });

    // 6. Generate PlacedTreeEdges (Orthogonal Polyline Paths)
    const placedEdges: PlacedTreeEdge[] = [];
    slotToPersonId.forEach((personId, slot) => {
      if (slot === 1) return; // Root has no child in ancestor tree (it is the child itself)

      const parentSlot = slot;
      const childSlot = Math.floor(slot / 2);

      if (slotToPersonId.has(childSlot)) {
        const parentPersonId = personId;
        const childPersonId = slotToPersonId.get(childSlot)!;
        const type = (slot % 2 === 0) ? 'father' : 'mother';

        const pCenters = getSlotCenters(parentSlot);
        const cCenters = getSlotCenters(childSlot);

        // Parent is at a higher level (smaller Y), child is at a lower level (larger Y)
        const yParentBottom = pCenters.yCenter + nodeHeight / 2;
        const yChildTop = cCenters.yCenter - nodeHeight / 2;
        const yMid = (yParentBottom + yChildTop) / 2;

        placedEdges.push({
          id: `edge-${parentSlot}-${childSlot}`,
          fromNodeId: `${parentPersonId}@ahnentafel:${parentSlot}`,
          toNodeId: `${childPersonId}@ahnentafel:${childSlot}`,
          type,
          points: [
            { x: pCenters.xCenter, y: yParentBottom },
            { x: pCenters.xCenter, y: yMid },
            { x: cCenters.xCenter, y: yMid },
            { x: cCenters.xCenter, y: yChildTop },
          ],
        });
      }
    });

    // 7. Compose PlacedDocument Sections
    const placedSections: PlacedSection[] = doc.sections.map((section) => {
      const placedBlocks: PlacedBlock[] = section.blocks.map((block) => {
        const placedAssets: PlacedAsset[] = block.assets.map((asset) => {
          if (asset.type === 'tree-diagram') {
            const diagramPayload: PlacedTreeDiagramPayload = {
              rootPersonId,
              nodes: placedNodes,
              edges: placedEdges,
            };

            return {
              assetId: asset.id,
              type: 'tree-diagram' as AssetType,
              x: leftMargin,
              y: topMargin,
              width: availableWidth,
              height: availableHeight,
              payload: diagramPayload,
            };
          } else {
            // Default placement for other assets (e.g. text header block)
            return {
              assetId: asset.id,
              type: asset.type,
              x: options.margins.left,
              y: options.margins.top,
              width: options.pageWidth - options.margins.left - options.margins.right,
              height: 80,
              payload: asset.payload,
            };
          }
        });

        // Compute block bounds
        const isTree = block.type === 'tree';
        return {
          blockId: block.id,
          type: block.type as BlockType,
          x: options.margins.left,
          y: isTree ? topMargin : options.margins.top,
          width: options.pageWidth - options.margins.left - options.margins.right,
          height: isTree ? availableHeight : 80,
          assets: placedAssets,
        };
      });

      return {
        sectionId: section.id,
        type: section.type as SectionType,
        pageNumber: 1,
        x: 0,
        y: 0,
        width: options.pageWidth,
        height: options.pageHeight,
        blocks: placedBlocks,
      };
    });

    return {
      documentId: doc.id,
      totalPages: 1,
      pageSize: {
        width: options.pageWidth,
        height: options.pageHeight,
      },
      sections: placedSections,
    };
  }
}
