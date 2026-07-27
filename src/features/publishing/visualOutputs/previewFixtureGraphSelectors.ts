import type {
  PreviewSanitizerRawEdge,
  PreviewSanitizerRawGraph,
  PreviewSanitizerRawNode,
} from './previewProductionSanitizer';
import type {
  VisualPreviewGraphSelector,
  VisualPreviewSelectorProduct,
} from './previewGraphSelectorTypes';
import type { VisualPreviewRelationshipHint } from './previewSanitizerTypes';

export interface FixturePreviewNode {
  readonly fixtureId: string;
  readonly displayName?: string;
  readonly isLiving?: boolean;
  readonly isPrivate?: boolean;
  readonly generation?: number;
  readonly relationshipHint?: VisualPreviewRelationshipHint;
  readonly birthDate?: string;
  readonly deathDate?: string;
  readonly hasProfilePhoto?: boolean;
}

export interface FixturePreviewEdge {
  readonly fromFixtureId: string;
  readonly toFixtureId: string;
  readonly relationshipType: PreviewSanitizerRawEdge['relationshipType'];
}

export interface FixturePreviewSource {
  readonly nodes: readonly FixturePreviewNode[];
  readonly edges: readonly FixturePreviewEdge[];
}

const toRawNode = (node: FixturePreviewNode): PreviewSanitizerRawNode => ({
  rawId: node.fixtureId,
  displayName: node.displayName,
  isLiving: node.isLiving,
  isPrivate: node.isPrivate,
  generation: node.generation,
  relationshipHint: node.relationshipHint,
  birthDate: node.birthDate,
  deathDate: node.deathDate,
  hasProfilePhoto: node.hasProfilePhoto,
});

const filterEdgesForNodes = (
  edges: readonly FixturePreviewEdge[],
  keptNodeIds: ReadonlySet<string>
): PreviewSanitizerRawEdge[] =>
  edges
    .filter((edge) => keptNodeIds.has(edge.fromFixtureId) && keptNodeIds.has(edge.toFixtureId))
    .map((edge) => ({
      fromRawId: edge.fromFixtureId,
      toRawId: edge.toFixtureId,
      relationshipType: edge.relationshipType,
    }));

export const posterFixturePreviewGraphSelector: VisualPreviewGraphSelector<FixturePreviewSource> = {
  productType: 'poster',
  selectRawGraph(source, context): PreviewSanitizerRawGraph {
    const root = source.nodes.find((node) => node.fixtureId === context.rootPersonId);
    if (!root) return { nodes: [], edges: [] };

    const nodeById = new Map(source.nodes.map((node) => [node.fixtureId, node]));
    const maxDepth = context.maxDepth === 'all'
      ? Number.POSITIVE_INFINITY
      : context.maxDepth ?? 4;
    const maxNodes = Math.max(1, context.maxNodes);
    const selectionLimit = maxNodes + 1;
    const queue: Array<{ fixtureId: string; generation: number }> = [
      { fixtureId: root.fixtureId, generation: 1 },
    ];
    const visited = new Set<string>();
    const nodes: FixturePreviewNode[] = [];

    while (queue.length > 0 && nodes.length < selectionLimit) {
      const current = queue.shift()!;
      if (visited.has(current.fixtureId)) continue;
      visited.add(current.fixtureId);

      const node = nodeById.get(current.fixtureId);
      if (!node) continue;

      nodes.push({
        ...node,
        generation: current.generation,
        relationshipHint: current.generation === 1 ? 'root' : 'ancestor',
      });

      if (current.generation >= maxDepth) continue;

      source.edges
        .filter((edge) => edge.relationshipType !== 'spouse' && edge.toFixtureId === current.fixtureId)
        .forEach((edge) => {
          if (!visited.has(edge.fromFixtureId) && nodeById.has(edge.fromFixtureId)) {
            queue.push({ fixtureId: edge.fromFixtureId, generation: current.generation + 1 });
          }
        });
    }

    const keptNodeIds = new Set(nodes.map((node) => node.fixtureId));

    return {
      nodes: nodes.map(toRawNode),
      edges: filterEdgesForNodes(source.edges, keptNodeIds),
    };
  },
};

export const descendantFixturePreviewGraphSelector: VisualPreviewGraphSelector<FixturePreviewSource> = {
  productType: 'poster',
  selectRawGraph(source, context): PreviewSanitizerRawGraph {
    const root = source.nodes.find((node) => node.fixtureId === context.rootPersonId);
    if (!root) return { nodes: [], edges: [] };

    const nodeById = new Map(source.nodes.map((node) => [node.fixtureId, node]));
    const maxDepth = context.maxDepth === 'all'
      ? Number.POSITIVE_INFINITY
      : context.maxDepth ?? 4;
    const selectionLimit = Math.max(1, context.maxNodes) + 1;
    const queue: Array<{ fixtureId: string; generation: number }> = [
      { fixtureId: root.fixtureId, generation: 1 },
    ];
    const visited = new Set<string>();
    const nodes: FixturePreviewNode[] = [];

    while (queue.length > 0 && nodes.length < selectionLimit) {
      const current = queue.shift()!;
      if (visited.has(current.fixtureId)) continue;
      visited.add(current.fixtureId);
      const node = nodeById.get(current.fixtureId);
      if (!node) continue;

      nodes.push({
        ...node,
        generation: current.generation,
        relationshipHint: current.generation === 1 ? 'root' : 'descendant',
      });
      if (current.generation >= maxDepth) continue;

      source.edges
        .filter((edge) => edge.relationshipType !== 'spouse' && edge.fromFixtureId === current.fixtureId)
        .forEach((edge) => {
          if (!visited.has(edge.toFixtureId) && nodeById.has(edge.toFixtureId)) {
            queue.push({ fixtureId: edge.toFixtureId, generation: current.generation + 1 });
          }
        });
    }

    const keptNodeIds = new Set(nodes.map((node) => node.fixtureId));
    return {
      nodes: nodes.map(toRawNode),
      edges: filterEdgesForNodes(source.edges, keptNodeIds),
    };
  },
};

export const fullTreeFixturePreviewGraphSelector: VisualPreviewGraphSelector<FixturePreviewSource> = {
  productType: 'poster',
  selectRawGraph(source, context): PreviewSanitizerRawGraph {
    const root = source.nodes.find((node) => node.fixtureId === context.rootPersonId);
    if (!root) return { nodes: [], edges: [] };

    const nodeById = new Map(source.nodes.map((node) => [node.fixtureId, node]));
    const selectionLimit = Math.max(1, context.maxNodes) + 1;
    const queue: Array<{
      fixtureId: string;
      level: number;
      relationshipHint: VisualPreviewRelationshipHint;
    }> = [{ fixtureId: root.fixtureId, level: 0, relationshipHint: 'root' }];
    const visited = new Set<string>();
    const selected: Array<{
      node: FixturePreviewNode;
      level: number;
      relationshipHint: VisualPreviewRelationshipHint;
    }> = [];

    while (queue.length > 0 && selected.length < selectionLimit) {
      const current = queue.shift()!;
      if (visited.has(current.fixtureId)) continue;
      visited.add(current.fixtureId);
      const node = nodeById.get(current.fixtureId);
      if (!node) continue;
      selected.push({ node, level: current.level, relationshipHint: current.relationshipHint });

      source.edges.forEach((edge) => {
        const isFrom = edge.fromFixtureId === current.fixtureId;
        const isTo = edge.toFixtureId === current.fixtureId;
        if (!isFrom && !isTo) return;
        const nextId = isFrom ? edge.toFixtureId : edge.fromFixtureId;
        if (visited.has(nextId) || !nodeById.has(nextId)) return;

        let level = current.level;
        let relationshipHint: VisualPreviewRelationshipHint = 'relative';
        if (edge.relationshipType === 'parent-child' || edge.relationshipType === 'ancestor') {
          level += isFrom ? 1 : -1;
          relationshipHint = isFrom ? 'descendant' : 'ancestor';
        } else if (edge.relationshipType === 'spouse') {
          relationshipHint = 'spouse';
        }
        queue.push({ fixtureId: nextId, level, relationshipHint });
      });
    }

    source.nodes.forEach((node) => {
      if (selected.length >= selectionLimit || visited.has(node.fixtureId)) return;
      visited.add(node.fixtureId);
      selected.push({ node, level: 0, relationshipHint: 'relative' });
    });

    const minimumLevel = Math.min(0, ...selected.map((entry) => entry.level));
    const nodes = selected.map((entry) => ({
      ...entry.node,
      generation: entry.level - minimumLevel + 1,
      relationshipHint: entry.relationshipHint,
    }));
    const keptNodeIds = new Set(nodes.map((node) => node.fixtureId));
    return {
      nodes: nodes.map(toRawNode),
      edges: filterEdgesForNodes(source.edges, keptNodeIds),
    };
  },
};

export const snapshotFixturePreviewGraphSelector: VisualPreviewGraphSelector<FixturePreviewSource> = {
  productType: 'snapshot',
  selectRawGraph(source, context): PreviewSanitizerRawGraph {
    const visibleIds = context.visibleNodeIds ? new Set(context.visibleNodeIds) : undefined;
    const nodes = visibleIds ? source.nodes.filter((node) => visibleIds.has(node.fixtureId)) : source.nodes;
    const keptNodeIds = new Set(nodes.map((node) => node.fixtureId));

    return {
      nodes: nodes.map(toRawNode),
      edges: filterEdgesForNodes(source.edges, keptNodeIds),
    };
  },
};

const fixtureSelectorMap: Record<VisualPreviewSelectorProduct, VisualPreviewGraphSelector<FixturePreviewSource>> = {
  poster: posterFixturePreviewGraphSelector,
  snapshot: snapshotFixturePreviewGraphSelector,
};

export function getFixtureVisualPreviewGraphSelector(
  productType: VisualPreviewSelectorProduct
): VisualPreviewGraphSelector<FixturePreviewSource> {
  return fixtureSelectorMap[productType];
}

export function listFixtureVisualPreviewGraphSelectors(): VisualPreviewGraphSelector<FixturePreviewSource>[] {
  return Object.values(fixtureSelectorMap);
}
