import type {
  PosterLayoutEngine,
  PosterLayoutEngineRequest,
  PosterLayoutEngineResult,
  PosterSceneNode,
} from './posterSceneTypes';

function createInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const first = parts[0] ? Array.from(parts[0])[0] ?? '' : '';
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? '' : '';
  return `${first}${last}`;
}

function fitNameFontSize(displayName: string, cardWidth: number, preferredSize: number): number {
  const characterCount = Math.max(1, Array.from(displayName.trim()).length);
  let size = Math.min(preferredSize, Math.max(9, cardWidth / 7));
  while (size > 8) {
    const charactersPerLine = Math.max(4, Math.floor((cardWidth - 24) / (size * 0.58)));
    if (characterCount <= charactersPerLine * 3) break;
    size -= 1;
  }
  return Math.round(size * 10) / 10;
}

function createNodes(request: PosterLayoutEngineRequest): PosterSceneNode[] {
  const { graph, layout, cardPreset, content } = request;
  if (graph.nodes.length === 0) return [];

  const groups = new Map<number, typeof graph.nodes[number][]>();
  graph.nodes.forEach((node) => {
    const generation = Math.max(1, node.generation ?? 1);
    const group = groups.get(generation) ?? [];
    group.push(node);
    groups.set(generation, group);
  });
  const generations = Array.from(groups.keys()).sort((a, b) => a - b);
  const largestGeneration = Math.max(...Array.from(groups.values()).map((group) => group.length));
  const vertical = layout.direction === 'vertical';
  const gap = layout.spacingPreset === 'compact' ? 8 : layout.spacingPreset === 'airy' ? 24 : 14;
  const crossSpan = vertical ? layout.treeBounds.width : layout.treeBounds.height;
  const cardWidth = vertical
    ? Math.min(cardPreset.geometry.maxWidth, Math.max(cardPreset.geometry.minWidth, (crossSpan / largestGeneration) - gap))
    : cardPreset.geometry.maxWidth;
  const cardHeight = vertical
    ? cardPreset.geometry.height
    : Math.min(cardPreset.geometry.height, Math.max(72, (crossSpan / largestGeneration) - gap));
  const primaryInset = vertical ? cardHeight / 2 + 10 : cardWidth / 2 + 10;

  return generations.flatMap((generation, generationIndex) => {
    const group = groups.get(generation) ?? [];
    const progress = generations.length === 1 ? 0.5 : generationIndex / (generations.length - 1);
    return group.map((node, index) => {
      const crossProgress = (index + 0.5) / group.length;
      let centerX: number;
      let centerY: number;
      if (vertical) {
        centerX = layout.treeBounds.x + (crossProgress * layout.treeBounds.width);
        centerY = layout.treeBounds.y + primaryInset
          + (progress * (layout.treeBounds.height - (primaryInset * 2)));
      } else {
        const leftToRightX = layout.treeBounds.x + primaryInset
          + (progress * (layout.treeBounds.width - (primaryInset * 2)));
        centerX = content.language === 'ar'
          ? layout.treeBounds.x + layout.treeBounds.width - (leftToRightX - layout.treeBounds.x)
          : leftToRightX;
        centerY = layout.treeBounds.y + (crossProgress * layout.treeBounds.height);
      }

      return {
        previewId: node.previewId,
        displayName: node.displayName,
        generation,
        isRoot: node.previewId === content.rootPreviewId || node.relationshipHint === 'root',
        isMasked: node.isMasked,
        hasPhoto: node.hasPhoto,
        birthYear: node.birthYear,
        deathYear: node.deathYear,
        relationshipHint: node.relationshipHint,
        birthPlaceLabel: node.birthPlaceLabel,
        occupationLabel: node.occupationLabel,
        descriptionLabel: node.descriptionLabel,
        initials: createInitials(node.displayName),
        nameFontSize: fitNameFontSize(node.displayName, cardWidth, cardPreset.typography.nameSize),
        rect: {
          x: centerX - (cardWidth / 2),
          y: centerY - (cardHeight / 2),
          width: cardWidth,
          height: cardHeight,
        },
      };
    });
  });
}

export const familyNetworkPosterLayoutEngine: PosterLayoutEngine = {
  id: 'family-network-tiered',
  createLayout(request): PosterLayoutEngineResult {
    const nodes = createNodes(request);
    const nodeById = new Map(nodes.map((node) => [node.previewId, node]));
    const connectors = request.graph.edges.flatMap((edge) => {
      const from = nodeById.get(edge.fromPreviewId);
      const to = nodeById.get(edge.toPreviewId);
      if (!from || !to) return [];

      const vertical = request.layout.direction === 'vertical';
      const sameTier = from.generation === to.generation;
      const fromCenter = {
        x: from.rect.x + (from.rect.width / 2),
        y: from.rect.y + (from.rect.height / 2),
      };
      const toCenter = {
        x: to.rect.x + (to.rect.width / 2),
        y: to.rect.y + (to.rect.height / 2),
      };

      return [{
        fromPreviewId: edge.fromPreviewId,
        toPreviewId: edge.toPreviewId,
        relationshipType: edge.relationshipType,
        start: sameTier
          ? { x: fromCenter.x, y: fromCenter.y }
          : vertical
            ? { x: fromCenter.x, y: fromCenter.y + (fromCenter.y < toCenter.y ? from.rect.height / 2 : -from.rect.height / 2) }
            : { x: fromCenter.x + (fromCenter.x < toCenter.x ? from.rect.width / 2 : -from.rect.width / 2), y: fromCenter.y },
        end: sameTier
          ? { x: toCenter.x, y: toCenter.y }
          : vertical
            ? { x: toCenter.x, y: toCenter.y + (fromCenter.y < toCenter.y ? -to.rect.height / 2 : to.rect.height / 2) }
            : { x: toCenter.x + (fromCenter.x < toCenter.x ? -to.rect.width / 2 : to.rect.width / 2), y: toCenter.y },
      }];
    });

    return {
      nodes,
      connectors,
      bounds: {
        page: { x: 0, y: 0, width: request.document.sceneSize.width, height: request.document.sceneSize.height },
        tree: request.layout.treeBounds,
        content: {
          x: request.document.margins.left,
          y: request.document.margins.top,
          width: request.document.sceneSize.width - request.document.margins.left - request.document.margins.right,
          height: request.document.sceneSize.height - request.document.margins.top - request.document.margins.bottom,
        },
      },
    };
  },
};
