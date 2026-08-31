import type { PosterPrivacyMode, PosterRadialTreeScope } from './posterStateContracts';
import type {
  SanitizedPreviewGraph,
  SanitizedPreviewNode,
  VisualPreviewRelationshipHint,
} from './previewSanitizerTypes';
import { sanitizeProductionPreviewGraphBoundary } from './previewProductionSanitizer';
import type { RawGraph } from './previewFocusGraphSelector';
import type { PosterPersonTokenCatalogBoundary } from './posterPersonTokenCatalog';

export interface RadialSelectionBoundaryRequest {
  readonly rootPersonToken: string;
  readonly scope: PosterRadialTreeScope;
  readonly generationRings: number;
  readonly privacyMode: PosterPrivacyMode;
  readonly language: 'ar' | 'en';
  readonly includePhotos?: boolean;
  readonly hideLivingPhotos?: boolean;
  readonly includeYears?: boolean;
  readonly includeBirthPlace?: boolean;
  readonly includeOccupation?: boolean;
  readonly includeDescription?: boolean;
  readonly maxNodes?: number;
}

export interface RadialSelectionBoundaryResult {
  readonly sanitizedGraph: SanitizedPreviewGraph;
  readonly focalPreviewId: string;
  readonly warnings: readonly string[];
  readonly resolvePreviewIdInsideBoundary: (previewId: string) => string | undefined;
}

export function selectRadialGraphBoundary(
  rawGraph: RawGraph,
  tokenCatalog: PosterPersonTokenCatalogBoundary,
  request: RadialSelectionBoundaryRequest
): RadialSelectionBoundaryResult {
  const effectiveMaxNodes = Math.max(1, Math.min(100, request.maxNodes ?? 100));

  const rawRootId = tokenCatalog.resolveTokenInsideBoundary(request.rootPersonToken);
  if (!rawRootId) {
    throw new Error('Radial selection error: Root person token could not be resolved in this session.');
  }

  const nodeMap = new Map(rawGraph.nodes.map((node) => [node.rawId, node]));
  if (!nodeMap.has(rawRootId)) {
    throw new Error('Radial selection error: Root person is not available in the current graph.');
  }

  if (request.scope !== 'ancestors' && request.scope !== 'descendants') {
    throw new Error(`Radial selection error: Invalid scope '${String(request.scope)}'. Must be 'ancestors' or 'descendants'.`);
  }

  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  rawGraph.edges.forEach((edge) => {
    if (edge.relationshipType === 'parent-child') {
      parentsOf.set(edge.toId, [...(parentsOf.get(edge.toId) ?? []), edge.fromId]);
      childrenOf.set(edge.fromId, [...(childrenOf.get(edge.fromId) ?? []), edge.toId]);
    }
  });

  const selected = new Map<string, { generation: number; hint: VisualPreviewRelationshipHint }>();
  selected.set(rawRootId, { generation: 1, hint: 'root' });

  const maxDepth = Math.max(1, request.generationRings - 1);
  const adjacencyMap = request.scope === 'ancestors' ? parentsOf : childrenOf;
  const hint: VisualPreviewRelationshipHint = request.scope === 'ancestors' ? 'ancestor' : 'descendant';

  const queue: Array<{ rawId: string; depth: number }> = [{ rawId: rawRootId, depth: 0 }];
  const visited = new Set<string>([rawRootId]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.depth >= maxDepth) continue;

    (adjacencyMap.get(current.rawId) ?? []).forEach((nextRawId) => {
      if (visited.has(nextRawId) || !nodeMap.has(nextRawId)) return;
      visited.add(nextRawId);
      const nextDepth = current.depth + 1;
      if (!selected.has(nextRawId)) {
        selected.set(nextRawId, { generation: nextDepth + 1, hint });
      }
      queue.push({ rawId: nextRawId, depth: nextDepth });
    });
  }

  const orderedIds = [rawRootId, ...Array.from(selected.keys()).filter((rawId) => rawId !== rawRootId)];
  const truncated = orderedIds.length > effectiveMaxNodes;
  const finalIds = orderedIds.slice(0, effectiveMaxNodes);
  const finalIdSet = new Set(finalIds);

  const sanitizerNodes = finalIds.map((rawId) => {
    const node = nodeMap.get(rawId)!;
    const metadata = selected.get(rawId)!;
    return {
      rawId,
      displayName: node.displayName,
      isLiving: node.isLiving,
      isPrivate: node.isPrivate,
      generation: metadata.generation,
      relationshipHint: metadata.hint,
      birthDate: node.birthDate,
      deathDate: node.deathDate,
      birthPlace: node.birthPlace,
      occupation: node.occupation,
      description: node.description,
      hasProfilePhoto: node.hasPhoto,
    };
  });

  const sanitizerEdges = rawGraph.edges
    .filter((edge) => edge.relationshipType === 'parent-child' && finalIdSet.has(edge.fromId) && finalIdSet.has(edge.toId))
    .map((edge) => ({
      fromRawId: edge.fromId,
      toRawId: edge.toId,
      relationshipType: 'parent-child' as const,
    }));

  const sanitizationBoundary = sanitizeProductionPreviewGraphBoundary(
    { nodes: sanitizerNodes, edges: sanitizerEdges },
    {
      privacyMode: request.privacyMode,
      language: request.language,
      maxNodes: effectiveMaxNodes,
      includePhotos: request.includePhotos ?? true,
      hideLivingPhotos: request.hideLivingPhotos ?? true,
      includeYears: request.includeYears ?? true,
      includeBirthPlace: request.includeBirthPlace,
      includeOccupation: request.includeOccupation,
      includeDescription: request.includeDescription,
    }
  );
  const sanitized = sanitizationBoundary.sanitizedGraph;

  const sanitizedNodes: SanitizedPreviewNode[] = sanitized.nodes.map((node, index) =>
    index === 0 ? { ...node, relationshipHint: 'root' } : node
  );

  const rootNodes = sanitizedNodes.filter((node) => node.relationshipHint === 'root');
  if (rootNodes.length !== 1) {
    throw new Error(`Radial sanitizer invariant violation: expected one root node, found ${rootNodes.length}.`);
  }

  const previewIds = new Set(sanitizedNodes.map((node) => node.previewId));
  const cleanEdges = sanitized.edges.filter(
    (edge) => previewIds.has(edge.fromPreviewId) && previewIds.has(edge.toPreviewId)
  );

  const warnings = [...sanitized.warnings];
  if (truncated) warnings.push(`Radial selection truncated to maximum ${effectiveMaxNodes} nodes.`);

  const sanitizedGraph: SanitizedPreviewGraph = {
    ...sanitized,
    nodes: sanitizedNodes,
    edges: cleanEdges,
    warnings,
    metadata: {
      ...sanitized.metadata,
      truncated: truncated || sanitized.metadata.truncated,
      sanitizedNodeCount: sanitizedNodes.length,
    },
  };

  return {
    sanitizedGraph,
    focalPreviewId: rootNodes[0].previewId,
    warnings,
    resolvePreviewIdInsideBoundary: sanitizationBoundary.resolvePreviewIdInsideBoundary,
  };
}
