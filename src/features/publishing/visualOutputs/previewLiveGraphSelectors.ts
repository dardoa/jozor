import type {
  PreviewSanitizerRawEdge,
  PreviewSanitizerRawGraph,
  PreviewSanitizerRawNode,
} from './previewProductionSanitizer';
import type { VisualPreviewGraphSelector } from './previewGraphSelectorTypes';
import type { VisualPreviewRelationshipHint } from './previewSanitizerTypes';

export interface PreviewLiveSourceBoundary {
  readonly sourceKind?: 'store' | 'indexeddb' | 'fixture' | 'unknown';
}

export interface PreviewLivePersonRecord {
  readonly rawId: string;
  readonly displayName?: string;
  readonly isLiving?: boolean;
  readonly isPrivate?: boolean;
  readonly birthDate?: string;
  readonly deathDate?: string;
  readonly birthPlace?: string;
  readonly occupation?: string;
  readonly description?: string;
  readonly hasProfilePhoto?: boolean;
}

export interface PreviewLiveRelationshipRecord {
  readonly fromRawId: string;
  readonly toRawId: string;
  readonly relationshipType: 'parent-child' | 'spouse' | 'ancestor' | 'descendant' | 'relative';
}

export interface PreviewLiveTreeSource extends PreviewLiveSourceBoundary {
  readonly sourceSessionKey?: string;
  readonly defaultRootRawId?: string;
  readonly people: Record<string, PreviewLivePersonRecord>;
  readonly relationships: readonly PreviewLiveRelationshipRecord[];
}

const EMPTY_PREVIEW_GRAPH: PreviewSanitizerRawGraph = {
  nodes: [],
  edges: [],
};

const toRawNode = (
  person: PreviewLivePersonRecord,
  generation: number,
  relationshipHint: VisualPreviewRelationshipHint
): PreviewSanitizerRawNode => ({
  rawId: person.rawId,
  displayName: person.displayName,
  isLiving: person.isLiving,
  isPrivate: person.isPrivate,
  generation,
  relationshipHint,
  birthDate: person.birthDate,
  deathDate: person.deathDate,
  birthPlace: person.birthPlace,
  occupation: person.occupation,
  description: person.description,
  hasProfilePhoto: person.hasProfilePhoto,
});

const isParentRelationship = (relationship: PreviewLiveRelationshipRecord): boolean =>
  relationship.relationshipType === 'parent-child' || relationship.relationshipType === 'ancestor';

const resolveRootInsideBoundary = (
  source: PreviewLiveTreeSource,
  context: Parameters<VisualPreviewGraphSelector<PreviewLiveTreeSource>['selectRawGraph']>[1]
): string | undefined => (
  context.tokenCatalog && context.rootPersonToken
    ? context.tokenCatalog.resolveTokenInsideBoundary(context.rootPersonToken)
    : undefined
) ?? context.rootPersonId ?? source.defaultRootRawId ?? Object.keys(source.people)[0];

function selectDirectionalPosterGraph(
  source: PreviewLiveTreeSource,
  context: Parameters<VisualPreviewGraphSelector<PreviewLiveTreeSource>['selectRawGraph']>[1],
  direction: 'ancestor' | 'descendant'
): PreviewSanitizerRawGraph {
  const resolvedRootId = resolveRootInsideBoundary(source, context);

  if (!resolvedRootId) return EMPTY_PREVIEW_GRAPH;

  const root = source.people[resolvedRootId];
  if (!root) return EMPTY_PREVIEW_GRAPH;

  const maxDepth = context.maxDepth === 'all'
    ? Number.POSITIVE_INFINITY
    : context.maxDepth ?? 4;
  const maxNodes = Math.max(1, context.maxNodes);
  const selectionLimit = maxNodes + 1;
  const queued: Array<{ rawId: string; generation: number; relationshipHint: VisualPreviewRelationshipHint }> = [
    { rawId: root.rawId, generation: 1, relationshipHint: 'root' },
  ];
  const visited = new Set<string>();
  const selectedNodes: PreviewSanitizerRawNode[] = [];

  while (queued.length > 0 && selectedNodes.length < selectionLimit) {
    const current = queued.shift()!;
    if (visited.has(current.rawId)) continue;
    visited.add(current.rawId);

    const person = source.people[current.rawId];
    if (!person) continue;

    selectedNodes.push(toRawNode(person, current.generation, current.relationshipHint));
    if (current.generation >= maxDepth) continue;

    source.relationships
      .filter((relationship) => {
        if (!isParentRelationship(relationship)) return false;
        return direction === 'ancestor'
          ? relationship.toRawId === current.rawId
          : relationship.fromRawId === current.rawId;
      })
      .forEach((relationship) => {
        const nextRawId = direction === 'ancestor'
          ? relationship.fromRawId
          : relationship.toRawId;
        if (!visited.has(nextRawId) && source.people[nextRawId]) {
          queued.push({
            rawId: nextRawId,
            generation: current.generation + 1,
            relationshipHint: direction,
          });
        }
      });
  }

  const selectedIds = new Set(selectedNodes.map((node) => node.rawId));
  const selectedEdges: PreviewSanitizerRawEdge[] = source.relationships
    .filter(
      (relationship) =>
        isParentRelationship(relationship) &&
        selectedIds.has(relationship.fromRawId) &&
        selectedIds.has(relationship.toRawId)
    )
    .map((relationship) => ({
      fromRawId: relationship.fromRawId,
      toRawId: relationship.toRawId,
      relationshipType: 'parent-child',
    }));

  return { nodes: selectedNodes, edges: selectedEdges };
}

/**
 * Production selector skeleton for poster previews.
 *
 * This is intentionally not wired to Redux, IndexedDB, or the runtime selector registry.
 * It accepts a minimal PreviewLiveTreeSource shape and returns only PreviewSanitizerRawGraph.
 */
export const selectPosterPreviewGraph: VisualPreviewGraphSelector<PreviewLiveTreeSource> = {
  productType: 'poster',
  selectRawGraph(source, context): PreviewSanitizerRawGraph {
    return selectDirectionalPosterGraph(source, context, 'ancestor');
  },
};

export const selectDescendantPosterPreviewGraph: VisualPreviewGraphSelector<PreviewLiveTreeSource> = {
  productType: 'poster',
  selectRawGraph(source, context): PreviewSanitizerRawGraph {
    return selectDirectionalPosterGraph(source, context, 'descendant');
  },
};

export const selectFullTreePosterPreviewGraph: VisualPreviewGraphSelector<PreviewLiveTreeSource> = {
  productType: 'poster',
  selectRawGraph(source, context): PreviewSanitizerRawGraph {
    const resolvedRootId = resolveRootInsideBoundary(source, context);
    if (!resolvedRootId || !source.people[resolvedRootId]) return EMPTY_PREVIEW_GRAPH;

    const maxNodes = Math.max(1, context.maxNodes);
    const selectionLimit = maxNodes + 1;
    const queue: Array<{
      rawId: string;
      level: number;
      relationshipHint: VisualPreviewRelationshipHint;
    }> = [{ rawId: resolvedRootId, level: 0, relationshipHint: 'root' }];
    const visited = new Set<string>();
    const selected: Array<{
      person: PreviewLivePersonRecord;
      level: number;
      relationshipHint: VisualPreviewRelationshipHint;
    }> = [];

    while (queue.length > 0 && selected.length < selectionLimit) {
      const current = queue.shift()!;
      if (visited.has(current.rawId)) continue;
      visited.add(current.rawId);
      const person = source.people[current.rawId];
      if (!person) continue;
      selected.push({ person, level: current.level, relationshipHint: current.relationshipHint });

      source.relationships.forEach((relationship) => {
        const isFrom = relationship.fromRawId === current.rawId;
        const isTo = relationship.toRawId === current.rawId;
        if (!isFrom && !isTo) return;
        const nextRawId = isFrom ? relationship.toRawId : relationship.fromRawId;
        if (visited.has(nextRawId) || !source.people[nextRawId]) return;

        let level = current.level;
        let relationshipHint: VisualPreviewRelationshipHint = 'relative';
        if (isParentRelationship(relationship)) {
          level += isFrom ? 1 : -1;
          relationshipHint = isFrom ? 'descendant' : 'ancestor';
        } else if (relationship.relationshipType === 'spouse') {
          relationshipHint = 'spouse';
        }
        queue.push({ rawId: nextRawId, level, relationshipHint });
      });
    }

    Object.values(source.people).forEach((person) => {
      if (selected.length >= selectionLimit || visited.has(person.rawId)) return;
      visited.add(person.rawId);
      selected.push({ person, level: 0, relationshipHint: 'relative' });
    });

    const minimumLevel = Math.min(0, ...selected.map((entry) => entry.level));
    const selectedNodes = selected.map((entry) => toRawNode(
      entry.person,
      entry.level - minimumLevel + 1,
      entry.relationshipHint
    ));
    const selectedIds = new Set(selectedNodes.map((node) => node.rawId));
    const selectedEdges: PreviewSanitizerRawEdge[] = source.relationships
      .filter((relationship) =>
        selectedIds.has(relationship.fromRawId) && selectedIds.has(relationship.toRawId)
      )
      .map((relationship) => ({
        fromRawId: relationship.fromRawId,
        toRawId: relationship.toRawId,
        relationshipType: relationship.relationshipType,
      }));

    return { nodes: selectedNodes, edges: selectedEdges };
  },
};

/**
 * Production selector skeleton for tree snapshot previews.
 *
 * This is intentionally not wired to Redux, IndexedDB, or the runtime selector registry.
 * It only uses explicit visible node ids from selector context.
 */
export const selectSnapshotPreviewGraph: VisualPreviewGraphSelector<PreviewLiveTreeSource> = {
  productType: 'snapshot',
  selectRawGraph(source, context): PreviewSanitizerRawGraph {
    if (!context.visibleNodeIds || context.visibleNodeIds.length === 0) return EMPTY_PREVIEW_GRAPH;

    const visibleIds = new Set(context.visibleNodeIds.slice(0, Math.max(1, context.maxNodes)));
    const selectedNodes = Array.from(visibleIds)
      .map((rawId) => source.people[rawId])
      .filter((person): person is PreviewLivePersonRecord => Boolean(person))
      .map((person, index) => toRawNode(person, index + 1, index === 0 ? 'root' : 'relative'));

    const selectedIds = new Set(selectedNodes.map((node) => node.rawId));
    const selectedEdges: PreviewSanitizerRawEdge[] = source.relationships
      .filter(
        (relationship) =>
          selectedIds.has(relationship.fromRawId) &&
          selectedIds.has(relationship.toRawId)
      )
      .map((relationship) => ({
        fromRawId: relationship.fromRawId,
        toRawId: relationship.toRawId,
        relationshipType: relationship.relationshipType === 'spouse' ? 'spouse' : 'parent-child',
      }));

    return {
      nodes: selectedNodes,
      edges: selectedEdges,
    };
  },
};

export const livePreviewGraphSelectorSkeletons = [
  selectPosterPreviewGraph,
  selectSnapshotPreviewGraph,
] as const;
