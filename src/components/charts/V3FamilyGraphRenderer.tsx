import React, { memo, useMemo, useRef } from 'react';
import type { Person, TreeNode, TreeSettings } from '../../types';
import type {
  V3CollapseControl,
  V3RendererPipeline,
} from '../../hooks/tree/useV3RendererPipeline';
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
const COLLAPSE_CONTROLS_ENABLED = false;
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
  onSelect?: (id: string) => void;
  onNodeContextMenu?: (e: React.MouseEvent, id: string) => void;
  onToggleCollapse?: (uniqueKey: string) => void;
  padding?: number;
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

function extractPathPoints(pathData: string): Array<{ x: number; y: number }> {
  const points: Array<{ x: number; y: number }> = [];
  const re = /[ML]\s*([-\d.]+)\s+([-\d.]+)/g;
  let match: RegExpExecArray | null;

  while ((match = re.exec(pathData)) !== null) {
    points.push({ x: parseFloat(match[1]), y: parseFloat(match[2]) });
  }

  return points.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
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
  previousNodesById?: ReadonlyMap<string, TreeNodeWithIndex>,
): TreeNodeWithIndex[] {
  return projectedNodes
    .map((node, index) => {
      const person = people[node.personId];
      if (!person) return null;

      const x = scaleX(node.x);
      const y = node.y;

      if (Number.isNaN(x) || Number.isNaN(y)) return null;

      const id = node.uniqueEntityId || `fallback:${node.personId}:${index}`;
      const type = node.personId === focusPersonId ? 'focus' : 'descendant';
      const isReference = node.isReference ?? node.uniqueEntityId?.startsWith('ref:') ?? false;
      const previousNode = previousNodesById?.get(id);

      if (
        previousNode &&
        previousNode.x === x &&
        previousNode.y === y &&
        previousNode.index === index &&
        previousNode.data === person &&
        previousNode.type === type &&
        previousNode.isReference === isReference
      ) {
        return previousNode;
      }

      return {
        id,
        x,
        y,
        data: person,
        type,
        isReference,
        index,
      } satisfies TreeNodeWithIndex;
    })
    .filter((node): node is TreeNodeWithIndex => node !== null);
}

function useStableTreeNodes(
  projectedNodes: V3RendererPipeline['projectedNodes'],
  people: Record<string, Person>,
  focusPersonId: string | undefined,
  scaleX: ScaleX,
): TreeNodeWithIndex[] {
  const previousNodesByIdRef = useRef<Map<string, TreeNodeWithIndex>>(new Map());

  return useMemo(() => {
    const treeNodes = buildTreeNodes(
      projectedNodes,
      people,
      focusPersonId,
      scaleX,
      previousNodesByIdRef.current,
    );

    previousNodesByIdRef.current = new Map(treeNodes.map((node) => [node.id, node]));
    return treeNodes;
  }, [focusPersonId, people, projectedNodes, scaleX]);
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

interface V3CollapseControlsLayerProps {
  collapseControls: V3CollapseControl[];
  onToggleCollapse?: (uniqueKey: string) => void;
  scaleX: ScaleX;
}

const V3CollapseControlsLayer = memo<V3CollapseControlsLayerProps>(({
  collapseControls,
  onToggleCollapse,
  scaleX,
}) => {
  if (!COLLAPSE_CONTROLS_ENABLED) return <g aria-label="V3 collapse controls" />;

  return (
    <g aria-label="V3 collapse controls">
      {collapseControls.map((control) => {
        const scaledOriginX = scaleX(control.originX);
        const scaledX = scaleX(control.x);
        const stemPath = control.direction === 'up'
          ? `M ${scaledOriginX} ${control.originY} V ${control.y + 12}`
          : `M ${scaledOriginX} ${control.originY} V ${control.y - 12}`;

        return (
          <g key={control.uniqueKey} data-collapse-key={control.uniqueKey}>
            <path
              d={stemPath}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
            <g
              transform={`translate(${scaledX}, ${control.y})`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleCollapse?.(control.uniqueKey);
              }}
              style={{ cursor: onToggleCollapse ? 'pointer' : 'default' }}
            >
              <circle
                r={12}
                fill="#ffffff"
                stroke={control.isCollapsed ? '#2563eb' : '#94a3b8'}
                strokeWidth={control.isCollapsed ? 2 : 1.5}
              />
              <line
                x1={-4}
                y1={0}
                x2={4}
                y2={0}
                stroke={control.isCollapsed ? '#2563eb' : '#475569'}
                strokeWidth={1.8}
                strokeLinecap="round"
              />
              {control.isCollapsed ? (
                <line
                  x1={0}
                  y1={-4}
                  x2={0}
                  y2={4}
                  stroke="#2563eb"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                />
              ) : null}
            </g>
          </g>
        );
      })}
    </g>
  );
});

V3CollapseControlsLayer.displayName = 'V3CollapseControlsLayer';

interface V3PersonNodesLayerProps {
  treeNodes: TreeNodeWithIndex[];
  focusPersonId?: string;
  highlightedPath?: Set<string>;
  onSelect: (id: string) => void;
  onNodeContextMenu: (event: React.MouseEvent, id: string) => void;
  settings: TreeSettings;
  nodeWidth: number;
  nodeHeight: number;
}

const V3PersonNodesLayer = memo<V3PersonNodesLayerProps>(({
  treeNodes,
  focusPersonId,
  highlightedPath,
  onSelect,
  onNodeContextMenu,
  settings,
  nodeWidth,
  nodeHeight,
}) => {
  const visiblePersonIds = new Set(treeNodes.map((visibleNode) => visibleNode.data.id));

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
          zoomScale={1}
          nodeWidth={nodeWidth}
          nodeHeight={nodeHeight}
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
  onSelect,
  onNodeContextMenu,
  onToggleCollapse,
  padding = 48,
}) => {
  const nodeWidth =
    settings.nodeWidth || (settings.isCompact ? NODE_WIDTH_COMPACT : NODE_WIDTH_DEFAULT);
  const nodeHeight = settings.isCompact ? NODE_HEIGHT_COMPACT : NODE_HEIGHT_DEFAULT;
  const { projectedNodes, familyNodes, edgeEntities, collapseControls, bounds } = pipeline;
  const scaleX = useMemo<ScaleX>(() => (x) => x, []);

  const canvasMinX = scaleX(bounds.minX) - nodeWidth / 2 - padding;
  const canvasMinY = bounds.minY - nodeHeight / 2 - padding;
  const canvasMaxX = scaleX(bounds.maxX) + nodeWidth / 2 + padding;
  const canvasMaxY = bounds.maxY + nodeHeight / 2 + padding;
  const canvasWidth = Math.max(320, canvasMaxX - canvasMinX);
  const canvasHeight = Math.max(240, canvasMaxY - canvasMinY);

  const treeNodes = useStableTreeNodes(projectedNodes, people, focusPersonId, scaleX);

  if (Number.isNaN(canvasWidth) || Number.isNaN(canvasHeight)) {
    return null;
  }

  return (
    <g
      aria-label="V3 family graph renderer"
      data-renderer="v3-family-graph"
    >
      <V3CanvasBackground
        canvasMinX={canvasMinX}
        canvasMinY={canvasMinY}
        canvasWidth={canvasWidth}
        canvasHeight={canvasHeight}
      />
      <V3EdgesLayer
        edgeEntities={edgeEntities}
        scaleX={scaleX}
        lineStyle={normalizeV3LineStyle(settings.lineStyle)}
        lineThickness={settings.lineThickness}
        nodeHeight={nodeHeight}
      />
      <V3FamilyDotsLayer familyNodes={familyNodes} scaleX={scaleX} />
      <V3CollapseControlsLayer
        collapseControls={collapseControls}
        onToggleCollapse={onToggleCollapse}
        scaleX={scaleX}
      />
      <V3PersonNodesLayer
        treeNodes={treeNodes}
        focusPersonId={focusPersonId}
        highlightedPath={highlightedPath}
        onSelect={onSelect ?? noopSelect}
        onNodeContextMenu={onNodeContextMenu ?? noopContextMenu}
        settings={settings}
        nodeWidth={nodeWidth}
        nodeHeight={nodeHeight}
      />
    </g>
  );
};

export default V3FamilyGraphRenderer;
