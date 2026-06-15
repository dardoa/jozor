import React, { memo, useEffect, useMemo } from 'react';
import type { Person, TreeNode, TreeSettings } from '../../types';
import type { V3RendererPipeline } from '../../utils/layout/v3LayoutPipeline';
import { extractPathPoints } from '../../utils/svgUtils';
import type { EdgeEntity, EdgeEntityType } from '../../domain/familyGraphClusterLayout';
import {
  NODE_HEIGHT_COMPACT,
  NODE_HEIGHT_DEFAULT,
  NODE_WIDTH_COMPACT,
  NODE_WIDTH_DEFAULT,
} from '../../utils/layout/constants';
import { NodeComponent } from '../tree/node/NodeComponent';

const FAMILY_DOT_RADIUS = 6;
const MIN_SIBLING_BAR_HALF_PX = 16;
const CURVED_CORNER_RADIUS = 18;
const CURVED_PARENT_CARD_CLEARANCE = 14;
const noopSelect = () => undefined;
const noopContextMenu = () => undefined;

const getParentNavigationTargetId = (person: Person) => {
  const explicitFatherId = (person as Person & { fatherId?: string }).fatherId;
  return explicitFatherId || person.parents?.[0] || null;
};

const EDGE_STROKE: Record<EdgeEntityType, { stroke: string; strokeWidth: number; dashArray?: string }> = {
  'partner-link': { stroke: '#2563eb', strokeWidth: 3 },
  'parent-to-family': { stroke: '#94a3b8', strokeWidth: 2 },
  'family-trunk': { stroke: '#94a3b8', strokeWidth: 2 },
  'sibling-bar': { stroke: '#94a3b8', strokeWidth: 2 },
  'child-drop': { stroke: '#94a3b8', strokeWidth: 2 },
};

type V3LineStyle = NonNullable<TreeSettings['lineStyle']>;

type ScaleX = (x: number) => number;

interface TreeNodeWithIndex extends TreeNode {
  index: number;
}

interface V3FamilyGraphRendererProps {
  people: Record<string, Person>;
  settings: TreeSettings;
  pipeline: V3RendererPipeline;
  focusPersonId?: string;
  highlightedPath?: Set<string>;
  zoomScale?: number;
  zoomX?: number;
  zoomY?: number;
  viewportSize?: { width: number; height: number };
  onSelect?: (id: string) => void;
  onNodeContextMenu?: (e: React.MouseEvent, id: string) => void;
  padding?: number;
}

interface V3RenderDiagnosticsSnapshot {
  totalNodes: number;
  visibleNodes: number;
  renderedTreeNodes: number;
  totalEdges: number;
  visibleEdges: number;
  totalFamilyNodes: number;
  visibleFamilyNodes: number;
  cullingEnabled: boolean;
  nodeCullRatio: number;
  edgeCullRatio: number;
  zoomScale: number;
}

declare global {
  interface Window {
    __JOZOR_V3_RENDER_STATS__?: V3RenderDiagnosticsSnapshot;
  }
}

function scalePathX(d: string | undefined | null, scaleX: ScaleX): string {
  if (!d) return '';

  try {
    return d.replace(
      /([MLCSQT])\s*([-\d.]+)\s+([-\d.]+)|(H)\s*([-\d.]+)|(V)\s*([-\d.]+)/g,
      (match, cmd2, x2, y2, cmdH, xH) => {
        if (cmd2) return `${cmd2} ${scaleX(parseFloat(x2))} ${y2}`;
        if (cmdH) return `${cmdH} ${scaleX(parseFloat(xH))}`;
        return match;
      },
    );
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Viewport Culling Utilities
// ---------------------------------------------------------------------------

const CULL_MARGIN_FACTOR = 0.5; // 50% padding beyond screen edges to prevent pop-in
const LOD_MIN_TOTAL_NODES = 500;
const LOD_MAX_ZOOM_SCALE = 0.1;

interface ViewportBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Computes the visible world-space rectangle, accounting for D3 zoom transform.
 * The D3 transform is: screen = world * scale + translate
 * So: world = (screen - translate) / scale
 */
function computeViewportBounds(
  zoomX: number,
  zoomY: number,
  zoomScale: number,
  viewportW: number,
  viewportH: number,
): ViewportBounds {
  const marginX = (viewportW / zoomScale) * CULL_MARGIN_FACTOR;
  const marginY = (viewportH / zoomScale) * CULL_MARGIN_FACTOR;

  const worldMinX = -zoomX / zoomScale - marginX;
  const worldMinY = -zoomY / zoomScale - marginY;
  const worldMaxX = (viewportW - zoomX) / zoomScale + marginX;
  const worldMaxY = (viewportH - zoomY) / zoomScale + marginY;

  return { minX: worldMinX, minY: worldMinY, maxX: worldMaxX, maxY: worldMaxY };
}

/**
 * Returns true if a node's bounding box overlaps the viewport bounds.
 */
function isNodeVisible(
  nodeX: number,
  nodeY: number,
  nodeW: number,
  nodeH: number,
  vp: ViewportBounds,
): boolean {
  const halfW = nodeW / 2;
  const halfH = nodeH / 2;
  return (
    nodeX + halfW >= vp.minX &&
    nodeX - halfW <= vp.maxX &&
    nodeY + halfH >= vp.minY &&
    nodeY - halfH <= vp.maxY
  );
}

/**
 * Extracts a rough bounding box from SVG path data (M/L commands only).
 * Returns null when path is invalid or empty.
 */
function getPathBounds(pathData: string): { minX: number; minY: number; maxX: number; maxY: number } | null {
  const points = extractPathPoints(pathData);
  if (points.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Returns true if an edge's path overlaps the viewport bounds.
 */
function isEdgeVisible(edge: EdgeEntity, vp: ViewportBounds): boolean {
  const b = edge.bounds || (edge.pathData ? getPathBounds(edge.pathData) : null);
  if (!b) return false;
  return b.maxX >= vp.minX && b.minX <= vp.maxX && b.maxY >= vp.minY && b.minY <= vp.maxY;
}

function normalizeSiblingBarPath(edge: EdgeEntity, scaledPath: string): string {
  if (edge.type !== 'sibling-bar') return scaledPath;

  const points = scaledPath.match(/[-\d.]+/g);
  if (!points || points.length < 4) return scaledPath;

  const x1 = parseFloat(points[0]);
  const y = parseFloat(points[1]);
  const x2 = parseFloat(points[2]);

  if (Math.abs(x1 - x2) >= 1) return scaledPath;

  return `M ${x1 - MIN_SIBLING_BAR_HALF_PX} ${y} L ${x1 + MIN_SIBLING_BAR_HALF_PX} ${y}`;
}


function distanceBetweenPoints(left: { x: number; y: number }, right: { x: number; y: number }): number {
  return Math.hypot(right.x - left.x, right.y - left.y);
}

function pointAlongSegment(
  from: { x: number; y: number },
  to: { x: number; y: number },
  distance: number,
): { x: number; y: number } {
  const segmentLength = distanceBetweenPoints(from, to);
  if (segmentLength <= 0) return from;

  const ratio = Math.min(1, Math.max(0, distance / segmentLength));
  return {
    x: from.x + (to.x - from.x) * ratio,
    y: from.y + (to.y - from.y) * ratio,
  };
}

function formatPathPoint(point: { x: number; y: number }): string {
  return `${Number(point.x.toFixed(2))} ${Number(point.y.toFixed(2))}`;
}

function buildRoundedOrthogonalPath(points: Array<{ x: number; y: number }>): string {
  if (points.length < 3) return `M ${formatPathPoint(points[0])} L ${formatPathPoint(points[points.length - 1])}`;

  const commands: string[] = [`M ${formatPathPoint(points[0])}`];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const corner = points[index];
    const next = points[index + 1];
    const previousDistance = distanceBetweenPoints(previous, corner);
    const nextDistance = distanceBetweenPoints(corner, next);

    if (previousDistance <= 0 || nextDistance <= 0) {
      commands.push(`L ${formatPathPoint(corner)}`);
      continue;
    }

    const isStraightThrough =
      Math.abs((corner.x - previous.x) * (next.y - corner.y) - (corner.y - previous.y) * (next.x - corner.x)) < 0.01;

    if (isStraightThrough) {
      commands.push(`L ${formatPathPoint(corner)}`);
      continue;
    }

    const radius = Math.min(CURVED_CORNER_RADIUS, previousDistance / 2, nextDistance / 2);
    const beforeCorner = pointAlongSegment(corner, previous, radius);
    const afterCorner = pointAlongSegment(corner, next, radius);

    commands.push(`L ${formatPathPoint(beforeCorner)}`);
    commands.push(`Q ${formatPathPoint(corner)} ${formatPathPoint(afterCorner)}`);
  }

  commands.push(`L ${formatPathPoint(points[points.length - 1])}`);
  return commands.join(' ');
}

function resolveLinePath(edge: EdgeEntity, scaledPath: string, lineStyle: V3LineStyle): string {
  if (edge.type === 'sibling-bar' || lineStyle === 'step') return scaledPath;

  const points = extractPathPoints(scaledPath);
  if (points.length < 3) return scaledPath;

  return buildRoundedOrthogonalPath(points);
}

function normalizeV3LineStyle(lineStyle: TreeSettings['lineStyle'] | undefined): V3LineStyle {
  return lineStyle === 'curved' ? 'curved' : 'step';
}

function computeCullRatio(visibleCount: number, totalCount: number): number {
  if (totalCount <= 0) return 0;
  return Number((1 - visibleCount / totalCount).toFixed(4));
}

function isV3RenderDiagnosticsEnabled(): boolean {
  try {
    return window.localStorage.getItem('jozor.renderDiagnostics') === '1';
  } catch {
    return false;
  }
}

function resolveStrokeStyle(
  edgeType: EdgeEntityType,
  lineThickness: number | undefined,
): { stroke: string; strokeWidth: number; dashArray?: string } {
  const base = EDGE_STROKE[edgeType];
  const requestedThickness = Number.isFinite(lineThickness)
    ? Math.max(1, Math.min(8, Number(lineThickness)))
    : 2;
  const widthOffset = base.strokeWidth - 2;

  return {
    ...base,
    strokeWidth: Math.max(1, requestedThickness + widthOffset),
  };
}

type V3ResolvedEdgePath = {
  edge: EdgeEntity;
  style: { stroke: string; strokeWidth: number; dashArray?: string };
  scaledPath: string;
};

function hasInvalidPath(pathData: string | undefined | null): boolean {
  return typeof pathData !== 'string'
    || pathData.trim() === ''
    || pathData.includes('NaN')
    || pathData.includes('undefined');
}

function buildCurvedFamilyConnectorPath(
  trunkStart: { x: number; y: number },
  childEnd: { x: number; y: number },
  startDrop: number,
): string {
  const curveStart = {
    x: trunkStart.x,
    y: Math.min(childEnd.y, trunkStart.y + startDrop),
  };
  const verticalDistance = childEnd.y - curveStart.y;
  const controlY = curveStart.y + verticalDistance * 0.52;

  return [
    `M ${formatPathPoint(trunkStart)}`,
    `L ${formatPathPoint(curveStart)}`,
    `C ${formatPathPoint({ x: curveStart.x, y: controlY })}`,
    `${formatPathPoint({ x: childEnd.x, y: controlY })}`,
    `${formatPathPoint(childEnd)}`,
  ].join(' ');
}

function buildCurvedFamilyEdgePaths(
  edgeEntities: EdgeEntity[],
  scaleX: ScaleX,
  lineThickness: number | undefined,
  nodeHeight: number,
): V3ResolvedEdgePath[] {
  const trunksByFamily = new Map<string, { edge: EdgeEntity; start: { x: number; y: number } }>();
  const childDropFamilies = new Set<string>();
  const parentClearanceDrop = nodeHeight / 2 + CURVED_PARENT_CARD_CLEARANCE;

  edgeEntities.forEach((edge) => {
    if (edge.type === 'child-drop' && !hasInvalidPath(edge.pathData)) {
      childDropFamilies.add(edge.metadata.familyId);
    }

    if (edge.type !== 'family-trunk' || hasInvalidPath(edge.pathData)) return;

    const points = extractPathPoints(scalePathX(edge.pathData, scaleX));
    const start = points[0];
    if (!start) return;

    trunksByFamily.set(edge.metadata.familyId, { edge, start });
  });

  return edgeEntities
    .map((edge): V3ResolvedEdgePath | null => {
      const style = resolveStrokeStyle(edge.type, lineThickness);
      const hasCurvedFamilyReplacement = trunksByFamily.has(edge.metadata.familyId)
        && childDropFamilies.has(edge.metadata.familyId);

      if (edge.type === 'sibling-bar' && hasCurvedFamilyReplacement) {
        return null;
      }

      if (edge.type === 'family-trunk' && hasCurvedFamilyReplacement) {
        return null;
      }

      if (edge.type === 'child-drop') {
        const trunk = trunksByFamily.get(edge.metadata.familyId);
        if (trunk && !hasInvalidPath(edge.pathData)) {
          const points = extractPathPoints(scalePathX(edge.pathData, scaleX));
          const childEnd = points[points.length - 1];
          if (childEnd) {
            const scaledPath = buildCurvedFamilyConnectorPath(trunk.start, childEnd, parentClearanceDrop);
            return scaledPath.includes('NaN') || scaledPath.includes('undefined')
              ? null
              : { edge, style, scaledPath };
          }
        }
      }

      if (hasInvalidPath(edge.pathData)) return null;

      const scaledPath = resolveLinePath(
        edge,
        normalizeSiblingBarPath(edge, scalePathX(edge.pathData, scaleX)),
        'curved',
      );
      return hasInvalidPath(scaledPath) ? null : { edge, style, scaledPath };
    })
    .filter((edgePath): edgePath is V3ResolvedEdgePath => edgePath !== null);
}

function buildTreeNodes(
  projectedNodes: V3RendererPipeline['projectedNodes'],
  people: Record<string, Person>,
  focusPersonId: string | undefined,
  scaleX: ScaleX,
): TreeNodeWithIndex[] {
  return projectedNodes
    .map<TreeNodeWithIndex | null>((node, index) => {
      const person = people[node.personId];
      if (!person) return null;

      const x = scaleX(node.x);
      const y = node.y;

      if (Number.isNaN(x) || Number.isNaN(y)) return null;

      const id = node.uniqueEntityId || `fallback:${node.personId}:${index}`;
      const type = node.personId === focusPersonId ? 'focus' : 'descendant';
      const isReference = node.isReference ?? node.uniqueEntityId?.startsWith('ref:') ?? false;

      return {
        id,
        x,
        y,
        data: person,
        type,
        isReference,
        index,
      };
    })
    .filter((node): node is TreeNodeWithIndex => node !== null);
}

interface V3CanvasBackgroundProps {
  canvasMinX: number;
  canvasMinY: number;
  canvasWidth: number;
  canvasHeight: number;
}

const V3CanvasBackground = memo<V3CanvasBackgroundProps>(({
  canvasMinX,
  canvasMinY,
  canvasWidth,
  canvasHeight,
}) => (
  <rect
    x={canvasMinX}
    y={canvasMinY}
    width={canvasWidth}
    height={canvasHeight}
    rx={16}
    ry={16}
    fill="transparent"
    stroke="var(--tree-node-border)"
  />
));

V3CanvasBackground.displayName = 'V3CanvasBackground';

interface V3EdgesLayerProps {
  edgeEntities: EdgeEntity[];
  scaleX: ScaleX;
  lineStyle: V3LineStyle;
  lineThickness?: number;
  nodeHeight: number;
}

const V3EdgesLayer = memo<V3EdgesLayerProps>(({ edgeEntities, scaleX, lineStyle, lineThickness, nodeHeight }) => {
  const edgePaths = useMemo(() => {
    if (lineStyle === 'curved') {
      return buildCurvedFamilyEdgePaths(edgeEntities, scaleX, lineThickness, nodeHeight);
    }

    return edgeEntities
      .map((edge): V3ResolvedEdgePath | null => {
        const style = resolveStrokeStyle(edge.type, lineThickness);
        const rawPath = edge.pathData;

        if (hasInvalidPath(rawPath)) return null;

        const scaledPath = resolveLinePath(
          edge,
          normalizeSiblingBarPath(edge, scalePathX(rawPath, scaleX)),
          lineStyle,
        );
        if (hasInvalidPath(scaledPath)) return null;

        return { edge, style, scaledPath };
      })
      .filter((edgePath): edgePath is V3ResolvedEdgePath => edgePath !== null);
  }, [edgeEntities, lineStyle, lineThickness, nodeHeight, scaleX]);

  return (
    <g 
      aria-label="V3 family graph edges" 
      className="links-layer"
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    >
      {edgePaths.map(({ edge, style, scaledPath }) => (
        <path
          key={edge.id}
          d={scaledPath}
          fill="none"
          stroke={style.stroke}
          strokeWidth={style.strokeWidth}
          strokeDasharray={style.dashArray}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.95}
          data-edge-type={edge.type}
          data-edge-id={edge.id}
        />
      ))}
    </g>
  );
});

V3EdgesLayer.displayName = 'V3EdgesLayer';

interface V3FamilyDotsLayerProps {
  familyNodes: V3RendererPipeline['familyNodes'];
  scaleX: ScaleX;
}

const V3FamilyDotsLayer = memo<V3FamilyDotsLayerProps>(({ familyNodes, scaleX }) => (
  <g aria-label="V3 family nodes" style={{ willChange: 'transform', transform: 'translateZ(0)' }}>
    {familyNodes.map((family) => (
      <circle
        key={family.familyId}
        cx={scaleX(family.x)}
        cy={family.y}
        r={FAMILY_DOT_RADIUS}
        fill="#fcd34d"
        stroke="#b45309"
        strokeWidth={2}
        data-family-id={family.familyId}
      >
        <title>{family.familyId}</title>
      </circle>
    ))}
  </g>
));

V3FamilyDotsLayer.displayName = 'V3FamilyDotsLayer';

interface V3PersonNodesLayerProps {
  treeNodes: TreeNodeWithIndex[];
  totalNodeCount: number;
  focusPersonId?: string;
  highlightedPath?: Set<string>;
  onSelect: (id: string) => void;
  onNodeContextMenu: (event: React.MouseEvent, id: string) => void;
  settings: TreeSettings;
  zoomScale: number;
  nodeWidth: number;
  nodeHeight: number;
}

const V3PersonNodesLayer = memo<V3PersonNodesLayerProps>(({
  treeNodes,
  totalNodeCount,
  focusPersonId,
  highlightedPath,
  onSelect,
  onNodeContextMenu,
  settings,
  zoomScale,
  nodeWidth,
  nodeHeight,
}) => {
  const visiblePersonIds = useMemo(
    () => new Set(treeNodes.map((visibleNode) => visibleNode.data.id)),
    [treeNodes],
  );
  const useLightweightLOD = totalNodeCount >= LOD_MIN_TOTAL_NODES && zoomScale < LOD_MAX_ZOOM_SCALE;

  return (
    <g 
      aria-label="V3 family graph persons" 
      className="nodes-layer"
      style={{ willChange: 'transform', transform: 'translateZ(0)' }}
    >
      {treeNodes.map((node, index) => {
      const isPathHighlighted = highlightedPath?.has(node.data.id) ?? false;
      const parentNavigationTargetId = getParentNavigationTargetId(node.data);
      const showParentNavigation = Boolean(
        parentNavigationTargetId && !visiblePersonIds.has(parentNavigationTargetId),
      );

      return (
        <NodeComponent
          key={node.id}
          node={node}
          index={index}
          isFocused={node.data.id === focusPersonId}
          isHighlighted={false}
          onSelect={onSelect}
          onNodeContextMenu={onNodeContextMenu}
          settings={settings}
          zoomScale={zoomScale}
          nodeWidth={nodeWidth}
          nodeHeight={nodeHeight}
          useLightweightLOD={useLightweightLOD}
          isPathHighlighted={isPathHighlighted}
          showParentNavigation={showParentNavigation}
          isDimmed={Boolean(
            highlightedPath && highlightedPath.size > 0 && !isPathHighlighted,
          )}
        />
      );
      })}
    </g>
  );
});

V3PersonNodesLayer.displayName = 'V3PersonNodesLayer';

export const V3FamilyGraphRenderer: React.FC<V3FamilyGraphRendererProps> = ({
  people,
  settings,
  pipeline,
  focusPersonId,
  highlightedPath,
  zoomScale,
  zoomX,
  zoomY,
  viewportSize,
  onSelect,
  onNodeContextMenu,
  padding = 48,
}) => {
  const nodeWidth =
    settings.nodeWidth || (settings.isCompact ? NODE_WIDTH_COMPACT : NODE_WIDTH_DEFAULT);
  const nodeHeight = settings.isCompact ? NODE_HEIGHT_COMPACT : NODE_HEIGHT_DEFAULT;
  const { projectedNodes, familyNodes, edgeEntities, bounds } = pipeline;
  const scaleX = useMemo<ScaleX>(() => (x) => x, []);

  // --- Viewport Culling ---
  // Compute the visible world-space rectangle from D3 zoom state.
  // When viewport info is not available (e.g. export context), skip culling.
  const viewportBounds = useMemo<ViewportBounds | null>(() => {
    const scale = zoomScale ?? 1;
    const tx = zoomX ?? 0;
    const ty = zoomY ?? 0;
    const vw = viewportSize?.width ?? 0;
    const vh = viewportSize?.height ?? 0;
    // Skip culling when viewport dimensions are unknown or zoom is identity with no offset
    if (vw <= 0 || vh <= 0) return null;
    return computeViewportBounds(tx, ty, scale, vw, vh);
  }, [zoomScale, zoomX, zoomY, viewportSize]);

  const visibleNodes = useMemo(() => {
    if (!viewportBounds) return projectedNodes;
    return projectedNodes.filter((node) =>
      isNodeVisible(node.x, node.y, nodeWidth, nodeHeight, viewportBounds)
    );
  }, [projectedNodes, viewportBounds, nodeWidth, nodeHeight]);

  const visibleEdges = useMemo(() => {
    if (!viewportBounds) return edgeEntities;
    return edgeEntities.filter((edge) => isEdgeVisible(edge, viewportBounds));
  }, [edgeEntities, viewportBounds]);

  const visibleFamilyNodes = useMemo(() => {
    if (!viewportBounds) return familyNodes;
    return familyNodes.filter(
      (fn) =>
        fn.x >= viewportBounds.minX && fn.x <= viewportBounds.maxX &&
        fn.y >= viewportBounds.minY && fn.y <= viewportBounds.maxY,
    );
  }, [familyNodes, viewportBounds]);

  const canvasMinX = scaleX(bounds.minX) - nodeWidth / 2 - padding;
  const canvasMinY = bounds.minY - nodeHeight / 2 - padding;
  const canvasMaxX = scaleX(bounds.maxX) + nodeWidth / 2 + padding;
  const canvasMaxY = bounds.maxY + nodeHeight / 2 + padding;
  const canvasWidth = Math.max(320, canvasMaxX - canvasMinX);
  const canvasHeight = Math.max(240, canvasMaxY - canvasMinY);

  const treeNodes = useMemo(
    () => buildTreeNodes(visibleNodes, people, focusPersonId, scaleX),
    [focusPersonId, people, scaleX, visibleNodes],
  );
  const renderDiagnostics = useMemo<V3RenderDiagnosticsSnapshot>(() => ({
    totalNodes: projectedNodes.length,
    visibleNodes: visibleNodes.length,
    renderedTreeNodes: treeNodes.length,
    totalEdges: edgeEntities.length,
    visibleEdges: visibleEdges.length,
    totalFamilyNodes: familyNodes.length,
    visibleFamilyNodes: visibleFamilyNodes.length,
    cullingEnabled: viewportBounds !== null,
    nodeCullRatio: computeCullRatio(visibleNodes.length, projectedNodes.length),
    edgeCullRatio: computeCullRatio(visibleEdges.length, edgeEntities.length),
    zoomScale: zoomScale ?? 1,
  }), [
    edgeEntities.length,
    familyNodes.length,
    projectedNodes.length,
    treeNodes.length,
    viewportBounds,
    visibleEdges.length,
    visibleFamilyNodes.length,
    visibleNodes.length,
    zoomScale,
  ]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;

    window.__JOZOR_V3_RENDER_STATS__ = renderDiagnostics;
    if (isV3RenderDiagnosticsEnabled()) {
      // eslint-disable-next-line no-console
      console.table([renderDiagnostics]);
    }
  }, [renderDiagnostics]);

  if (Number.isNaN(canvasWidth) || Number.isNaN(canvasHeight)) {
    return null;
  }

  return (
    <g
      aria-label="V3 family graph renderer"
      data-renderer="v3-family-graph"
      data-visible-nodes={import.meta.env.DEV ? visibleNodes.length : undefined}
      data-total-nodes={import.meta.env.DEV ? projectedNodes.length : undefined}
      data-visible-edges={import.meta.env.DEV ? visibleEdges.length : undefined}
      data-total-edges={import.meta.env.DEV ? edgeEntities.length : undefined}
    >
      <V3CanvasBackground
        canvasMinX={canvasMinX}
        canvasMinY={canvasMinY}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
      <V3EdgesLayer
        edgeEntities={visibleEdges}
        scaleX={scaleX}
        lineStyle={normalizeV3LineStyle(settings.lineStyle)}
        lineThickness={settings.lineThickness}
        nodeHeight={nodeHeight}
      />
      <V3FamilyDotsLayer familyNodes={visibleFamilyNodes} scaleX={scaleX} />
      <V3PersonNodesLayer
        treeNodes={treeNodes}
        totalNodeCount={projectedNodes.length}
        focusPersonId={focusPersonId}
        highlightedPath={highlightedPath}
        onSelect={onSelect ?? noopSelect}
        onNodeContextMenu={onNodeContextMenu ?? noopContextMenu}
        settings={settings}
        zoomScale={zoomScale ?? 1}
        nodeWidth={nodeWidth}
        nodeHeight={nodeHeight}
      />
    </g>
  );
};

export default V3FamilyGraphRenderer;
