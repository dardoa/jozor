import type { PosterPrivacyMode } from './posterStateContracts';
import type {
  PosterFocusDepth,
  PosterPersonTokenCatalog,
  PosterPersonTokenOption,
} from './posterSceneTypes';
import type {
  SanitizedPreviewGraph,
  SanitizedPreviewNode,
  VisualPreviewRelationshipHint,
} from './previewSanitizerTypes';
import { productionPreviewSanitizer } from './previewProductionSanitizer';
import type { PreviewLiveTreeSource } from './previewLiveGraphSelectors';
import type { FixturePreviewSource } from './previewFixtureGraphSelectors';

export interface FocusSelectionBoundaryRequest {
  readonly focalPersonToken: string;
  readonly ancestorDepth: PosterFocusDepth;
  readonly descendantDepth: PosterFocusDepth;
  readonly includeSpouses: boolean;
  readonly includeSiblings: boolean;
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

export interface FocusSelectionBoundaryResult {
  readonly sanitizedGraph: SanitizedPreviewGraph;
  readonly focalPreviewId: string;
  readonly warnings: readonly string[];
}

export interface RawPersonNode {
  readonly rawId: string;
  readonly displayName?: string;
  readonly isLiving?: boolean;
  readonly isPrivate?: boolean;
  readonly hasPhoto?: boolean;
  readonly birthDate?: string;
  readonly deathDate?: string;
  readonly birthPlace?: string;
  readonly occupation?: string;
  readonly description?: string;
}

export interface RawEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly relationshipType: 'parent-child' | 'spouse';
}

export interface RawGraph {
  readonly nodes: readonly RawPersonNode[];
  readonly edges: readonly RawEdge[];
}

/**
 * The resolver deliberately stays behind the publishing boundary. UI callers may read
 * token options, but never receive or reconstruct the corresponding raw identifier.
 */
export interface FocusTokenCatalogBoundary extends PosterPersonTokenCatalog {
  readonly hasToken: (token: string) => boolean;
  readonly resolveTokenInsideBoundary: (token: string) => string | undefined;
}

let tokenCatalogSequence = 0;

const createSessionNonce = (): string => {
  tokenCatalogSequence += 1;
  return `${Date.now().toString(36)}-${tokenCatalogSequence.toString(36)}`;
};

export function createFocusTokenCatalog(
  nodes: readonly RawPersonNode[],
  policy: Pick<FocusSelectionBoundaryRequest, 'language' | 'privacyMode'>
): FocusTokenCatalogBoundary {
  const tokenToRawId = new Map<string, string>();
  const sessionNonce = createSessionNonce();
  const tokens: PosterPersonTokenOption[] = nodes.map((node, index) => {
    const token = `session-token-${sessionNonce}-${(index + 1).toString(36)}`;
    tokenToRawId.set(token, node.rawId);
    const shouldMask = Boolean(node.isPrivate || (policy.privacyMode === 'masked' && node.isLiving));
    return {
      token,
      label: shouldMask
        ? policy.language === 'ar' ? 'شخص مخفي' : 'Masked person'
        : node.displayName || (policy.language === 'ar' ? `شخص ${index + 1}` : `Person ${index + 1}`),
    };
  });

  return {
    tokens,
    defaultToken: tokens[0]?.token,
    hasToken: (token) => tokenToRawId.has(token),
    resolveTokenInsideBoundary: (token) => tokenToRawId.get(token),
  };
}

export function createRawGraphFromLiveSource(source: PreviewLiveTreeSource): RawGraph {
  const nodes: RawPersonNode[] = Object.values(source.people).map((person) => ({
    rawId: person.rawId,
    displayName: person.displayName,
    isLiving: person.isLiving,
    isPrivate: person.isPrivate,
    hasPhoto: person.hasProfilePhoto,
    birthDate: person.birthDate,
    deathDate: person.deathDate,
    birthPlace: person.birthPlace,
    occupation: person.occupation,
    description: person.description,
  }));
  const edges: RawEdge[] = source.relationships.flatMap<RawEdge>((relationship) => {
    if (relationship.relationshipType === 'spouse') {
      return [{
        fromId: relationship.fromRawId,
        toId: relationship.toRawId,
        relationshipType: 'spouse' as const,
      }];
    }
    if (relationship.relationshipType === 'parent-child' || relationship.relationshipType === 'ancestor') {
      return [{
        fromId: relationship.fromRawId,
        toId: relationship.toRawId,
        relationshipType: 'parent-child' as const,
      }];
    }
    return [];
  });
  return { nodes, edges };
}

export function createRawGraphFromFixtureSource(source: FixturePreviewSource): RawGraph {
  const nodes: RawPersonNode[] = source.nodes.map((node) => ({
    rawId: node.fixtureId,
    displayName: node.displayName,
    isLiving: node.isLiving,
    isPrivate: node.isPrivate,
    hasPhoto: node.hasProfilePhoto,
    birthDate: node.birthDate,
    deathDate: node.deathDate,
  }));
  const edges: RawEdge[] = source.edges.flatMap<RawEdge>((edge) => {
    if (edge.relationshipType === 'spouse') {
      return [{ fromId: edge.fromFixtureId, toId: edge.toFixtureId, relationshipType: 'spouse' as const }];
    }
    if (edge.relationshipType === 'parent-child' || edge.relationshipType === 'ancestor') {
      return [{ fromId: edge.fromFixtureId, toId: edge.toFixtureId, relationshipType: 'parent-child' as const }];
    }
    return [];
  });
  return { nodes, edges };
}

export function selectFocusGraphBoundary(
  rawGraph: RawGraph,
  tokenCatalog: FocusTokenCatalogBoundary,
  request: FocusSelectionBoundaryRequest
): FocusSelectionBoundaryResult {
  const effectiveMaxNodes = Math.max(1, Math.min(50, request.maxNodes ?? 50));
  const rawFocalId = tokenCatalog.resolveTokenInsideBoundary(request.focalPersonToken);
  if (!rawFocalId) {
    throw new Error('Focus selection error: Focal person token could not be resolved in this session.');
  }

  const nodeMap = new Map(rawGraph.nodes.map((node) => [node.rawId, node]));
  if (!nodeMap.has(rawFocalId)) {
    throw new Error('Focus selection error: Focal person is not available in the current graph.');
  }

  const parentsOf = new Map<string, string[]>();
  const childrenOf = new Map<string, string[]>();
  const spousesOf = new Map<string, string[]>();
  rawGraph.edges.forEach((edge) => {
    if (edge.relationshipType === 'spouse') {
      spousesOf.set(edge.fromId, [...(spousesOf.get(edge.fromId) ?? []), edge.toId]);
      spousesOf.set(edge.toId, [...(spousesOf.get(edge.toId) ?? []), edge.fromId]);
      return;
    }
    parentsOf.set(edge.toId, [...(parentsOf.get(edge.toId) ?? []), edge.fromId]);
    childrenOf.set(edge.fromId, [...(childrenOf.get(edge.fromId) ?? []), edge.toId]);
  });

  const selected = new Map<string, { generation: number; hint: VisualPreviewRelationshipHint }>();
  selected.set(rawFocalId, { generation: 1, hint: 'root' });
  const depthLimit = (depth: PosterFocusDepth): number => depth === 'all' ? Number.POSITIVE_INFINITY : depth;

  const traverse = (
    adjacency: ReadonlyMap<string, readonly string[]>,
    limit: number,
    hint: 'ancestor' | 'descendant'
  ) => {
    const queue: Array<{ rawId: string; depth: number }> = [{ rawId: rawFocalId, depth: 0 }];
    const visited = new Set<string>([rawFocalId]);
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.depth >= limit) continue;
      (adjacency.get(current.rawId) ?? []).forEach((nextRawId) => {
        if (visited.has(nextRawId) || !nodeMap.has(nextRawId)) return;
        visited.add(nextRawId);
        const nextDepth = current.depth + 1;
        if (!selected.has(nextRawId)) {
          selected.set(nextRawId, { generation: nextDepth + 1, hint });
        }
        queue.push({ rawId: nextRawId, depth: nextDepth });
      });
    }
  };

  traverse(parentsOf, depthLimit(request.ancestorDepth), 'ancestor');
  traverse(childrenOf, depthLimit(request.descendantDepth), 'descendant');

  if (request.includeSpouses) {
    (spousesOf.get(rawFocalId) ?? []).forEach((rawId) => {
      if (nodeMap.has(rawId) && !selected.has(rawId)) selected.set(rawId, { generation: 1, hint: 'spouse' });
    });
  }
  if (request.includeSiblings) {
    (parentsOf.get(rawFocalId) ?? []).forEach((parentId) => {
      (childrenOf.get(parentId) ?? []).forEach((rawId) => {
        if (rawId !== rawFocalId && nodeMap.has(rawId) && !selected.has(rawId)) {
          selected.set(rawId, { generation: 1, hint: 'relative' });
        }
      });
    });
  }

  const orderedIds = [rawFocalId, ...Array.from(selected.keys()).filter((rawId) => rawId !== rawFocalId)];
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
    .filter((edge) => finalIdSet.has(edge.fromId) && finalIdSet.has(edge.toId))
    .map((edge) => ({
      fromRawId: edge.fromId,
      toRawId: edge.toId,
      relationshipType: edge.relationshipType,
    }));

  const sanitized = productionPreviewSanitizer.sanitize(
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
  const sanitizedNodes: SanitizedPreviewNode[] = sanitized.nodes.map((node, index) =>
    index === 0 ? { ...node, relationshipHint: 'root' } : node
  );
  const rootNodes = sanitizedNodes.filter((node) => node.relationshipHint === 'root');
  if (rootNodes.length !== 1) {
    throw new Error(`Sanitizer invariant violation: expected one focal root, found ${rootNodes.length}.`);
  }
  const previewIds = new Set(sanitizedNodes.map((node) => node.previewId));
  const cleanEdges = sanitized.edges.filter(
    (edge) => previewIds.has(edge.fromPreviewId) && previewIds.has(edge.toPreviewId)
  );
  const warnings = [...sanitized.warnings];
  if (truncated) warnings.push(`Focus family selection truncated to maximum ${effectiveMaxNodes} nodes.`);
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

  return { sanitizedGraph, focalPreviewId: rootNodes[0].previewId, warnings };
}
