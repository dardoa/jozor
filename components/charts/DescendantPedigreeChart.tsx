import { useCallback, memo, useMemo } from 'react';
import { TreeLink, TreeSettings, TreeNode, Person } from '../../types';
import {
  CollapsePoint,
  NODE_WIDTH_DEFAULT,
  NODE_WIDTH_COMPACT,
  NODE_HEIGHT_DEFAULT,
  NODE_HEIGHT_COMPACT,
} from '../../utils/treeLayout';
import { TOKENS } from '../../utils/tokens';
import {
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { NodeComponent } from '../NodeComponent';
import './ChartStyles.css';

interface DescendantPedigreeChartProps {
  nodes: TreeNode[];
  links: TreeLink[];
  collapsePoints: CollapsePoint[];
  focusId: string;
  onSelect: (id: string) => void;
  settings: TreeSettings;
  toggleCollapse: (uniqueKey: string) => void;
  people: Record<string, Person>;
  highlightedNodeId: string | null;
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
  zoomScale: number;
  zoomX?: number;
  zoomY?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  pulsingNodeId?: string | null;
  isDimmed?: boolean;
  highlightedPath?: Set<string>;
}

const LinkItem = memo(({ d, isHighlighted, isDimmed, thickness = 1.5 }: { d: string; isHighlighted?: boolean; isDimmed?: boolean; thickness?: number }) => (
  <path
    d={d}
    fill='none'
    stroke={isHighlighted ? '#f59e0b' : 'var(--link-line-stroke)'}
    strokeWidth={isHighlighted ? Math.max(thickness * 2, 4) : thickness}
    className={`transition-all ${isHighlighted ? 'z-50' : 'opacity-100'}`}
    style={{
      opacity: isDimmed && !isHighlighted ? 0.2 : 1,
      transitionDuration: `${TOKENS.ANIMATIONS.long}ms`,
      transitionTimingFunction: TOKENS.EASING.outQuint
    }}
  />
));
LinkItem.displayName = 'LinkItem';

const CollapsePointItem = memo(({ cp, onToggleCollapse, isVertical, getCollapseIcon, COLLAPSE_CIRCLE_RADIUS }: {
  cp: CollapsePoint; onToggleCollapse: (id: string) => void; isVertical: boolean; getCollapseIcon: (isCollapsed: boolean) => React.ReactNode; COLLAPSE_CIRCLE_RADIUS: number;
}) => {
  const pathD = isVertical
    ? `M ${cp.originX} ${cp.originY} V ${cp.y - COLLAPSE_CIRCLE_RADIUS}`
    : `M ${cp.originX} ${cp.originY} H ${cp.x - COLLAPSE_CIRCLE_RADIUS}`;

  return (
    <g>
      <path
        d={pathD}
        fill='none'
        stroke='var(--link-line-stroke)'
        strokeWidth='1.5'
        className='transition-all'
        style={{
          transitionDuration: `${TOKENS.ANIMATIONS.long}ms`,
          transitionTimingFunction: TOKENS.EASING.outQuint
        }}
      />
      <g
        transform={`translate(${cp.x},${cp.y})`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleCollapse(cp.uniqueKey);
        }}
        className='cursor-pointer'
      >
        <circle
          r={COLLAPSE_CIRCLE_RADIUS}
          fill='var(--card-bg)'
          stroke='var(--link-line-stroke)'
          strokeWidth='1.5'
          className='shadow-sm'
        />
        <foreignObject
          x={-COLLAPSE_CIRCLE_RADIUS}
          y={-COLLAPSE_CIRCLE_RADIUS}
          width={COLLAPSE_CIRCLE_RADIUS * 2}
          height={COLLAPSE_CIRCLE_RADIUS * 2}
          className='overflow-visible'
        >
          <div className='w-full h-full flex items-center justify-center text-blue-600 dark:text-blue-400'>
            {getCollapseIcon(cp.isCollapsed)}
          </div>
        </foreignObject>
      </g>
    </g>
  );
});
CollapsePointItem.displayName = 'CollapsePointItem';

export const DescendantPedigreeChart = memo<DescendantPedigreeChartProps>(
  ({ nodes, links, collapsePoints, focusId, onSelect, settings, toggleCollapse, people, highlightedNodeId, onNodeContextMenu, zoomScale, pulsingNodeId, isDimmed, highlightedPath, zoomX, zoomY, viewportWidth, viewportHeight }) => {
    const NODE_WIDTH = settings.nodeWidth || (settings.isCompact ? NODE_WIDTH_COMPACT : NODE_WIDTH_DEFAULT);
    const NODE_HEIGHT = settings.isCompact ? NODE_HEIGHT_COMPACT : NODE_HEIGHT_DEFAULT;
    const COLLAPSE_CIRCLE_RADIUS = 12;
    const isVertical = settings.layoutMode === 'vertical';
    const isRadial = settings.layoutMode === 'radial';
    const nodeMap = useMemo(() => {
      const map = new Map<string, TreeNode>();
      for (const n of nodes) map.set(n.id, n);
      return map;
    }, [nodes]);

    const drawLinkPath = useCallback(
      (link: TreeLink) => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as TreeNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as TreeNode).id;

        const source = nodeMap.get(sourceId);
        const target = nodeMap.get(targetId);
        if (!target) return '';
        if (!source && !link.customOrigin) return '';

        const startX = source?.x ?? link.customOrigin?.x ?? 0;
        const startY = source?.y ?? link.customOrigin?.y ?? 0;
        const endX = target.x;
        const endY = target.y;

        if (link.type === 'marriage') {
          return `M ${startX} ${startY} L ${endX} ${endY}`;
        }

        if (link.type === 'parent-child') {
          if (isRadial) {
            const midX = (startX + endX) / 2;
            const midY = (startY + endY) / 2;
            return `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
          }

          let originX, originY;
          const customOrigin = link.customOrigin;

          if (customOrigin) {
            originX = customOrigin.x;
            originY = customOrigin.y;
          } else {
            const childPerson = people[target.id];
            let relevantCollapsePoint: CollapsePoint | undefined;

            if (childPerson && childPerson.parents.length >= 1) {
              relevantCollapsePoint = collapsePoints.find((cp) => {
                return (
                  childPerson.parents.includes(cp.id) &&
                  ((cp.spouseId === 'single' && childPerson.parents.length === 1) ||
                    childPerson.parents.includes(cp.spouseId))
                );
              });
            }

            if (relevantCollapsePoint) {
              originX = relevantCollapsePoint.x;
              originY = relevantCollapsePoint.y + (isVertical ? COLLAPSE_CIRCLE_RADIUS : 0);
              if (!isVertical) originX += COLLAPSE_CIRCLE_RADIUS;
            } else {
              if (isVertical) {
                originX = startX;
                originY = startY + NODE_HEIGHT / 2;
              } else {
                originX = startX + NODE_WIDTH / 2;
                originY = startY;
              }
            }
          }

          let targetInX, targetInY;
          if (isVertical) {
            targetInX = endX;
            targetInY = endY - NODE_HEIGHT / 2;
          } else {
            targetInX = endX - NODE_WIDTH / 2;
            targetInY = endY;
          }

          if (isVertical) {
            const LEVEL_SEP = 320; // Architectural Constant
            const childCenterY = targetInY + NODE_HEIGHT / 2;
            const parentCenterY = childCenterY - LEVEL_SEP;
            const forkY = parentCenterY + LEVEL_SEP * 0.55;

            if (settings.lineStyle === 'straight') {
              return `M ${originX} ${originY} L ${originX} ${forkY} H ${targetInX} V ${targetInY}`;
            }

            // Liquid Organic Curve
            const controlOffset = (targetInY - forkY) * 0.8;
            return `M ${originX},${originY} L ${originX},${forkY} C ${originX},${forkY + controlOffset} ${targetInX},${targetInY - controlOffset} ${targetInX},${targetInY}`;
          } else {
            const gapX = targetInX - originX;
            const turnX = originX + gapX * 0.05; // Keep horizontal tight for now or match fork

            if (settings.lineStyle === 'straight') {
              return `M ${originX} ${originY} H ${turnX} V ${targetInY} H ${targetInX}`;
            }
            // S-curve Bezier
            return `M ${originX},${originY} C ${turnX},${originY} ${turnX},${targetInY} ${targetInX},${targetInY}`;
          }
        }
        return '';
      },
      [NODE_HEIGHT, NODE_WIDTH, isVertical, isRadial, people, collapsePoints, nodeMap, settings.lineStyle]
    );

    const getCollapseIcon = useCallback(
      (isCollapsed: boolean) => {
        if (isVertical) {
          return isCollapsed ? <ChevronDown className='w-4 h-4' /> : <ChevronUp className='w-4 h-4' />;
        } else {
          return isCollapsed ? <ChevronLeft className='w-4 h-4' /> : <ChevronRight className='w-4 h-4' />;
        }
      },
      [isVertical]
    );

    return (
      <g>
        <g className="links-layer">
          {links.map((link, i) => {
            const pathD = drawLinkPath(link);
            if (!pathD) return null;

            const sourceId = typeof link.source === 'string' ? link.source : (link.source as TreeNode).id;
            const targetId = typeof link.target === 'string' ? link.target : (link.target as TreeNode).id;

            const isPathHighlighted = highlightedPath?.has(sourceId) && highlightedPath?.has(targetId);

            return <LinkItem
              key={`${link.source}-${link.target}-${i}`}
              d={pathD}
              isHighlighted={isPathHighlighted}
              isDimmed={!!highlightedPath && highlightedPath.size > 0}
              thickness={settings.lineThickness}
            />;
          })}
        </g>

        <g className="nodes-layer">
          {nodes.filter(node => {
            if (zoomX === undefined || zoomY === undefined || !viewportWidth || !viewportHeight) return true;
            // Virtualization logic: check if node is within visible bounds + buffer
            const screenX = node.x * zoomScale + zoomX;
            const screenY = node.y * zoomScale + zoomY;
            const buffer = 400; // Large buffer to pre-render before it enters screen

            return (
              screenX >= -buffer &&
              screenX <= viewportWidth + buffer &&
              screenY >= -buffer &&
              screenY <= viewportHeight + buffer
            );
          }).map((node, index) => {
            const isPathHighlighted = highlightedPath?.has(node.id);
            const isDimmedNode = (!!highlightedPath && highlightedPath.size > 0 && !isPathHighlighted) || (isDimmed && node.id !== pulsingNodeId);

            return (
              <NodeComponent
                key={node.id}
                node={node}
                index={index}
                isFocused={node.id === focusId}
                isHighlighted={node.id === highlightedNodeId}
                onSelect={onSelect}
                onNodeContextMenu={onNodeContextMenu}
                settings={settings}
                zoomScale={zoomScale}
                nodeWidth={NODE_WIDTH}
                nodeHeight={NODE_HEIGHT}
                isPulsing={node.id === pulsingNodeId}
                isPathHighlighted={isPathHighlighted}
                isDimmed={isDimmedNode}
              />
            );
          })}
        </g>

        <g className="ui-layer">
          {collapsePoints.map((cp) => (
            <CollapsePointItem
              key={cp.uniqueKey}
              cp={cp}
              onToggleCollapse={toggleCollapse}
              isVertical={isVertical}
              getCollapseIcon={getCollapseIcon}
              COLLAPSE_CIRCLE_RADIUS={COLLAPSE_CIRCLE_RADIUS}
            />
          ))}
        </g>
      </g>
    );
  }
);
