import type {
  PosterLayoutEngine,
  PosterLayoutEngineRequest,
  PosterLayoutEngineResult,
  PosterSceneConnector,
  PosterSceneNode,
} from './posterSceneTypes';

export class RadialLayoutCapacityError extends Error {
  readonly code = 'RADIAL_LAYOUT_CAPACITY_EXCEEDED';
  constructor(message: string) {
    super(message);
    this.name = 'RadialLayoutCapacityError';
  }
}

function getCardPerimeterPoint(
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
  let size = Math.min(preferredSize, 17);
  while (size > 15.5) {
    const charactersPerLine = Math.max(4, Math.floor((cardWidth - 10) / (size * 0.52)));
    if (characterCount <= charactersPerLine * 2) break;
    size -= 0.5;
  }
  return Math.round(size * 10) / 10;
}

interface BranchTreeNode {
  id: string;
  ring: number;
  weight: number;
  children: BranchTreeNode[];
}

export const radialGenerationsPosterLayoutEngine: PosterLayoutEngine = {
  id: 'radial-generations',
  createLayout(request: PosterLayoutEngineRequest): PosterLayoutEngineResult {
    const { graph, radialOptions, layout, cardPreset, content, document } = request;

    if (!radialOptions) {
      throw new Error("Radial engine ('radial-generations') requires radialOptions.");
    }

    if (
      content.scope !== 'selected-root-ancestors' &&
      content.scope !== 'selected-root-descendants'
    ) {
      throw new Error(
        `Radial engine ('radial-generations') requires content.scope to be 'selected-root-ancestors' or 'selected-root-descendants', received '${content.scope}'.`
      );
    }

    const {
      focalPreviewId,
      radialSpan,
      generationRings,
      ringSpacing,
      centerCardScale,
      labelOrientation,
    } = radialOptions;

    // Strict Validation
    if (
      typeof generationRings !== 'number' ||
      !Number.isInteger(generationRings) ||
      generationRings < 3 ||
      generationRings > 6
    ) {
      throw new Error(
        "Radial engine ('radial-generations') generationRings must be an integer between 3 and 6."
      );
    }

    if (radialSpan !== '360-full-circle' && radialSpan !== '180-half-fan') {
      throw new Error(`Invalid radialSpan '${String(radialSpan)}'.`);
    }

    if (ringSpacing !== 'compact' && ringSpacing !== 'balanced' && ringSpacing !== 'spacious') {
      throw new Error(`Invalid ringSpacing '${String(ringSpacing)}'.`);
    }

    if (centerCardScale !== 'compact' && centerCardScale !== 'standard' && centerCardScale !== 'large') {
      throw new Error(`Invalid centerCardScale '${String(centerCardScale)}'.`);
    }

    if (labelOrientation === 'curved') {
      throw new Error("Curved radial label orientation is currently unsupported for Arabic text.");
    }
    if (labelOrientation !== 'straight-unwarped') {
      throw new Error(`Invalid labelOrientation '${String(labelOrientation)}'.`);
    }

    const focalNode = graph.nodes.find((n) => n.previewId === focalPreviewId);
    if (!focalNode) {
      throw new Error(`Focal preview ID '${focalPreviewId}' not found in sanitized graph.`);
    }

    const isAncestorScope = content.scope === 'selected-root-ancestors';
    const maxRings = generationRings;

    const nodeByPreviewId = new Map(graph.nodes.map((n) => [n.previewId, n]));
    const graphOrderMap = new Map(graph.nodes.map((n, i) => [n.previewId, i]));

    // Edge Maps (deduplicated)
    const parentsOfMap = new Map<string, string[]>();
    const childrenOfMap = new Map<string, string[]>();

    graph.edges.forEach((edge) => {
      if (edge.relationshipType === 'parent-child') {
        const parent = edge.fromPreviewId;
        const child = edge.toPreviewId;
        if (!parentsOfMap.get(child)?.includes(parent)) {
          const pList = parentsOfMap.get(child) ?? [];
          pList.push(parent);
          parentsOfMap.set(child, pList);
        }
        if (!childrenOfMap.get(parent)?.includes(child)) {
          const cList = childrenOfMap.get(parent) ?? [];
          cList.push(child);
          childrenOfMap.set(parent, cList);
        }
      }
    });

    // Ring Assignment: focal = ring 0
    const nodeRingMap = new Map<string, number>();
    nodeRingMap.set(focalPreviewId, 0);

    const queue: Array<{ id: string; ring: number }> = [{ id: focalPreviewId, ring: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.ring >= maxRings) continue;

      const nextNodes = isAncestorScope
        ? (parentsOfMap.get(current.id) ?? [])
        : (childrenOfMap.get(current.id) ?? []);

      for (const nextId of nextNodes) {
        if (!nodeByPreviewId.has(nextId)) continue;
        if (!nodeRingMap.has(nextId)) {
          const nextRing = current.ring + 1;
          nodeRingMap.set(nextId, nextRing);
          queue.push({ id: nextId, ring: nextRing });
        }
      }
    }

    // Build Branch Subtree Hierarchy
    function buildSubtree(nodeId: string, ring: number): BranchTreeNode {
      if (ring >= maxRings) {
        return { id: nodeId, ring, weight: 1, children: [] };
      }

      const nextNodeIds = isAncestorScope
        ? (parentsOfMap.get(nodeId) ?? [])
        : (childrenOfMap.get(nodeId) ?? []);

      const validNextIds = nextNodeIds.filter(
        (id) => nodeByPreviewId.has(id) && nodeRingMap.get(id) === ring + 1
      );

      // Sort next nodes deterministically by graph order
      validNextIds.sort((a, b) => {
        const orderA = graphOrderMap.get(a) ?? 0;
        const orderB = graphOrderMap.get(b) ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return a.localeCompare(b);
      });

      const children = validNextIds.map((id) => buildSubtree(id, ring + 1));
      const childrenWeight = children.reduce((sum, c) => sum + c.weight, 0);
      const weight = Math.max(1, childrenWeight);

      return { id: nodeId, ring, weight, children };
    }

    const rootSubtree = buildSubtree(focalPreviewId, 0);

    // Compute Angular Sector Allocations for all nodes
    const nodeAngleMap = new Map<string, number>();
    nodeAngleMap.set(focalPreviewId, 0);

    const isHalfFan = radialSpan === '180-half-fan';
    const startAngle = isHalfFan ? -Math.PI : -Math.PI / 2;
    const totalSpan = isHalfFan ? Math.PI : 2 * Math.PI;

    function allocateSectors(parentTreeNode: BranchTreeNode, sectorStart: number, sectorSpan: number) {
      if (parentTreeNode.children.length === 0) return;

      const totalChildrenWeight = parentTreeNode.children.reduce((sum, c) => sum + c.weight, 0);
      let currentStart = sectorStart;

      parentTreeNode.children.forEach((child) => {
        const childSpan = (child.weight / totalChildrenWeight) * sectorSpan;
        const childMidAngle = currentStart + childSpan / 2;
        nodeAngleMap.set(child.id, childMidAngle);

        allocateSectors(child, currentStart, childSpan);
        currentStart += childSpan;
      });
    }

    allocateSectors(rootSubtree, startAngle, totalSpan);

    // Scene Bounding & Unit Geometry
    const treeBounds = layout.treeBounds;
    const treeCenterX = treeBounds.x + treeBounds.width / 2;

    let treeCenterY: number;
    let maxAvailRadius: number;

    if (isHalfFan) {
      treeCenterY = treeBounds.y + treeBounds.height - 60;
      maxAvailRadius = Math.min(
        treeBounds.width / 2 - 20,
        treeCenterY - treeBounds.y - 40
      );
    } else {
      treeCenterY = treeBounds.y + treeBounds.height / 2;
      maxAvailRadius = Math.min(
        treeBounds.width / 2 - 20,
        treeBounds.height / 2 - 20
      );
    }

    // Card sizes in Scene Units (pixels)
    const centerScaleMult = centerCardScale === 'large' ? 1.25 : centerCardScale === 'compact' ? 0.85 : 1.0;
    const baseCardW = Math.round(cardPreset.geometry.minWidth * centerScaleMult);
    const baseCardH = Math.round(Math.max(48, cardPreset.geometry.height * 0.65) * centerScaleMult);

    const ringCardW = Math.round(Math.max(60, Math.min(baseCardW, 68)));
    const ringCardH = Math.round(Math.max(32, Math.min(baseCardH, 38)));

    const innerRadius = Math.max(60, baseCardH) / 2 + 35;
    const maxAssignedRing = Math.max(0, ...Array.from(nodeRingMap.values()));

    // Genuinely Adaptive Radial Spacing Formula
    const requestedSteps = Math.max(1, radialOptions.generationRings - 1);
    const activeRingDivisor = Math.max(requestedSteps, maxAssignedRing);
    const minSafeStep = ringCardH + 20; // 32 + 20 = 52px min step for safe card gap
    const spacingScale = ringSpacing === 'spacious' ? 1.0 : ringSpacing === 'compact' ? 0.65 : 0.85;

    const remainingSpan = Math.max(0, maxAvailRadius - innerRadius - ringCardW / 2);

    const minimumRequiredSpan = requestedSteps * minSafeStep;
    if (requestedSteps > 0 && minimumRequiredSpan > remainingSpan) {
      throw new RadialLayoutCapacityError(
        `Radial layout capacity exceeded: ${requestedSteps} rings require minimum span ${minimumRequiredSpan}px, exceeding available span ${Math.round(remainingSpan)}px.`
      );
    }

    const proportionalStep = (remainingSpan / activeRingDivisor) * spacingScale;
    const spacingStep = Math.max(minSafeStep, proportionalStep);

    const requiredMaxRadius = innerRadius + requestedSteps * spacingStep + ringCardW / 2;

    // Capacity Validation before node placement
    if (requiredMaxRadius > maxAvailRadius) {
      throw new RadialLayoutCapacityError(
        `Radial layout capacity exceeded: requested ${radialOptions.generationRings} generation rings require radius ${Math.round(requiredMaxRadius)}px (step ${Math.round(spacingStep)}px), exceeding available bounds ${Math.round(maxAvailRadius)}px.`
      );
    }

    const sceneNodes: PosterSceneNode[] = [];

    // Emit Focal Node (Ring 0)
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
      nameFontSize: fitNameFontSize(focalNode.displayName, baseCardW, cardPreset.typography.nameSize),
      rect: {
        x: Math.round((treeCenterX - baseCardW / 2) * 10) / 10,
        y: Math.round((treeCenterY - baseCardH / 2) * 10) / 10,
        width: baseCardW,
        height: baseCardH,
      },
    });

    // Emit Ring Nodes (Ring 1..N)
    Array.from(nodeRingMap.entries()).forEach(([nodeId, ring]) => {
      if (ring === 0) return;

      const node = nodeByPreviewId.get(nodeId)!;
      const angle = nodeAngleMap.get(nodeId) ?? startAngle;
      const radius = innerRadius + ring * spacingStep;

      const nodeCx = treeCenterX + radius * Math.cos(angle);
      const nodeCy = treeCenterY + radius * Math.sin(angle);

      const rectX = Math.round((nodeCx - ringCardW / 2) * 10) / 10;
      const rectY = Math.round((nodeCy - ringCardH / 2) * 10) / 10;

      sceneNodes.push({
        previewId: node.previewId,
        displayName: node.displayName,
        generation: ring + 1,
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
        nameFontSize: fitNameFontSize(node.displayName, ringCardW, cardPreset.typography.nameSize),
        rect: {
          x: rectX,
          y: rectY,
          width: ringCardW,
          height: ringCardH,
        },
      });
    });

    // Defensive Overlap & Bounds Checking across Scene Nodes
    sceneNodes.forEach((node) => {
      if (
        node.rect.x < treeBounds.x - 1 ||
        node.rect.y < treeBounds.y - 1 ||
        node.rect.x + node.rect.width > treeBounds.x + treeBounds.width + 1 ||
        node.rect.y + node.rect.height > treeBounds.y + treeBounds.height + 1
      ) {
        throw new RadialLayoutCapacityError(
          `Radial layout capacity exceeded: node '${node.displayName}' exceeds printable tree bounds.`
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
          throw new RadialLayoutCapacityError(
            `Radial layout capacity exceeded: overlap detected between nodes '${sceneNodes[i]!.displayName}' and '${sceneNodes[j]!.displayName}'.`
          );
        }
      }
    }

    const sceneNodeMap = new Map(sceneNodes.map((n) => [n.previewId, n]));

    // Emit Connectors with Perimeter Anchors and Deduplication
    const sceneConnectors: PosterSceneConnector[] = [];
    const processedEdges = new Set<string>();

    graph.edges.forEach((edge) => {
      const fromNode = sceneNodeMap.get(edge.fromPreviewId);
      const toNode = sceneNodeMap.get(edge.toPreviewId);
      if (!fromNode || !toNode) return;

      if (edge.relationshipType !== 'parent-child') return;

      const ringFrom = nodeRingMap.get(edge.fromPreviewId) ?? 0;
      const ringTo = nodeRingMap.get(edge.toPreviewId) ?? 0;

      // Keep direction from inner ring to outer ring
      let innerNode = fromNode;
      let outerNode = toNode;
      if (ringFrom > ringTo) {
        innerNode = toNode;
        outerNode = fromNode;
      }

      const pairKey = [innerNode.previewId, outerNode.previewId].join('->');
      if (processedEdges.has(pairKey)) return;
      processedEdges.add(pairKey);

      const innerCenter = {
        x: innerNode.rect.x + innerNode.rect.width / 2,
        y: innerNode.rect.y + innerNode.rect.height / 2,
      };
      const outerCenter = {
        x: outerNode.rect.x + outerNode.rect.width / 2,
        y: outerNode.rect.y + outerNode.rect.height / 2,
      };

      const startPt = getCardPerimeterPoint(innerNode.rect, outerCenter);
      const endPt = getCardPerimeterPoint(outerNode.rect, innerCenter);

      sceneConnectors.push({
        fromPreviewId: innerNode.previewId,
        toPreviewId: outerNode.previewId,
        relationshipType: 'parent-child',
        start: startPt,
        end: endPt,
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
