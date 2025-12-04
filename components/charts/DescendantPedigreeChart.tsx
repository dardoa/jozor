import React, { useCallback, memo } from 'react';
import { Person, TreeLink, TreeSettings, TreeNode } from '../../types';
import { CollapsePoint, NODE_WIDTH_DEFAULT, NODE_WIDTH_COMPACT, NODE_HEIGHT_DEFAULT, NODE_HEIGHT_COMPACT } from '../../utils/layoutConstants'; // Import new constants
import { getYears } from '../../utils/familyLogic';
import { User, Ribbon, ChevronDown, ChevronUp, ChevronRight, ChevronLeft } from 'lucide-react';
import * as d3 from 'd3';

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
  const isRadial = settings.layoutMode === 'radial'; // New flag for radial

  // Helper function to draw path from collapse point to child with curved corners
  const drawChildBranchPath = useCallback((collapsePointX: number, collapsePointY: number, targetX: number, targetY: number) => {
    const r = LINE_CORNER_RADIUS;

    if (isVertical) {
        const startPointY = collapsePointY + COLLAPSE_CIRCLE_RADIUS; // Start from bottom edge of collapse circle
        const targetPointY = targetY - NODE_HEIGHT / 2; // Connect to top edge of target node
        const targetPointX = targetX;

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
    } else if (!isRadial) { // Horizontal layout (and not radial)
        const startPointX = collapsePointX + COLLAPSE_CIRCLE_RADIUS; // Start from right edge of collapse circle
        const targetNodeX = targetX - NODE_WIDTH / 2; // Connect to left edge of target node
        const targetNodeY = targetY; // The y-coordinate of the target node

        // If child is directly to the right of collapse point, draw a straight horizontal line
        if (Math.abs(collapsePointY - targetNodeY) < 1) {
            return `M ${startPointX} ${collapsePointY} H ${targetNodeX}`;
        }

        // Otherwise, draw a path with curved corners
        const midX = startPointX + (targetNodeX - startPointX) / 2;
        const dirY = targetNodeY > collapsePointY ? 1 : -1;

        return `M ${startPointX} ${collapsePointY}` +
               `H ${midX - r}` + // Horizontal segment before first curve
               `Q ${midX} ${collapsePointY}, ${midX} ${collapsePointY + dirY * r}` + // First curve
               `V ${targetNodeY - dirY * r}` + // Vertical segment
               `Q ${midX} ${targetNodeY}, ${midX + r} ${targetNodeY}` + // Second curve
               `H ${targetNodeX}`; // Horizontal segment to target
    } else { // Radial layout
        // For radial, links are typically drawn as arcs.
        // This is a simplified straight line for now, but ideally would be curved.
        return `M ${collapsePointX} ${collapsePointY} L ${targetX} ${targetY}`;
    }
  }, [isVertical, isRadial, NODE_HEIGHT, NODE_WIDTH]);


  const getLinkPath = useCallback((link: TreeLink) => {
    const source = nodes.find(n => n.id === link.source);
    const target = nodes.find(n => n.id === link.target);
    if (!source || !target) return '';
    
    if (link.type === 'marriage') {
        return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
    }
    
    if (settings.chartType === 'pedigree') {
        const sX = source.x + NODE_WIDTH/2;
        const sY = source.y;
        const tX = target.x - NODE_WIDTH/2;
        const tY = target.y;
        const midX = (sX + tX) / 2;
        return `M ${sX} ${sY} C ${midX} ${sY}, ${midX} ${tY}, ${tX} ${tY}`;
    }

    if (settings.chartType === 'descendant' && link.type === 'parent-child') {
        const childData = target.data as Person;
        let correctJoint = null;
        // Find the correct collapse point for this parent-child relationship
        if (childData.parents.length > 1) {
           const otherParentId = childData.parents.find(id => people[id]?.id !== (source.data as Person).id); 
           if (otherParentId) {
              correctJoint = collapsePoints.find(cp => cp.id === (source.data as Person).id && cp.spouseId === otherParentId);
           }
        }
        // If no specific spouse joint, check for single parent joint
        if (!correctJoint) correctJoint = collapsePoints.find(cp => cp.id === (source.data as Person).id && cp.spouseId === 'single');
        
        if (correctJoint) {
            // Use the new helper to draw the path from the collapse point to the child
            return drawChildBranchPath(correctJoint.x, correctJoint.y, target.x, target.y);
        }
        // Fallback if no collapse point is found (e.g., if the parent has no children in the current view)
        const startBottomX = source.x;
        const startBottomY = source.y + NODE_HEIGHT / 2;
        const targetTopX = target.x;
        const targetTopY = target.y - NODE_HEIGHT / 2;
        return `M ${startBottomX} ${startBottomY} L ${targetTopX} ${targetTopY}`;
    }
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  }, [nodes, settings.chartType, collapsePoints, drawChildBranchPath, NODE_WIDTH, NODE_HEIGHT, people]);

  return (
    <>
      {links.map((link) => {
        const path = getLinkPath(link);
        if (!path) return null;
        const isMarriage = link.type === 'marriage';
        const sId = typeof link.source === 'object' ? (link.source as any).id : link.source;
        const tId = typeof link.target === 'object' ? (link.target as any).id : link.target;
        return (
          <path 
            key={`${sId}-${tId}`} 
            d={path} 
            fill="none" 
            className={`stroke-stone-400 dark:stroke-stone-500 ${isMarriage ? "stroke-stone-300 dark:stroke-600" : ""}`}
            strokeWidth={isMarriage ? 1.5 : 2} 
            strokeDasharray={isMarriage ? "4,4" : "0"}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {collapsePoints.map((cp) => {
        if (settings.chartType !== 'descendant') return null;
        return (
          <React.Fragment key={cp.uniqueKey}>
            {/* Line from parent(s) midpoint to the collapse circle */}
            <path d={`M ${cp.originX} ${cp.originY} L ${cp.x} ${cp.y}`} fill="none" className="stroke-stone-400 dark:stroke-stone-500" strokeWidth={2} strokeLinecap="round" />
            <g transform={`translate(${cp.x}, ${cp.y})`} onClick={(e) => { e.stopPropagation(); toggleCollapse(cp.uniqueKey); }} className="cursor-pointer group">
              <circle r={COLLAPSE_CIRCLE_RADIUS} className="fill-[var(--card-bg)] stroke-[var(--card-border)] stroke-2 shadow-sm transition-all group-hover:scale-110 group-hover:stroke-[var(--focus-ring-color)] group-hover:shadow-md" />
              {cp.isCollapsed ? (
                isVertical ? <ChevronDown x={-8} y={-8} className="w-4 h-4 text-[var(--card-text)] opacity-70 group-hover:text-[var(--focus-ring-color)]" strokeWidth={2} /> : <ChevronRight x={-8} y={-8} className="w-4 h-4 text-[var(--card-text)] opacity-70 group-hover:text-[var(--focus-ring-color)]" strokeWidth={2} />
              ) : (
                isVertical ? <ChevronUp x={-8} y={-8} className="w-4 h-4 text-[var(--card-text)] opacity-70 group-hover:text-[var(--focus-ring-color)]" strokeWidth={2} /> : <ChevronLeft x={-8} y={-8} className="w-4 h-4 text-[var(--card-text)] opacity-70 group-hover:text-[var(--focus-ring-color)]" strokeWidth={2} />
              )}
            </g>
          </React.Fragment>
        );
      })}

      {nodes.map((node) => {
        const isFocus = node.data.id === focusId;
        const years = settings.showDates ? getYears(node.data) : '';
        
        const titlePrefix = node.data.title ? `${node.data.title} ` : '';
        const displayName = `${titlePrefix}${node.data.firstName} ${settings.showLastName ? node.data.lastName : ''}`;
        const hasCollapsedBranch = Array.from(collapsePoints).some((cp) => cp.uniqueKey.startsWith(`${node.data.id}:`) && cp.isCollapsed);
        
        const genderBorderClass = node.data.gender === 'male' ? 'border-[var(--gender-male-border)]' : 'border-[var(--gender-female-border)]';
        const genderTextClass = node.data.gender === 'male' ? 'text-[var(--gender-male-text)]' : 'text-[var(--gender-female-text)]';

        // Dynamic classes based on isCompact
        const cardPadding = settings.isCompact ? 'p-2' : 'p-3';
        const photoSize = settings.isCompact ? 'w-12 h-12' : 'w-16 h-16';
        const userIconSize = settings.isCompact ? 'w-6 h-6' : 'w-8 h-8';
        const nameTextSize = settings.isCompact ? 'text-xs' : 'text-sm';
        const nicknameTextSize = settings.isCompact ? 'text-[9px]' : 'text-[10px]';
        const yearsTextSize = settings.isCompact ? 'text-[9px]' : 'text-[10px]';
        const middleNameTextSize = settings.isCompact ? 'text-[8px]' : 'text-[9px]';
        const ribbonPosition = settings.isCompact ? 'top-2 right-2' : 'top-3 right-3';
        const ribbonSize = settings.isCompact ? 'w-3 h-3' : 'w-3.5 h-3.5';
        const collapsedBranchPosition = settings.isCompact ? '-bottom-1.5 inset-x-6' : '-bottom-2 inset-x-8';


        return (
          <g 
            key={node.id} 
            transform={`translate(${node.x}, ${node.y})`}
            onClick={(e) => { e.stopPropagation(); onSelect(node.data.id); }}
            className="cursor-pointer"
          >
            <foreignObject x={-NODE_WIDTH/2} y={-NODE_HEIGHT/2} width={NODE_WIDTH} height={NODE_HEIGHT}>
              <div className={`h-full w-full flex flex-col items-center rounded-xl overflow-hidden bg-[var(--card-bg)] border-[var(--card-border)] border shadow-card transition-all hover:border-[var(--focus-ring-color)] dark:hover:border-[var(--focus-ring-color)] ${isFocus ? 'focus-ring' : ''}`} style={{ backdropFilter: 'blur(8px)' }}>
                <div className={`flex flex-col items-center justify-center text-center h-full w-full ${cardPadding} gap-1.5 relative`}>
                  {settings.showPhotos && (
                    <div className={`relative ${photoSize} rounded-full flex-shrink-0 p-0.5 border-2 shadow-sm bg-white dark:bg-stone-800 ${genderBorderClass}`}>
                      {node.data.photoUrl ? (
                        <img src={node.data.photoUrl} className={`w-full h-full rounded-full object-cover ${node.data.isDeceased ? 'grayscale' : ''}`} />
                      ) : (
                        <div className="w-full h-full rounded-full bg-stone-50 dark:bg-stone-800 flex items-center justify-center">
                          <User className={`${userIconSize}`} style={{ color: node.data.gender === 'male' ? 'var(--gender-male-border)' : 'var(--gender-female-border)' }} />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 w-full min-h-0 flex flex-col justify-start items-center">
                    <div className={`font-bold ${nameTextSize} leading-tight break-words line-clamp-2 ${genderTextClass}`}>
                      {displayName}
                    </div>
                    {node.data.nickName && (
                      <div className={`${nicknameTextSize} text-stone-500 dark:text-stone-400 italic mt-0.5 opacity-90 truncate w-full`} style={{ color: 'var(--card-text)' }}>
                        "{node.data.nickName}"
                      </div>
                    )}
                    {settings.showDates && (
                      <div className={`${yearsTextSize} text-stone-500 dark:text-stone-400 font-medium mt-1 tracking-wide`} style={{ color: 'var(--card-text)' }}>
                        {years}
                      </div>
                    )}
                    {settings.showMiddleName && node.data.middleName && (
                      <div className={`${middleNameTextSize} text-stone-400 mt-0.5 opacity-80 truncate w-full`} style={{ color: 'var(--card-text)' }}>
                        {node.data.middleName}
                      </div>
                    )}
                  </div>
                  {node.data.isDeceased && (
                    <div className={`absolute ${ribbonPosition} opacity-80`}>
                      <Ribbon className={`${ribbonSize} text-[var(--card-text)] fill-current`} />
                    </div>
                  )}
                </div>
                {hasCollapsedBranch && (
                  <div className={`absolute ${collapsedBranchPosition} h-2 bg-[var(--card-bg)] border-[var(--card-border)] rounded-b-xl -z-10 shadow-sm opacity-90`}></div>
                )}
              </div>
            </foreignObject>
          </g>
        );
      })}
    </>
  );
});