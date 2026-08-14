import type {
  PosterFocusDepth,
  PosterLayoutEngine,
  PosterLayoutEngineRequest,
  PosterLayoutEngineResult,
  PosterSceneConnector,
  PosterSceneNode,
} from './posterSceneTypes';

export class FocusLayoutCapacityError extends Error {
  readonly code = 'FOCUS_LAYOUT_CAPACITY_EXCEEDED';
  constructor(message: string) {
    super(message);
    this.name = 'FocusLayoutCapacityError';
  }
}

export function validateFocusDepth(depth: PosterFocusDepth): number {
  if (depth === 'all') {
    return Infinity;
  }
  if (typeof depth === 'number' && Number.isInteger(depth) && depth >= 1 && depth <= 4) {
    return depth;
  }
  throw new Error(`Invalid Focus depth: ${String(depth)}. Must be an integer between 1 and 4, or 'all'.`);
}

export function getCardPerimeterPoint(
  rect: { x: number; y: number; width: number; height: number },
  targetCenter: { x: number; y: number }
): { x: number; y: number } {
  const cardCenterX = rect.x + rect.width / 2;
  const cardCenterY = rect.y + rect.height / 2;

  const dx = targetCenter.x - cardCenterX;
  const dy = targetCenter.y - cardCenterY;

  if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
    return { x: cardCenterX, y: cardCenterY };
  }

  const halfW = rect.width / 2;
  const halfH = rect.height / 2;

  const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
  const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;

  const scale = Math.min(scaleX, scaleY);

  return {
    x: Math.round((cardCenterX + dx * scale) * 10) / 10,
    y: Math.round((cardCenterY + dy * scale) * 10) / 10,
  };
}

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

export const focusFamilyPosterLayoutEngine: PosterLayoutEngine = {
  id: 'focus-family',
  createLayout(request: PosterLayoutEngineRequest): PosterLayoutEngineResult {
    const { graph, focusOptions, layout, cardPreset, content, document } = request;

    if (!focusOptions) {
      throw new Error("Focus engine ('focus-family') requires focusOptions.");
    }
    if (content.scope !== 'selected-root-focus') {
      throw new Error(
        `Focus engine ('focus-family') requires scope 'selected-root-focus', received '${content.scope}'.`
      );
    }

    const {
      focalPreviewId,
      ancestorDepth,
      descendantDepth,
      includeFocalSpouses,
      includeFocalSiblings,
    } = focusOptions;

    const ancestorLimit = validateFocusDepth(ancestorDepth);
    const descendantLimit = validateFocusDepth(descendantDepth);

    const focalNode = graph.nodes.find((n) => n.previewId === focalPreviewId);
    if (!focalNode) {
      throw new Error(`Focal preview ID '${focalPreviewId}' not found in sanitized graph.`);
    }

    // Maps
    const nodeByPreviewId = new Map(graph.nodes.map((n) => [n.previewId, n]));
    const graphOrderMap = new Map(graph.nodes.map((n, i) => [n.previewId, i]));

    const parentsOfMap = new Map<string, string[]>();
    const childrenOfMap = new Map<string, string[]>();
    const spousesOfMap = new Map<string, string[]>();

    graph.edges.forEach((edge) => {
      if (edge.relationshipType === 'parent-child') {
        const parent = edge.fromPreviewId;
        const child = edge.toPreviewId;
        const pList = parentsOfMap.get(child) ?? [];
        if (!pList.includes(parent)) pList.push(parent);
        parentsOfMap.set(child, pList);

        const cList = childrenOfMap.get(parent) ?? [];
        if (!cList.includes(child)) cList.push(child);
        childrenOfMap.set(parent, cList);
      } else if (edge.relationshipType === 'spouse') {
        const s1 = spousesOfMap.get(edge.fromPreviewId) ?? [];
        if (!s1.includes(edge.toPreviewId)) s1.push(edge.toPreviewId);
        spousesOfMap.set(edge.fromPreviewId, s1);

        const s2 = spousesOfMap.get(edge.toPreviewId) ?? [];
        if (!s2.includes(edge.fromPreviewId)) s2.push(edge.fromPreviewId);
        spousesOfMap.set(edge.toPreviewId, s2);
      }
    });

    // Single global visited/assigned tier map
    const nodeTierMap = new Map<string, number>();
    nodeTierMap.set(focalPreviewId, 0);

    // 1. Traverse Ancestors Upward
    const ancestorQueue: Array<{ id: string; depth: number }> = [{ id: focalPreviewId, depth: 0 }];

    while (ancestorQueue.length > 0) {
      const current = ancestorQueue.shift()!;
      if (current.depth >= ancestorLimit) continue;

      const parents = parentsOfMap.get(current.id) ?? [];
      for (const parentId of parents) {
        if (!nodeByPreviewId.has(parentId)) continue;
        if (!nodeTierMap.has(parentId)) {
          const parentTier = -(current.depth + 1);
          nodeTierMap.set(parentId, parentTier);
          ancestorQueue.push({ id: parentId, depth: current.depth + 1 });
        }
      }
    }

    // 2. Traverse Descendants Downward
    const descendantQueue: Array<{ id: string; depth: number }> = [{ id: focalPreviewId, depth: 0 }];

    while (descendantQueue.length > 0) {
      const current = descendantQueue.shift()!;
      if (current.depth >= descendantLimit) continue;

      const children = childrenOfMap.get(current.id) ?? [];
      for (const childId of children) {
        if (!nodeByPreviewId.has(childId)) continue;
        if (!nodeTierMap.has(childId)) {
          const childTier = current.depth + 1;
          nodeTierMap.set(childId, childTier);
          descendantQueue.push({ id: childId, depth: current.depth + 1 });
        }
      }
    }

    // 3. Focal Spouses
    if (includeFocalSpouses) {
      const spouses = spousesOfMap.get(focalPreviewId) ?? [];
      for (const spouseId of spouses) {
        if (nodeByPreviewId.has(spouseId) && !nodeTierMap.has(spouseId)) {
          nodeTierMap.set(spouseId, 0);
        }
      }
    }

    // 4. Focal Siblings
    if (includeFocalSiblings) {
      const focalParents = parentsOfMap.get(focalPreviewId) ?? [];
      for (const parentId of focalParents) {
        const siblings = childrenOfMap.get(parentId) ?? [];
        for (const siblingId of siblings) {
          if (
            siblingId !== focalPreviewId &&
            nodeByPreviewId.has(siblingId) &&
            !nodeTierMap.has(siblingId)
          ) {
            nodeTierMap.set(siblingId, 0);
          }
        }
      }
    }

    const includedNodes = Array.from(nodeTierMap.keys()).map((id) => nodeByPreviewId.get(id)!);

    // Group nodes by signed Tier
    const tierGroups = new Map<number, typeof includedNodes>();
    for (const node of includedNodes) {
      const tier = nodeTierMap.get(node.previewId)!;
      const group = tierGroups.get(tier) ?? [];
      group.push(node);
      tierGroups.set(tier, group);
    }

    const sortedTiers = Array.from(tierGroups.keys()).sort((a, b) => a - b);

    // Deterministic sorting within non-zero tiers
    sortedTiers.forEach((tier) => {
      if (tier === 0) return;
      const group = tierGroups.get(tier)!;
      group.sort((a, b) => {
        const orderA = graphOrderMap.get(a.previewId) ?? 0;
        const orderB = graphOrderMap.get(b.previewId) ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.previewId.localeCompare(b.previewId);
      });
    });

    const isVertical = layout.direction === 'vertical';
    const isAr = content.language === 'ar';
    const treeBounds = layout.treeBounds;

    const treeCenterX = treeBounds.x + treeBounds.width / 2;
    const treeCenterY = treeBounds.y + treeBounds.height / 2;

    const minCardW = cardPreset.geometry.minWidth;
    const maxCardW = cardPreset.geometry.maxWidth;
    const minCardH = 54;
    const baseCardH = cardPreset.geometry.height;

    const gap = layout.spacingPreset === 'compact' ? 10 : layout.spacingPreset === 'airy' ? 24 : 16;

    const negTiers = sortedTiers.filter((t) => t < 0);
    const posTiers = sortedTiers.filter((t) => t > 0);

    const maxNegDepth = negTiers.length > 0 ? Math.max(...negTiers.map((t) => Math.abs(t))) : 0;
    const maxPosDepth = posTiers.length > 0 ? Math.max(...posTiers.map((t) => Math.abs(t))) : 0;

    const maxTierNodeCount = Math.max(1, ...Array.from(tierGroups.values()).map((g) => g.length));

    let rawCardWidth: number;
    let rawCardHeight: number;

    if (isVertical) {
      const availCross = treeBounds.width - gap * (maxTierNodeCount - 1);
      rawCardWidth = availCross / maxTierNodeCount;

      const availMainHalf = Math.min(
        treeCenterY - treeBounds.y,
        treeBounds.y + treeBounds.height - treeCenterY
      );
      const maxSideDepth = Math.max(maxNegDepth, maxPosDepth);
      rawCardHeight = maxSideDepth > 0 ? (availMainHalf - gap * maxSideDepth) / (maxSideDepth + 0.5) : baseCardH;
    } else {
      const availMainHalf = Math.min(
        treeCenterX - treeBounds.x,
        treeBounds.x + treeBounds.width - treeCenterX
      );
      const maxSideDepth = Math.max(maxNegDepth, maxPosDepth);
      rawCardWidth = maxSideDepth > 0 ? (availMainHalf - gap * maxSideDepth) / (maxSideDepth + 0.5) : maxCardW;

      const availCross = treeBounds.height - gap * (maxTierNodeCount - 1);
      rawCardHeight = availCross / maxTierNodeCount;
    }

    // Capacity Validation: Reject immediately if raw candidate geometry cannot fit minimum bounds
    if (rawCardWidth < minCardW || rawCardHeight < minCardH) {
      throw new FocusLayoutCapacityError(
        'Focus layout capacity exceeded: tree bounds cannot fit requested focus depth with minimum card geometry.'
      );
    }

    const cardWidth = Math.min(maxCardW, rawCardWidth);
    const cardHeight = Math.min(baseCardH, rawCardHeight);
    const isSoloFocus = includedNodes.length === 1;
    const focalCardWidth = isSoloFocus
      ? Math.min(treeBounds.width * 0.34, maxCardW * 1.5)
      : cardWidth;
    const focalCardHeight = isSoloFocus
      ? Math.min(treeBounds.height * 0.16, baseCardH * 1.4)
      : cardHeight;
    const regularCardWidth = Math.max(minCardW, cardWidth * 0.86);

    const negativeTierStep = (() => {
      if (maxNegDepth === 0) return 0;

      const availableTravel = isVertical
        ? treeCenterY - treeBounds.y - cardHeight / 2
        : (isAr
            ? treeBounds.x + treeBounds.width - treeCenterX
            : treeCenterX - treeBounds.x) -
          regularCardWidth / 2;

      return availableTravel / maxNegDepth;
    })();

    const positiveTierStep = (() => {
      if (maxPosDepth === 0) return 0;

      const availableTravel = isVertical
        ? treeBounds.y + treeBounds.height - treeCenterY - cardHeight / 2
        : (isAr
            ? treeCenterX - treeBounds.x
            : treeBounds.x + treeBounds.width - treeCenterX) -
          regularCardWidth / 2;

      return availableTravel / maxPosDepth;
    })();

    const minimumTierStep = isVertical
      ? cardHeight + gap
      : (focalCardWidth + regularCardWidth) / 2 + gap;
    if (
      (maxNegDepth > 0 && negativeTierStep < minimumTierStep - 0.1) ||
      (maxPosDepth > 0 && positiveTierStep < minimumTierStep - 0.1)
    ) {
      throw new FocusLayoutCapacityError(
        'Focus layout capacity exceeded: tree bounds cannot separate focus tiers without overlap.'
      );
    }

    const sceneNodes: PosterSceneNode[] = [];

    // Layout Tier 0: Focal node is ALWAYS centered at (treeCenterX, treeCenterY)
    const tier0Nodes = tierGroups.get(0) ?? [];
    const companionsTier0 = tier0Nodes.filter((n) => n.previewId !== focalPreviewId);
    companionsTier0.sort((a, b) => {
      const orderA = graphOrderMap.get(a.previewId) ?? 0;
      const orderB = graphOrderMap.get(b.previewId) ?? 0;
      if (orderA !== orderB) return orderA - orderB;
      return a.previewId.localeCompare(b.previewId);
    });

    // Place Focal Node strictly centered
    sceneNodes.push({
      previewId: focalNode.previewId,
      displayName: focalNode.displayName,
      generation: 1,
      isRoot: true,
      isMasked: focalNode.isMasked,
      hasPhoto: focalNode.hasPhoto,
      birthYear: focalNode.birthYear,
      deathYear: focalNode.deathYear,
      relationshipHint: focalNode.relationshipHint,
      birthPlaceLabel: focalNode.birthPlaceLabel,
      occupationLabel: focalNode.occupationLabel,
      descriptionLabel: focalNode.descriptionLabel,
      initials: createInitials(focalNode.displayName),
      nameFontSize: fitNameFontSize(
        focalNode.displayName,
        focalCardWidth,
        cardPreset.typography.nameSize * (isSoloFocus ? 1.4 : 1.12)
      ),
      rect: {
        x: Math.round((treeCenterX - focalCardWidth / 2) * 10) / 10,
        y: Math.round((treeCenterY - focalCardHeight / 2) * 10) / 10,
        width: Math.round(focalCardWidth * 10) / 10,
        height: Math.round(focalCardHeight * 10) / 10,
      },
    });

    // Place Tier 0 Companions around Focal Card using alternating negative/positive slots
    companionsTier0.forEach((compNode, idx) => {
      const slotIndex = idx % 2 === 0 ? -Math.floor(idx / 2 + 1) : Math.floor(idx / 2 + 1);

      let x: number;
      let y: number;

      if (isVertical) {
        const companionStep = (focalCardWidth + regularCardWidth) / 2 + gap;
        x = treeCenterX + slotIndex * companionStep - regularCardWidth / 2;
        y = treeCenterY - cardHeight / 2;
      } else {
        x = treeCenterX - regularCardWidth / 2;
        y = treeCenterY + slotIndex * (cardHeight + gap) - cardHeight / 2;
      }

      sceneNodes.push({
        previewId: compNode.previewId,
        displayName: compNode.displayName,
        generation: 1,
        isRoot: false,
        isMasked: compNode.isMasked,
        hasPhoto: compNode.hasPhoto,
        birthYear: compNode.birthYear,
        deathYear: compNode.deathYear,
        relationshipHint: compNode.relationshipHint,
        birthPlaceLabel: compNode.birthPlaceLabel,
        occupationLabel: compNode.occupationLabel,
        descriptionLabel: compNode.descriptionLabel,
        initials: createInitials(compNode.displayName),
        nameFontSize: fitNameFontSize(
          compNode.displayName,
          regularCardWidth,
          cardPreset.typography.nameSize
        ),
        rect: {
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          width: Math.round(regularCardWidth * 10) / 10,
          height: Math.round(cardHeight * 10) / 10,
        },
      });
    });

    // Layout Non-Zero Tiers (Ancestors: tier < 0, Descendants: tier > 0)
    sortedTiers.forEach((tier) => {
      if (tier === 0) return;

      const group = tierGroups.get(tier)!;
      const groupCount = group.length;

      let groupCenterX: number;
      let groupCenterY: number;
      const tierStep = tier < 0 ? negativeTierStep : positiveTierStep;

      if (isVertical) {
        groupCenterY = treeCenterY + Math.sign(tier) * Math.abs(tier) * tierStep;
        groupCenterX = treeCenterX;
      } else {
        const sideMultiplier = isAr ? -1 : 1;
        groupCenterX =
          treeCenterX + Math.sign(tier) * Math.abs(tier) * tierStep * sideMultiplier;
        groupCenterY = treeCenterY;
      }

      group.forEach((node, nodeIdx) => {
        let x: number;
        let y: number;

        if (isVertical) {
          const groupWidth = groupCount * regularCardWidth + (groupCount - 1) * gap;
          const startX = groupCenterX - groupWidth / 2 + regularCardWidth / 2;
          const nodeCenterX = startX + nodeIdx * (regularCardWidth + gap);
          x = nodeCenterX - regularCardWidth / 2;
          y = groupCenterY - cardHeight / 2;
        } else {
          const groupHeight = groupCount * cardHeight + (groupCount - 1) * gap;
          const startY = groupCenterY - groupHeight / 2 + cardHeight / 2;
          const nodeCenterY = startY + nodeIdx * (cardHeight + gap);
          x = groupCenterX - regularCardWidth / 2;
          y = nodeCenterY - cardHeight / 2;
        }

        sceneNodes.push({
          previewId: node.previewId,
          displayName: node.displayName,
          generation: Math.abs(tier) + 1,
          isRoot: false,
          isMasked: node.isMasked,
          hasPhoto: node.hasPhoto,
          birthYear: node.birthYear,
          deathYear: node.deathYear,
          relationshipHint: node.relationshipHint,
          birthPlaceLabel: node.birthPlaceLabel,
          occupationLabel: node.occupationLabel,
          descriptionLabel: node.descriptionLabel,
          initials: createInitials(node.displayName),
          nameFontSize: fitNameFontSize(
            node.displayName,
            regularCardWidth,
            cardPreset.typography.nameSize
          ),
          rect: {
            x: Math.round(x * 10) / 10,
            y: Math.round(y * 10) / 10,
            width: Math.round(regularCardWidth * 10) / 10,
            height: Math.round(cardHeight * 10) / 10,
          },
        });
      });
    });

    // Defensive Invariants: Check bounds & overlaps across all nodes
    sceneNodes.forEach((node) => {
      if (
        node.rect.x < treeBounds.x - 0.5 ||
        node.rect.y < treeBounds.y - 0.5 ||
        node.rect.x + node.rect.width > treeBounds.x + treeBounds.width + 0.5 ||
        node.rect.y + node.rect.height > treeBounds.y + treeBounds.height + 0.5
      ) {
        throw new FocusLayoutCapacityError(
          `Focus layout capacity exceeded: node '${node.displayName}' exceeds printable tree bounds.`
        );
      }
    });

    for (let i = 0; i < sceneNodes.length; i += 1) {
      for (let j = i + 1; j < sceneNodes.length; j += 1) {
        const r1 = sceneNodes[i]!.rect;
        const r2 = sceneNodes[j]!.rect;
        const overlapX = r1.x < r2.x + r2.width - 0.5 && r1.x + r1.width > r2.x + 0.5;
        const overlapY = r1.y < r2.y + r2.height - 0.5 && r1.y + r1.height > r2.y + 0.5;
        if (overlapX && overlapY) {
          throw new FocusLayoutCapacityError(
            `Focus layout capacity exceeded: overlap detected between nodes '${sceneNodes[i]!.displayName}' and '${sceneNodes[j]!.displayName}'.`
          );
        }
      }
    }

    const sceneNodeMap = new Map(sceneNodes.map((n) => [n.previewId, n]));

    // Connectors with Rectangle Perimeter Intersection
    const sceneConnectors: PosterSceneConnector[] = [];
    const processedEdges = new Set<string>();

    graph.edges.forEach((edge) => {
      const fromNode = sceneNodeMap.get(edge.fromPreviewId);
      const toNode = sceneNodeMap.get(edge.toPreviewId);
      if (!fromNode || !toNode) return;

      if (edge.relationshipType !== 'parent-child' && edge.relationshipType !== 'spouse') {
        return;
      }

      let edgeKey: string;
      if (edge.relationshipType === 'spouse') {
        const pairKey = [edge.fromPreviewId, edge.toPreviewId].sort().join('<->');
        edgeKey = `${pairKey}:spouse`;
      } else {
        edgeKey = `${edge.fromPreviewId}->${edge.toPreviewId}:${edge.relationshipType}`;
      }

      if (processedEdges.has(edgeKey)) return;
      processedEdges.add(edgeKey);

      const fromCenter = {
        x: fromNode.rect.x + fromNode.rect.width / 2,
        y: fromNode.rect.y + fromNode.rect.height / 2,
      };
      const toCenter = {
        x: toNode.rect.x + toNode.rect.width / 2,
        y: toNode.rect.y + toNode.rect.height / 2,
      };

      const startPt = getCardPerimeterPoint(fromNode.rect, toCenter);
      const endPt = getCardPerimeterPoint(toNode.rect, fromCenter);
      const route = edge.relationshipType === 'parent-child'
        ? isVertical
          ? [
              { x: startPt.x, y: Math.round(((startPt.y + endPt.y) / 2) * 10) / 10 },
              { x: endPt.x, y: Math.round(((startPt.y + endPt.y) / 2) * 10) / 10 },
            ]
          : [
              { x: Math.round(((startPt.x + endPt.x) / 2) * 10) / 10, y: startPt.y },
              { x: Math.round(((startPt.x + endPt.x) / 2) * 10) / 10, y: endPt.y },
            ]
        : undefined;

      sceneConnectors.push({
        fromPreviewId: edge.fromPreviewId,
        toPreviewId: edge.toPreviewId,
        relationshipType: edge.relationshipType,
        start: startPt,
        end: endPt,
        route,
      });
    });

    return {
      nodes: sceneNodes,
      connectors: sceneConnectors,
      bounds: {
        page: {
          x: 0,
          y: 0,
          width: document.sceneSize.width,
          height: document.sceneSize.height,
        },
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
