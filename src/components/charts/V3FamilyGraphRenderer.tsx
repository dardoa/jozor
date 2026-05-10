import React, { memo, useMemo, useRef } from 'react';
import type { Person, TreeNode, TreeSettings } from '../../types';
import type {
  V3CollapseControl,
  V3RendererPipeline,
} from '../../hooks/useV3RendererPipeline';
import type { EdgeEntity, EdgeEntityType } from '../../domain/familyGraphClusterLayout';
import {
  NODE_HEIGHT_COMPACT,
  NODE_HEIGHT_DEFAULT,
  NODE_WIDTH_COMPACT,
  NODE_WIDTH_DEFAULT,
} from '../../utils/layout/constants';
import { NodeComponent } from '../NodeComponent';

const FAMILY_DOT_RADIUS = 6;
const MIN_SIBLING_BAR_HALF_PX = 16;
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

function resolveLinePath(edge: EdgeEntity, scaledPath: string, lineStyle: V3LineStyle): string {
  if (edge.type === 'sibling-bar' || lineStyle === 'step') return scaledPath;

  const points = extractPathPoints(scaledPath);
  if (points.length < 2) return scaledPath;

  const start = points[0];
  const end = points[points.length - 1];

  if (lineStyle === 'straight') {
    return `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
  }

  const midY = start.y + (end.y - start.y) / 2;
  return `M ${start.x} ${start.y} C ${start.x} ${midY} ${end.x} ${midY} ${end.x} ${end.y}`;
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
    fill="#f8fafc"
    stroke="#e2e8f0"
  />
));

V3CanvasBackground.displayName = 'V3CanvasBackground';

interface V3EdgesLayerProps {
  edgeEntities: EdgeEntity[];
  scaleX: ScaleX;
  lineStyle: V3LineStyle;
  lineThickness?: number;
}

const V3EdgesLayer = memo<V3EdgesLayerProps>(({ edgeEntities, scaleX, lineStyle, lineThickness }) => {
  const edgePaths = useMemo(() => (
    edgeEntities
      .map((edge) => {
        const style = resolveStrokeStyle(edge.type, lineThickness);
        const rawPath = edge.pathData;

        if (typeof rawPath !== 'string' || rawPath.trim() === '' || rawPath.includes('undefined')) {
          return null;
        }

        const scaledPath = resolveLinePath(
          edge,
          normalizeSiblingBarPath(edge, scalePathX(rawPath, scaleX)),
          lineStyle,
        );
        if (!scaledPath || scaledPath.includes('NaN') || scaledPath.includes('undefined')) {
          return null;
        }

        return { edge, style, scaledPath };
      })
      .filter((edgePath): edgePath is {
        edge: EdgeEntity;
        style: { stroke: string; strokeWidth: number; dashArray?: string };
        scaledPath: string;
      } => edgePath !== null)
  ), [edgeEntities, lineStyle, lineThickness, scaleX]);

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
        lineStyle={settings.lineStyle ?? 'curved'}
        lineThickness={settings.lineThickness}
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
