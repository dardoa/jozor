import { createPosterScene } from './posterSceneBuilder';
import type {
  PosterDocumentSpec,
  PosterCardScalePreset,
  PosterCardEffectPreset,
  PosterCardFramePreset,
  PosterCardCornerPreset,
  PosterCardLayoutPreset,
  PosterPageFramePreset,
  PosterHeaderPreset,
  PosterDecorationPreset,
  PosterOrnamentPreset,
  PosterConnectorStyle,
  PosterConnectorPathStyle,
  PosterSpacingPreset,
  PosterColorPalette,
  PosterColorOverrides,
  PosterLanguage,
  PosterLayoutSpec,
  PosterPhotoShape,
  PosterScene,
  PosterSceneTheme,
  PosterTypographyPreset,
  PosterFontFamily,
  PosterVisualStylePreset,
} from './posterSceneTypes';
import type {
  SanitizedPreviewEdge,
  SanitizedPreviewGraph,
  SanitizedPreviewNode,
} from './previewSanitizerTypes';

export interface BranchPosterCollectionRequest {
  readonly graph: SanitizedPreviewGraph;
  readonly anchorPreviewId: string;
  readonly collectionTitle: string;
  readonly language: PosterLanguage;
  readonly document: PosterDocumentSpec;
  readonly direction?: PosterLayoutSpec['direction'];
  readonly theme?: PosterSceneTheme;
  readonly stylePreset?: PosterVisualStylePreset;
  readonly photoShape?: PosterPhotoShape;
  readonly showYears?: boolean;
  readonly showRelationship?: boolean;
  readonly showBirthPlace?: boolean;
  readonly showOccupation?: boolean;
  readonly showDescription?: boolean;
  readonly connectorStyle?: PosterConnectorStyle;
  readonly connectorPathStyle?: PosterConnectorPathStyle;
  readonly spacingPreset?: PosterSpacingPreset;
  readonly colorPalette?: PosterColorPalette;
  readonly colorOverrides?: PosterColorOverrides;
  readonly decoration?: PosterDecorationPreset;
  readonly ornament?: PosterOrnamentPreset;
  readonly typographyPreset?: PosterTypographyPreset;
  readonly fontFamily?: PosterFontFamily;
  readonly cardScalePreset?: PosterCardScalePreset;
  readonly cardEffectPreset?: PosterCardEffectPreset;
  readonly cardFramePreset?: PosterCardFramePreset;
  readonly cardCornerPreset?: PosterCardCornerPreset;
  readonly cardLayoutPreset?: PosterCardLayoutPreset;
  readonly pageFramePreset?: PosterPageFramePreset;
  readonly headerPreset?: PosterHeaderPreset;
  readonly footerText?: string;
  readonly showJozorAttribution?: boolean;
}

export interface BranchPosterCollectionItem {
  readonly index: number;
  readonly branchRootPreviewId: string;
  readonly branchLabel: string;
  readonly graph: SanitizedPreviewGraph;
  readonly scene: PosterScene;
  readonly crossReferences: readonly string[];
}

export interface BranchPosterCollectionManifest {
  readonly version: 1;
  readonly product: 'branch-collection';
  readonly title: string;
  readonly anchorPreviewId: string;
  readonly itemCount: number;
  readonly representedPeople: number;
  readonly overviewScene: PosterScene;
  readonly items: readonly BranchPosterCollectionItem[];
  readonly warnings: readonly string[];
}

function createBranchIndexGraph(
  graph: SanitizedPreviewGraph,
  anchorPreviewId: string,
  items: readonly BranchPosterCollectionItem[],
  language: PosterLanguage
): SanitizedPreviewGraph {
  const nodeById = new Map(graph.nodes.map((node) => [node.previewId, node]));
  const anchor = nodeById.get(anchorPreviewId);
  if (!anchor) throw new Error('Branch collection anchor is not present in the sanitized graph');

  const peopleLabel = language === 'ar' ? '\u0639\u062f\u062f \u0627\u0644\u0623\u0634\u062e\u0627\u0635' : 'People';
  const nodes: SanitizedPreviewNode[] = [{
    ...anchor,
    generation: 1,
    relationshipHint: 'root',
    hasPhoto: false,
    birthYear: undefined,
    deathYear: undefined,
  }, ...items.map((item) => {
    const branchRoot = nodeById.get(item.branchRootPreviewId)!;
    const number = String(item.index).padStart(2, '0');
    return {
      ...branchRoot,
      displayName: `${number} \u00b7 ${branchRoot.displayName} \u00b7 ${peopleLabel}: ${item.graph.nodes.length}`,
      generation: 2,
      relationshipHint: 'child' as const,
      hasPhoto: false,
      birthYear: undefined,
      deathYear: undefined,
    };
  })];
  const edges: SanitizedPreviewEdge[] = items.map((item) => ({
    fromPreviewId: anchorPreviewId,
    toPreviewId: item.branchRootPreviewId,
    relationshipType: 'parent-child',
  }));

  return {
    nodes,
    edges,
    warnings: [],
    metadata: {
      truncated: false,
      originalNodeCount: nodes.length,
      sanitizedNodeCount: nodes.length,
      policy: {
        ...graph.metadata.policy,
        includePhotos: false,
        includeYears: false,
        maxNodes: nodes.length,
      },
    },
  };
}

function isDescendantEdge(edge: SanitizedPreviewEdge): boolean {
  return edge.relationshipType === 'parent-child' || edge.relationshipType === 'descendant';
}

function collectDescendantIds(
  rootId: string,
  outgoing: ReadonlyMap<string, readonly string[]>
): Set<string> {
  const result = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (result.has(current)) continue;
    result.add(current);
    for (const child of outgoing.get(current) ?? []) queue.push(child);
  }
  return result;
}

function includeDirectSpouses(
  descendantIds: ReadonlySet<string>,
  edges: readonly SanitizedPreviewEdge[]
): Set<string> {
  const included = new Set(descendantIds);
  edges.filter((edge) => edge.relationshipType === 'spouse').forEach((edge) => {
    if (descendantIds.has(edge.fromPreviewId)) included.add(edge.toPreviewId);
    if (descendantIds.has(edge.toPreviewId)) included.add(edge.fromPreviewId);
  });
  return included;
}

function normalizeBranchNodes(
  nodes: readonly SanitizedPreviewNode[],
  rootId: string,
  edges: readonly SanitizedPreviewEdge[]
): SanitizedPreviewNode[] {
  const generationById = new Map<string, number>([[rootId, 1]]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (isDescendantEdge(edge)) {
        const parentGeneration = generationById.get(edge.fromPreviewId);
        if (parentGeneration && !generationById.has(edge.toPreviewId)) {
          generationById.set(edge.toPreviewId, parentGeneration + 1);
          changed = true;
        }
      } else if (edge.relationshipType === 'spouse') {
        const fromGeneration = generationById.get(edge.fromPreviewId);
        const toGeneration = generationById.get(edge.toPreviewId);
        if (fromGeneration && !toGeneration) {
          generationById.set(edge.toPreviewId, fromGeneration);
          changed = true;
        } else if (toGeneration && !fromGeneration) {
          generationById.set(edge.fromPreviewId, toGeneration);
          changed = true;
        }
      }
    }
  }
  return nodes.map((node) => ({
    ...node,
    generation: generationById.get(node.previewId) ?? 1,
    relationshipHint: node.previewId === rootId ? 'root' : node.relationshipHint,
  }));
}

export function createBranchPosterCollection(
  request: BranchPosterCollectionRequest
): BranchPosterCollectionManifest {
  const { graph, anchorPreviewId } = request;
  if (!anchorPreviewId.startsWith('preview-node-')) {
    throw new Error('Branch collections accept session-isolated preview IDs only');
  }
  const nodeById = new Map(graph.nodes.map((node) => [node.previewId, node]));
  if (!nodeById.has(anchorPreviewId)) {
    throw new Error('Branch collection anchor is not present in the sanitized graph');
  }

  const outgoingMutable = new Map<string, string[]>();
  graph.edges.filter(isDescendantEdge).forEach((edge) => {
    const children = outgoingMutable.get(edge.fromPreviewId) ?? [];
    children.push(edge.toPreviewId);
    outgoingMutable.set(edge.fromPreviewId, children);
  });
  const outgoing = new Map(
    [...outgoingMutable.entries()].map(([id, children]) => [id, [...new Set(children)].sort()])
  );
  const branchRootIds = outgoing.get(anchorPreviewId) ?? [];

  const items = branchRootIds.flatMap((branchRootId, index) => {
    const branchRoot = nodeById.get(branchRootId);
    if (!branchRoot) return [];
    const descendantIds = collectDescendantIds(branchRootId, outgoing);
    const includedIds = includeDirectSpouses(descendantIds, graph.edges);
    const includedNodes = graph.nodes.filter((node) => includedIds.has(node.previewId));
    const includedEdges = graph.edges.filter((edge) => (
      includedIds.has(edge.fromPreviewId) && includedIds.has(edge.toPreviewId)
    ));
    const normalizedNodes = normalizeBranchNodes(includedNodes, branchRootId, includedEdges);
    const branchGraph: SanitizedPreviewGraph = {
      nodes: normalizedNodes,
      edges: includedEdges,
      warnings: graph.warnings,
      metadata: {
        ...graph.metadata,
        sanitizedNodeCount: normalizedNodes.length,
        originalNodeCount: normalizedNodes.length,
        truncated: false,
        policy: {
          ...graph.metadata.policy,
          maxNodes: normalizedNodes.length,
        },
      },
    };
    const crossReferences = graph.edges
      .filter((edge) => (
        includedIds.has(edge.fromPreviewId) !== includedIds.has(edge.toPreviewId)
      ))
      .map((edge) => includedIds.has(edge.fromPreviewId) ? edge.toPreviewId : edge.fromPreviewId)
      .filter((id) => id !== anchorPreviewId && nodeById.has(id));
    const branchNoun = request.language === 'ar' ? '\u0641\u0631\u0639' : 'Branch';
    const branchLabel = `${branchNoun} ${branchRoot.displayName}`;
    const scene = createPosterScene({
      graph: branchGraph,
      document: request.document,
      content: {
        definitionId: 'branch-collection-poster',
        language: request.language,
        title: branchLabel,
        subtitle: request.collectionTitle,
        scope: 'selected-root-descendants',
        rootPreviewId: branchRootId,
        generationCount: Math.max(1, ...normalizedNodes.map((node) => node.generation ?? 1)),
        privacyMode: graph.metadata.policy.privacyMode,
        showYears: request.showYears,
        showRelationship: request.showRelationship,
        showBirthPlace: request.showBirthPlace,
        showOccupation: request.showOccupation,
        showDescription: request.showDescription,
        footerText: request.footerText,
        showJozorAttribution: request.showJozorAttribution,
      },
      direction: request.direction ?? 'vertical',
      theme: request.theme,
      stylePreset: request.stylePreset,
      photoShape: request.photoShape,
      connectorStyle: request.connectorStyle,
      connectorPathStyle: request.connectorPathStyle,
      spacingPreset: request.spacingPreset,
      colorPalette: request.colorPalette,
      colorOverrides: request.colorOverrides,
      decoration: request.decoration,
      ornament: request.ornament,
      typographyPreset: request.typographyPreset,
      fontFamily: request.fontFamily,
      cardScalePreset: request.cardScalePreset ?? 'compact',
      cardEffectPreset: request.cardEffectPreset,
      cardFramePreset: request.cardFramePreset,
      cardCornerPreset: request.cardCornerPreset,
      cardLayoutPreset: request.cardLayoutPreset,
      pageFramePreset: request.pageFramePreset,
      headerPreset: request.headerPreset,
    });
    return [{
      index: index + 1,
      branchRootPreviewId: branchRootId,
      branchLabel,
      graph: branchGraph,
      scene,
      crossReferences: [...new Set(crossReferences)].sort(),
    }];
  });

  const representedPeople = new Set(items.flatMap((item) => (
    item.graph.nodes.map((node) => node.previewId)
  ))).size;
  const warnings = branchRootIds.length === 0
    ? ['poster.branch-collection.no-descendant-branches']
    : [];

  const branchIndexGraph = createBranchIndexGraph(graph, anchorPreviewId, items, request.language);
  const overviewScene = createPosterScene({
    graph: branchIndexGraph,
    document: request.document,
    content: {
      definitionId: 'branch-collection-overview',
      language: request.language,
      title: request.collectionTitle,
      subtitle: request.language === 'ar'
        ? `\u062f\u0644\u064a\u0644 \u0627\u0644\u0641\u0631\u0648\u0639 \u00b7 ${items.length} \u0644\u0648\u062d\u0627\u062a \u00b7 ${representedPeople} \u0634\u062e\u0635\u064b\u0627`
        : `Branch index \u00b7 ${items.length} posters \u00b7 ${representedPeople} people`,
      scope: 'selected-root-descendants',
      rootPreviewId: anchorPreviewId,
      generationCount: 2,
      privacyMode: graph.metadata.policy.privacyMode,
      showYears: false,
      showRelationship: false,
      showBirthPlace: false,
      showOccupation: false,
      showDescription: false,
      footerText: request.footerText,
      showJozorAttribution: request.showJozorAttribution,
    },
    direction: 'vertical',
    theme: request.theme,
    stylePreset: 'branch-index',
    connectorStyle: request.connectorStyle,
    connectorPathStyle: request.connectorPathStyle,
    spacingPreset: request.spacingPreset,
    colorPalette: request.colorPalette,
    colorOverrides: request.colorOverrides,
    decoration: request.decoration,
    ornament: request.ornament,
    typographyPreset: request.typographyPreset,
    fontFamily: request.fontFamily,
    cardScalePreset: request.cardScalePreset ?? 'compact',
    cardEffectPreset: request.cardEffectPreset,
    cardFramePreset: request.cardFramePreset,
    cardCornerPreset: request.cardCornerPreset,
    cardLayoutPreset: request.cardLayoutPreset,
    pageFramePreset: request.pageFramePreset,
    headerPreset: request.headerPreset,
  });

  return {
    version: 1,
    product: 'branch-collection',
    title: request.collectionTitle,
    anchorPreviewId,
    itemCount: items.length,
    representedPeople,
    overviewScene,
    items,
    warnings,
  };
}
