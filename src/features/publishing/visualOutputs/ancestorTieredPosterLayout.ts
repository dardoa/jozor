import type { SanitizedPreviewNode } from './previewSanitizerTypes';
import type {
  PosterLayoutEngine,
  PosterLayoutEngineRequest,
  PosterLayoutEngineResult,
  PosterSceneNode,
} from './posterSceneTypes';

interface AncestorPosition {
  readonly node: SanitizedPreviewNode;
  readonly generation: number;
  readonly lineageSlot: number;
}

type TieredPosterFlow = 'ancestor' | 'descendant';

function collectReachablePeople(
  request: PosterLayoutEngineRequest,
  flow: TieredPosterFlow
): AncestorPosition[] {
  const { graph, content } = request;
  const nodeById = new Map(graph.nodes.map((node) => [node.previewId, node]));
  const nodeOrder = new Map(graph.nodes.map((node, index) => [node.previewId, index]));
  const root = graph.nodes.find((node) => node.previewId === content.rootPreviewId)
    ?? graph.nodes.find((node) => node.relationshipHint === 'root')
    ?? graph.nodes.find((node) => (node.generation ?? 1) === 1)
    ?? graph.nodes[0];

  if (!root) return [];

  const positions = new Map<string, AncestorPosition>();
  positions.set(root.previewId, { node: root, generation: 1, lineageSlot: 0 });
  const queue = [root.previewId];
  const nextSlotByGeneration = new Map<number, number>();

  while (queue.length > 0) {
    const childId = queue.shift()!;
    const childPosition = positions.get(childId);
    if (!childPosition || childPosition.generation >= content.generationCount) continue;

    const nextEdges = graph.edges
      .filter((edge) => edge.relationshipType === 'parent-child' && (
        flow === 'ancestor'
          ? edge.toPreviewId === childId
          : edge.fromPreviewId === childId
      ))
      .sort((a, b) => {
        const aId = flow === 'ancestor' ? a.fromPreviewId : a.toPreviewId;
        const bId = flow === 'ancestor' ? b.fromPreviewId : b.toPreviewId;
        return (nodeOrder.get(aId) ?? 0) - (nodeOrder.get(bId) ?? 0);
      });
    const boundedEdges = flow === 'ancestor' ? nextEdges.slice(0, 2) : nextEdges;

    boundedEdges.forEach((edge, branchIndex) => {
        const nextId = flow === 'ancestor' ? edge.fromPreviewId : edge.toPreviewId;
        const nextNode = nodeById.get(nextId);
        if (!nextNode || positions.has(nextNode.previewId)) return;
        const nextGeneration = childPosition.generation + 1;
        const lineageSlot = flow === 'ancestor'
          ? (childPosition.lineageSlot * 2) + branchIndex
          : nextSlotByGeneration.get(nextGeneration) ?? 0;
        nextSlotByGeneration.set(nextGeneration, lineageSlot + 1);
        positions.set(nextNode.previewId, {
          node: nextNode,
          generation: childPosition.generation + 1,
          lineageSlot,
        });
        queue.push(nextNode.previewId);
      });
  }

  if (flow === 'descendant') {
    const positionedPeople = Array.from(positions.values());
    positionedPeople.forEach((position) => {
      const spouseEdges = graph.edges.filter((edge) =>
        edge.relationshipType === 'spouse'
        && (edge.fromPreviewId === position.node.previewId || edge.toPreviewId === position.node.previewId)
      );

      spouseEdges.forEach((edge, spouseIndex) => {
        const spouseId = edge.fromPreviewId === position.node.previewId
          ? edge.toPreviewId
          : edge.fromPreviewId;
        const spouse = nodeById.get(spouseId);
        if (!spouse || positions.has(spouseId)) return;

        positions.set(spouseId, {
          node: spouse,
          generation: position.generation,
          lineageSlot: position.lineageSlot + ((spouseIndex + 1) * 0.25),
        });
      });
    });
  }

  return Array.from(positions.values()).sort((a, b) =>
    a.generation - b.generation || a.lineageSlot - b.lineageSlot
  );
}

function createInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  const first = Array.from(parts[0])[0] ?? '';
  const last = parts.length > 1 ? Array.from(parts[parts.length - 1])[0] ?? '' : '';
  return `${first}${last}`;
}

function fitNameFontSize(displayName: string, cardWidth: number, preferredSize: number): number {
  const characterCount = Math.max(1, Array.from(displayName.trim()).length);
  let size = Math.min(preferredSize, Math.max(12, cardWidth / 7));

  while (size > 9) {
    const charactersPerLine = Math.max(4, Math.floor((cardWidth - 24) / (size * 0.58)));
    if (characterCount <= charactersPerLine * 3) break;
    size -= 1;
  }

  return Math.round(size * 10) / 10;
}

function createPositionedNodes(
  request: PosterLayoutEngineRequest,
  ancestors: readonly AncestorPosition[],
  flow: TieredPosterFlow
): PosterSceneNode[] {
  if (ancestors.length === 0) return [];

  const { layout, cardPreset, content } = request;
  const groups = new Map<number, AncestorPosition[]>();
  ancestors.forEach((position) => {
    const group = groups.get(position.generation) ?? [];
    group.push(position);
    groups.set(position.generation, group);
  });
  groups.forEach((group) => group.sort((a, b) => a.lineageSlot - b.lineageSlot));

  const actualGenerationCount = Math.max(...ancestors.map((position) => position.generation));
  const largestGeneration = Math.max(...Array.from(groups.values()).map((group) => group.length));
  const gap = layout.spacingPreset === 'compact' ? 10 : layout.spacingPreset === 'airy' ? 30 : 18;
  const vertical = layout.direction === 'vertical';
  const availableCardSpan = vertical ? layout.treeBounds.width : layout.treeBounds.height;
  const cardWidth = vertical
    ? Math.min(
        cardPreset.geometry.maxWidth,
        Math.max(cardPreset.geometry.minWidth, (availableCardSpan / largestGeneration) - gap)
      )
    : cardPreset.geometry.maxWidth;
  const cardHeight = !vertical
    ? Math.min(cardPreset.geometry.height, Math.max(72, (availableCardSpan / largestGeneration) - gap))
    : cardPreset.geometry.height;
  const xMargin = (cardWidth / 2) + 10;
  const yMargin = (cardHeight / 2) + 10;

  return ancestors.map((position) => {
    const group = groups.get(position.generation) ?? [position];
    const groupIndex = group.findIndex((candidate) => candidate.node.previewId === position.node.previewId);
    let centerX: number;
    let centerY: number;

    if (vertical) {
      centerX = layout.treeBounds.x + (((groupIndex + 0.5) / group.length) * layout.treeBounds.width);
      centerY = actualGenerationCount === 1
        ? layout.treeBounds.y + (layout.treeBounds.height / 2)
        : layout.treeBounds.y + yMargin + ((
            flow === 'ancestor'
              ? (actualGenerationCount - position.generation) / (actualGenerationCount - 1)
              : (position.generation - 1) / (actualGenerationCount - 1)
          ) * (layout.treeBounds.height - (yMargin * 2)));
    } else {
      const generationProgress = actualGenerationCount === 1
        ? 0.5
        : (position.generation - 1) / (actualGenerationCount - 1);
      const leftToRightX = layout.treeBounds.x
        + xMargin
        + (generationProgress * (layout.treeBounds.width - (xMargin * 2)));
      centerX = content.language === 'ar'
        ? layout.treeBounds.x + layout.treeBounds.width - (leftToRightX - layout.treeBounds.x)
        : leftToRightX;
      centerY = layout.treeBounds.y + (((groupIndex + 0.5) / group.length) * layout.treeBounds.height);
    }

    return {
      previewId: position.node.previewId,
      displayName: position.node.displayName,
      generation: position.generation,
      isRoot: position.node.previewId === content.rootPreviewId || position.node.relationshipHint === 'root',
      isMasked: position.node.isMasked,
      hasPhoto: position.node.hasPhoto,
      birthYear: position.node.birthYear,
      deathYear: position.node.deathYear,
      relationshipHint: position.node.relationshipHint,
      birthPlaceLabel: position.node.birthPlaceLabel,
      occupationLabel: position.node.occupationLabel,
      descriptionLabel: position.node.descriptionLabel,
      initials: createInitials(position.node.displayName),
      nameFontSize: fitNameFontSize(position.node.displayName, cardWidth, cardPreset.typography.nameSize),
      rect: {
        x: centerX - (cardWidth / 2),
        y: centerY - (cardHeight / 2),
        width: cardWidth,
        height: cardHeight,
      },
    };
  });
}

export function createTieredPosterLayout(
  request: PosterLayoutEngineRequest,
  flow: TieredPosterFlow
): PosterLayoutEngineResult {
  const { graph, layout, document } = request;
  const ancestors = collectReachablePeople(request, flow);
  const nodes = createPositionedNodes(request, ancestors, flow);
  const nodeById = new Map(nodes.map((node) => [node.previewId, node]));
  const connectors = graph.edges.flatMap((edge) => {
    const isSpouseConnector = flow === 'descendant' && edge.relationshipType === 'spouse';
    if (edge.relationshipType !== 'parent-child' && !isSpouseConnector) return [];
    const from = nodeById.get(edge.fromPreviewId);
    const to = nodeById.get(edge.toPreviewId);
    if (!from || !to) return [];

    const vertical = layout.direction === 'vertical';
    const fromCenterX = from.rect.x + (from.rect.width / 2);
    const fromCenterY = from.rect.y + (from.rect.height / 2);
    const toCenterX = to.rect.x + (to.rect.width / 2);
    const toCenterY = to.rect.y + (to.rect.height / 2);
    const fromPrecedesTo = isSpouseConnector
      ? (vertical ? fromCenterX < toCenterX : fromCenterY < toCenterY)
      : (vertical ? fromCenterY < toCenterY : fromCenterX < toCenterX);

    return [{
      fromPreviewId: edge.fromPreviewId,
      toPreviewId: edge.toPreviewId,
      relationshipType: edge.relationshipType,
      start: {
        x: isSpouseConnector && vertical
          ? from.rect.x + (fromPrecedesTo ? from.rect.width : 0)
          : vertical
            ? fromCenterX
            : from.rect.x + (fromPrecedesTo ? from.rect.width : 0),
        y: isSpouseConnector && !vertical
          ? from.rect.y + (fromPrecedesTo ? from.rect.height : 0)
          : vertical
            ? from.rect.y + (fromPrecedesTo ? from.rect.height : 0)
            : fromCenterY,
      },
      end: {
        x: isSpouseConnector && vertical
          ? to.rect.x + (fromPrecedesTo ? 0 : to.rect.width)
          : vertical
            ? toCenterX
            : to.rect.x + (fromPrecedesTo ? 0 : to.rect.width),
        y: isSpouseConnector && !vertical
          ? to.rect.y + (fromPrecedesTo ? 0 : to.rect.height)
          : vertical
            ? to.rect.y + (fromPrecedesTo ? 0 : to.rect.height)
            : toCenterY,
      },
    }];
  });

  return {
    nodes,
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
}

export const ancestorTieredPosterLayoutEngine: PosterLayoutEngine = {
  id: 'ancestor-tiered',
  createLayout: (request) => createTieredPosterLayout(request, 'ancestor'),
};
