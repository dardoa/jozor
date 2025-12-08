import React, { useCallback, memo } from 'react';
import { Person, TreeLink, TreeSettings, TreeNode } from '../../types';
import { CollapsePoint, NODE_WIDTH_DEFAULT, NODE_WIDTH_COMPACT, NODE_HEIGHT_DEFAULT, NODE_HEIGHT_COMPACT } from '../../utils/treeLayout';
import { getYears } => '../../utils/familyLogic';
import { User, Ribbon, ChevronDown, ChevronUp, ChevronRight, ChevronLeft } from 'lucide-react';

interface DescendantPedigreeChartProps {
  nodes: TreeNode[];
  links: TreeLink[];
  collapsePoints: CollapsePoint[];
  focusId: string;
  onSelect: (id: string) => void;
  settings: TreeSettings;
  toggleCollapse: (uniqueKey: string) => void;
  people: Record<string, Person>; // Needed for link path logic
}

export const DescendantPedigreeChart: React.FC<DescendantPedigreeChartProps> = memo(({
  nodes, links, collapsePoints, focusId, onSelect, settings, toggleCollapse, people
}) => {
  // Use centralized constants
  const NODE_WIDTH = settings.isCompact ? NODE_WIDTH_COMPACT : NODE_WIDTH_DEFAULT;
  const NODE_HEIGHT = settings.isCompact ? NODE_HEIGHT_COMPACT : NODE_HEIGHT_DEFAULT;
  const COLLAPSE_CIRCLE_RADIUS = 12; // Radius of the collapse circle
  const LINE_CORNER_RADIUS = 10; // Radius for line corners
  const isVertical = settings.layoutMode === 'vertical';

  // Helper function to draw path from collapse point to child with curved corners
  const drawChildBranchPath = useCallback((collapsePointX: number, collapsePointY: number, targetX: number, targetY: number) => {
    const startPointY = collapsePointY + COLLAPSE_CIRCLE_RADIUS; // Start from bottom edge of collapse circle
    const targetPointY = targetY - NODE_HEIGHT / 2; // Connect to top edge of target node
    const targetPointX = targetX;

    const r = LINE_CORNER_RADIUS;

    if (isVertical) {
        // If child is directly below collapse point, draw a straight vertical line
        if (Math.abs(collapsePointX - targetPointX) < 1) {
            return `M ${collapsePointX} ${startPointY} V ${targetPointY}`;
        }

        // Otherwise, draw a path with curved corners
        const midY = startPointY + (targetPointY - startPointY) / 2;
        const dirX = targetPointX > collapsePointX ? 1 : -1;

        return `M ${collapsePointX} ${startPointY}` +
               `V ${midY - r}` + // Vertical segment before first curve
               `Q ${collapsePointX} ${midY}, ${collapsePointX + dirX * r} ${midY}` + // First curve
               `H ${targetPointX - dirX * r}` + // Horizontal segment
               `Q ${targetPointX} ${midY}, ${targetPointX} ${midY + r}` + // Second curve
               `V ${targetPointY}`; // Vertical segment to target
    } else { // Horizontal layout
        const midX = startPointY + (targetPointY - startPointY) / 2;
        const dirY = targetPointX > collapsePointX ? 1 : -1;

        return `M ${collapsePointX} ${startPointY}` +
               `H ${midX - r}` + // Horizontal segment before first curve
               `Q ${midX} ${startPointY}, ${midX} ${startPointY + dirY * r}` + // First curve
               `V ${targetPointY - dirY * r}` + // Vertical segment
               `Q ${midX} ${targetPointY}, ${midX + r} ${targetPointY}` + // Second curve
               `H ${targetPointX}`; // Horizontal segment to target
    }
  }, [NODE_HEIGHT, NODE_WIDTH, LINE_CORNER_RADIUS, COLLAPSE_CIRCLE_RADIUS, isVertical]);

  // Helper to draw standard links
  const drawLinkPath = useCallback((source: TreeNode, target: TreeNode) => {
    const startX = source.x;
    const startY = source.y;
    const endX = target.x;
    const endY = target.y;

    const r = LINE_CORNER_RADIUS;

    if (isVertical) {
        const sourceBottom = startY + NODE_HEIGHT / 2;
        const targetTop = endY - NODE_HEIGHT / 2;
        const midY = sourceBottom + (targetTop - sourceBottom) / 2;

        return `M ${startX} ${sourceBottom}` +
               `V ${midY - r}` +
               `Q ${startX} ${midY}, ${startX + (endX > startX ? r : -r)} ${midY}` +
               `H ${endX + (startX > endX ? r : -r)}` +
               `Q ${endX} ${midY}, ${endX} ${midY + r}` +
               `V ${targetTop}`;
    } else { // Horizontal
        const sourceRight = startX + NODE_WIDTH / 2;
        const targetLeft = endX - NODE_WIDTH / 2;
        const midX = sourceRight + (targetLeft - sourceRight) / 2;

        return `M ${sourceRight} ${startY}` +
               `H ${midX - r}` +
               `Q ${midX} ${startY}, ${midX} ${startY + (endY > startY ? r : -r)}` +
               `V ${endY + (startY > endY ? r : -r)}` +
               `Q ${midX} ${endY}, ${midX + r} ${endY}` +
               `H ${targetLeft}`;
    }
  }, [NODE_HEIGHT, NODE_WIDTH, LINE_CORNER_RADIUS, isVertical]);

  // Helper to get collapse point icon
  const getCollapseIcon = useCallback((isCollapsed: boolean) => {
    if (isVertical) {
        return isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />;
    } else {
        return isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />;
    }
  }, [isVertical]);

  return (
    <g>
      {/* Links */}
      {links.map((link, i) => {
        const sourceNode = nodes.find(n => n.id === link.source);
        const targetNode = nodes.find(n => n.id === link.target);
        if (!sourceNode || !targetNode) return null;

        return (
          <path
            key={i}
            d={drawLinkPath(sourceNode, targetNode)}
            fill="none"
            stroke="var(--link-line-stroke)"
            strokeWidth="1.5"
            className="transition-all duration-300"
          />
        );
      })}

      {/* Nodes */}
      {nodes.map((node) => (
        <g
          key={node.id}
          transform={`translate(${node.x},${node.y})`}
          onClick={(e) => { e.stopPropagation(); onSelect(node.data.id); }}
          className="cursor-pointer"
        >
          <foreignObject
            x={-NODE_WIDTH / 2}
            y={-NODE_HEIGHT / 2}
            width={NODE_WIDTH}
            height={NODE_HEIGHT}
            className={`overflow-visible`}
          >
            <div
              className={`w-full h-full bg-white dark:bg-stone-800 rounded-xl shadow-card border border-stone-200/50 dark:border-stone-700/50 flex flex-col overflow-hidden transition-all duration-300
                ${node.id === focusId ? 'focus-ring' : ''}
                ${node.data.isDeceased ? 'opacity-70 grayscale' : ''}
              `}
              style={{
                borderColor: node.data.gender === 'male' ? 'var(--gender-male-border)' : 'var(--gender-female-border)',
                backgroundColor: node.data.gender === 'male' ? 'var(--gender-male-bg)' : 'var(--gender-female-bg)',
              }}
            >
              {/* Photo */}
              <div className="relative w-full h-2/3 bg-stone-100 dark:bg-stone-700 flex items-center justify-center overflow-hidden">
                {settings.showPhotos && node.data.photoUrl ? (
                  <img src={node.data.photoUrl} alt={node.data.firstName} className="w-full h-full object-cover" />
                ) : (
                  <User className={`w-1/2 h-1/2 ${node.data.gender === 'male' ? 'text-blue-300 dark:text-blue-800' : 'text-pink-300 dark:text-pink-800'}`} />
                )}
                {node.data.isDeceased && (
                  <div className="absolute top-2 right-2 bg-white dark:bg-stone-800 rounded-full p-1 shadow-sm border border-stone-100 dark:border-stone-700">
                    <Ribbon className="w-3 h-3 text-stone-600 dark:text-stone-400 fill-current" />
                  </div>
                )}
              </div>

              {/* Name & Dates */}
              <div className="flex-1 p-2 flex flex-col justify-center items-center text-center">
                <h4 className="text-sm font-bold leading-tight text-stone-900 dark:text-stone-100">
                  {node.data.firstName} {settings.showMiddleName && node.data.middleName} {settings.showLastName && node.data.lastName}
                </h4>
                {settings.showDates && (
                  <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-0.5">
                    {getYears(node.data)}
                  </p>
                )}
              </div>
            </div>
          </foreignObject>
        </g>
      ))}

      {/* Collapse Points */}
      {collapsePoints.map((cp) => {
        const originNode = nodes.find(n => n.id === cp.id);
        if (!originNode) return null;

        // Draw path from origin to collapse point
        const pathD = isVertical
            ? `M ${cp.originX} ${cp.originY + NODE_HEIGHT / 2} V ${cp.y - COLLAPSE_CIRCLE_RADIUS}`
            : `M ${cp.originX + NODE_WIDTH / 2} ${cp.originY} H ${cp.x - COLLAPSE_CIRCLE_RADIUS}`;

        return (
          <g key={cp.uniqueKey}>
            <path
              d={pathD}
              fill="none"
              stroke="var(--link-line-stroke)"
              strokeWidth="1.5"
              className="transition-all duration-300"
            />
            <g
              transform={`translate(${cp.x},${cp.y})`}
              onClick={(e) => { e.stopPropagation(); toggleCollapse(cp.uniqueKey); }}
              className="cursor-pointer"
            >
              <circle
                r={COLLAPSE_CIRCLE_RADIUS}
                fill="var(--card-bg)"
                stroke="var(--link-line-stroke)"
                strokeWidth="1.5"
                className="shadow-sm"
              />
              <foreignObject
                x={-COLLAPSE_CIRCLE_RADIUS}
                y={-COLLAPSE_CIRCLE_RADIUS}
                width={COLLAPSE_CIRCLE_RADIUS * 2}
                height={COLLAPSE_CIRCLE_RADIUS * 2}
                className="overflow-visible"
              >
                <div className="w-full h-full flex items-center justify-center text-stone-500 dark:text-stone-400">
                  {getCollapseIcon(cp.isCollapsed)}
                </div>
              </foreignObject>
            </g>
          </g>
        );
      })}
    </g>
  );
});