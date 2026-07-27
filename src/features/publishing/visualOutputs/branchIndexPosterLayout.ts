import type { SanitizedPreviewNode } from './previewSanitizerTypes';
import type {
  PosterLayoutEngine,
  PosterLayoutEngineRequest,
  PosterLayoutEngineResult,
  PosterSceneNode,
} from './posterSceneTypes';

function createInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  return `${Array.from(parts[0] ?? '')[0] ?? ''}${Array.from(parts.at(-1) ?? '')[0] ?? ''}`;
}

function createSceneNode(
  node: SanitizedPreviewNode,
  request: PosterLayoutEngineRequest,
  rect: PosterSceneNode['rect'],
  isRoot: boolean
): PosterSceneNode {
  return {
    previewId: node.previewId,
    displayName: node.displayName,
    generation: isRoot ? 1 : 2,
    isRoot,
    isMasked: node.isMasked,
    hasPhoto: false,
    relationshipHint: node.relationshipHint,
    birthPlaceLabel: undefined,
    occupationLabel: undefined,
    descriptionLabel: undefined,
    initials: createInitials(node.displayName),
    nameFontSize: request.cardPreset.typography.nameSize,
    rect,
  };
}

export const branchIndexPosterLayoutEngine: PosterLayoutEngine = {
  id: 'branch-index-grid',
  createLayout(request): PosterLayoutEngineResult {
    const { graph, layout, cardPreset, document, content } = request;
    const root = graph.nodes.find((node) => node.previewId === content.rootPreviewId)
      ?? graph.nodes.find((node) => node.relationshipHint === 'root')
      ?? graph.nodes[0];
    if (!root) {
      return {
        nodes: [],
        connectors: [],
        bounds: {
          page: { x: 0, y: 0, width: document.sceneSize.width, height: document.sceneSize.height },
          tree: layout.treeBounds,
          content: layout.treeBounds,
        },
      };
    }

    const branchNodes = graph.nodes.filter((node) => node.previewId !== root.previewId);
    const cardWidth = cardPreset.geometry.maxWidth;
    const cardHeight = cardPreset.geometry.height;
    const spacingScale = layout.spacingPreset === 'compact' ? 0.78 : layout.spacingPreset === 'airy' ? 1.28 : 1;
    const horizontalGap = Math.max(26, cardWidth * 0.32 * spacingScale);
    const verticalGap = Math.max(34, cardHeight * 0.48 * spacingScale);
    const maximumColumns = Math.max(1, Math.floor(
      (layout.treeBounds.width + horizontalGap) / (cardWidth + horizontalGap)
    ));
    const preferredColumns = Math.max(1, Math.ceil(Math.sqrt(branchNodes.length * 1.55)));
    const columns = Math.min(branchNodes.length || 1, maximumColumns, preferredColumns);
    const rows = Math.max(1, Math.ceil(branchNodes.length / columns));
    const gridHeight = (rows * cardHeight) + ((rows - 1) * verticalGap);
    const rootGap = Math.max(120, verticalGap * 1.6);
    const compositionHeight = cardHeight + rootGap + gridHeight;
    const rootY = layout.treeBounds.y + Math.max(
      0,
      (layout.treeBounds.height - compositionHeight) / 2
    );
    const gridTop = rootY + cardHeight + rootGap;
    const rootRect = {
      x: layout.treeBounds.x + ((layout.treeBounds.width - cardWidth) / 2),
      y: rootY,
      width: cardWidth,
      height: cardHeight,
    };
    const rootSceneNode = createSceneNode(root, request, rootRect, true);
    const branchSceneNodes = branchNodes.map((node, index) => {
      const row = Math.floor(index / columns);
      const column = index % columns;
      const itemsInRow = Math.min(columns, branchNodes.length - (row * columns));
      const rowWidth = (itemsInRow * cardWidth) + ((itemsInRow - 1) * horizontalGap);
      const rowLeft = layout.treeBounds.x + ((layout.treeBounds.width - rowWidth) / 2);
      return createSceneNode(node, request, {
        x: rowLeft + (column * (cardWidth + horizontalGap)),
        y: gridTop + (row * (cardHeight + verticalGap)),
        width: cardWidth,
        height: cardHeight,
      }, false);
    });
    const connectors = branchSceneNodes.map((node) => ({
      fromPreviewId: root.previewId,
      toPreviewId: node.previewId,
      relationshipType: 'parent-child' as const,
      start: {
        x: rootRect.x + (rootRect.width / 2),
        y: rootRect.y + rootRect.height,
      },
      end: {
        x: node.rect.x + (node.rect.width / 2),
        y: node.rect.y,
      },
    }));

    return {
      nodes: [rootSceneNode, ...branchSceneNodes],
      connectors,
      bounds: {
        page: { x: 0, y: 0, width: document.sceneSize.width, height: document.sceneSize.height },
        tree: layout.treeBounds,
        content: {
          x: document.margins.left,
          y: document.margins.top,
          width: document.sceneSize.width - document.margins.left - document.margins.right,
          height: document.sceneSize.height - document.margins.top - document.margins.bottom,
        },
      },
    };
  },
};
