import type { VisualOutputProductType } from './visualOutputTypes';
import { getVisualOutputDefinition } from './visualOutputRegistry';
import type {
  VisualPreviewAdapter,
  VisualPreviewRequest,
  VisualPreviewModel,
  VisualPreviewPersonNode,
  VisualPreviewEdge,
} from './previewAdapterTypes';

// Placeholder Poster Preview Adapter implementation
export const posterPreviewAdapter: VisualPreviewAdapter = {
  productType: 'poster',
  createPreviewModel(request: VisualPreviewRequest): VisualPreviewModel {
    const isAr = request.language === 'ar';
    const def = getVisualOutputDefinition(request.definitionId);
    if (!def) {
      throw new Error(`Definition not found: ${request.definitionId}`);
    }

    // Isolated placeholder nodes representing generic tree members
    const allNodes: VisualPreviewPersonNode[] = [
      { id: '1', displayName: isAr ? 'جذر المعاينة' : 'Preview root', generation: 1 },
      { id: '2', displayName: isAr ? 'عقدة الأب' : 'Father node', generation: 2 },
      { id: '3', displayName: isAr ? 'عقدة الأم' : 'Mother node', generation: 2 },
      { id: '4', displayName: isAr ? 'جد الأب' : 'Paternal grandfather', generation: 3 },
      { id: '5', displayName: isAr ? 'جدة الأب' : 'Paternal grandmother', generation: 3 },
      { id: '6', displayName: isAr ? 'جد الأم' : 'Maternal grandfather', generation: 3 },
      { id: '7', displayName: isAr ? 'جدة الأم' : 'Maternal grandmother', generation: 3 },
    ];

    const allEdges: VisualPreviewEdge[] = [
      { fromId: '2', toId: '1', relationshipType: 'parent-child' },
      { fromId: '3', toId: '1', relationshipType: 'parent-child' },
      { fromId: '4', toId: '2', relationshipType: 'parent-child' },
      { fromId: '5', toId: '2', relationshipType: 'parent-child' },
      { fromId: '6', toId: '3', relationshipType: 'parent-child' },
      { fromId: '7', toId: '3', relationshipType: 'parent-child' },
    ];

    // Respect maxNodes bounds
    const maxNodes = request.maxNodes ?? 100;
    const truncated = allNodes.length > maxNodes;
    const nodes = truncated ? allNodes.slice(0, maxNodes) : allNodes;
    
    // Filter edges to only keep connections where both nodes are kept
    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = allEdges.filter(e => nodeIds.has(e.fromId) && nodeIds.has(e.toId));

    const warnings: string[] = [];
    if (truncated) {
      warnings.push(
        isAr
          ? 'تم تقليص عدد العقد لتناسب الحد الأقصى للمعاينة'
          : 'Preview nodes count truncated to fit preview cap limits'
      );
    }

    return {
      definitionId: def.id,
      productType: 'poster',
      layoutEngine: def.layoutEngine,
      readingStrategy: def.readingStrategy,
      mode: request.mode,
      privacyMode: request.privacyMode,
      nodes,
      edges,
      warnings,
      metadata: {
        truncated,
        nodeCount: allNodes.length,
        maxNodes: request.maxNodes,
      },
    };
  },
};

// Placeholder Snapshot Preview Adapter implementation
export const snapshotPreviewAdapter: VisualPreviewAdapter = {
  productType: 'snapshot',
  createPreviewModel(request: VisualPreviewRequest): VisualPreviewModel {
    const isAr = request.language === 'ar';
    const def = getVisualOutputDefinition(request.definitionId);
    if (!def) {
      throw new Error(`Definition not found: ${request.definitionId}`);
    }

    // Viewport snapshot mock data
    const allNodes: VisualPreviewPersonNode[] = [
      { id: '101', displayName: isAr ? 'جذر المعاينة الثنائي' : 'Viewport root', generation: 1 },
      { id: '102', displayName: isAr ? 'عقدة الشجرة الفرعية' : 'Subtree node A', generation: 2 },
      { id: '103', displayName: isAr ? 'عقدة الشجرة الفرعية ب' : 'Subtree node B', generation: 2 },
    ];

    const allEdges: VisualPreviewEdge[] = [
      { fromId: '102', toId: '101', relationshipType: 'parent-child' },
      { fromId: '103', toId: '101', relationshipType: 'parent-child' },
    ];

    const maxNodes = request.maxNodes ?? 100;
    const truncated = allNodes.length > maxNodes;
    const nodes = truncated ? allNodes.slice(0, maxNodes) : allNodes;

    const nodeIds = new Set(nodes.map(n => n.id));
    const edges = allEdges.filter(e => nodeIds.has(e.fromId) && nodeIds.has(e.toId));

    const warnings: string[] = [];
    if (truncated) {
      warnings.push(
        isAr
          ? 'تم تقليص المعاينة'
          : 'Preview nodes truncated'
      );
    }

    return {
      definitionId: def.id,
      productType: 'snapshot',
      layoutEngine: def.layoutEngine,
      readingStrategy: def.readingStrategy,
      mode: request.mode,
      privacyMode: request.privacyMode,
      nodes,
      edges,
      warnings,
      metadata: {
        truncated,
        nodeCount: allNodes.length,
        maxNodes: request.maxNodes,
      },
    };
  },
};

// Registry lookup mapping dictionary
const adaptersMap: Partial<Record<VisualOutputProductType, VisualPreviewAdapter>> = {
  poster: posterPreviewAdapter,
  snapshot: snapshotPreviewAdapter,
};

/**
 * Returns the registered preview adapter for a given product type.
 */
export function getVisualPreviewAdapter(productType: VisualOutputProductType): VisualPreviewAdapter | undefined {
  return adaptersMap[productType];
}

/**
 * Returns a list of all registered preview adapters.
 */
export function listVisualPreviewAdapters(): VisualPreviewAdapter[] {
  return Object.values(adaptersMap) as VisualPreviewAdapter[];
}
