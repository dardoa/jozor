import React, { useCallback, memo } from 'react';
import { Person, TreeLink, TreeSettings, TreeNode } from '../../types';
import { CollapsePoint } from '../../utils/treeLayout';
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
  const NODE_WIDTH = settings.isCompact ? 130 : 160;
  const NODE_HEIGHT = settings.isCompact ? 170 : 210;
  const COLLAPSE_CIRCLE_RADIUS = 12; // Radius of the collapse circle
  const isVertical = settings.layoutMode === 'vertical';

  // This function is no longer needed with the new drawing logic
  // const drawChildBranchPath = useCallback((collapsePointX: number, collapsePointY: number, targetX: number, targetY: number) => {
  //   // ... (removed old logic)
  // }, [isVertical, NODE_HEIGHT, NODE_WIDTH]);


  // This function is no longer needed as links are drawn in a consolidated manner
  // const getLinkPath = useCallback((link: TreeLink) => {
  //   // ... (removed old logic)
  // }, [nodes, settings.chartType, collapsePoints, drawChildBranchPath, NODE_WIDTH, NODE_HEIGHT, people]);

  return (
    <>
      {/* 1. Render Marriage Links */}
      {links.filter(l => l.type === 'marriage').map((link) => {
        const source = nodes.find(n => n.id === link.source);
        const target = nodes.find(n => n.id === link.target);
        if (!source || !target) return null;
        return (
          <path
            key={`${source.id}-${target.id}`}
            d={`M ${source.x} ${source.y} L ${target.x} ${target.y}`}
            fill="none"
            className="stroke-stone-300 dark:stroke-stone-600"
            strokeWidth={1.5}
            strokeDasharray="4,4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      })}

      {/* 2. Render Family Unit to Children Branch Lines */}
      {collapsePoints.map((cp) => {
        // Find all children connected to this collapse point
        const childrenConnectedToCP = nodes.filter(n => {
            const person = n.data as Person;
            if (cp.spouseId === 'single') {
                // Children of single parent
                return person.parents.includes(cp.id) && person.parents.length === 1;
            } else {
                // Children of a couple
                return person.parents.includes(cp.id) && person.parents.includes(cp.spouseId);
            }
        });

        // Path: From origin (midpoint of parents) -> down to collapse point Y -> horizontal line spanning children -> vertical lines to each child
        let pathD = `M ${cp.originX} ${cp.originY}`; // Start from parent(s) midpoint

        if (isVertical) {
            // Vertical line from origin to collapse point Y
            pathD += ` V ${cp.y}`;

            if (childrenConnectedToCP.length > 0) {
                const childXs = childrenConnectedToCP.map(c => c.x);
                const minChildX = Math.min(...childXs);
                const maxChildX = Math.max(...childXs);

                // Horizontal line spanning children at collapse point Y
                pathD += ` M ${minChildX} ${cp.y} H ${maxChildX}`;

                // Vertical lines from horizontal line to each child's top edge
                childrenConnectedToCP.forEach(child => {
                    pathD += ` M ${child.x} ${cp.y} V ${child.y - NODE_HEIGHT / 2}`;
                });
            }
        } else { // Horizontal layout
            // Horizontal line from origin to collapse point X
            pathD += ` H ${cp.x}`;

            if (childrenConnectedToCP.length > 0) {
                const childYs = childrenConnectedToCP.map(c => c.y);
                const minChildY = Math.min(...childYs);
                const maxChildY = Math.max(...childYs);

                // Vertical line spanning children at collapse point X
                pathD += ` M ${cp.x} ${minChildY} V ${maxChildY}`;

                // Horizontal lines from vertical line to each child's left edge
                childrenConnectedToCP.forEach(child => {
                    pathD += ` M ${cp.x} ${child.y} H ${child.x - NODE_WIDTH / 2}`;
                });
            }
        }

        return (
            <path
                key={`family-branch-${cp.uniqueKey}`}
                d={pathD}
                fill="none"
                className="stroke-stone-400 dark:stroke-stone-500"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        );
      })}

      {/* 3. Render Collapse Points (Circles and Icons) */}
      {collapsePoints.map((cp) => {
        if (settings.chartType !== 'descendant') return null;
        return (
          <React.Fragment key={cp.uniqueKey}>
            <g transform={`translate(${cp.x}, ${cp.y})`} onClick={(e) => { e.stopPropagation(); toggleCollapse(cp.uniqueKey); }} className="cursor-pointer group">
              <circle r={COLLAPSE_CIRCLE_RADIUS} className="fill-white dark:fill-stone-900 stroke-stone-200 dark:stroke-stone-700 stroke-2 shadow-sm transition-all group-hover:scale-110 group-hover:stroke-teal-400 group-hover:shadow-md" />
              {cp.isCollapsed ? (
                isVertical ? <ChevronDown x={-8} y={-8} className="w-4 h-4 text-stone-500 dark:text-stone-400 group-hover:text-teal-500" strokeWidth={2} /> : <ChevronRight x={-8} y={-8} className="w-4 h-4 text-stone-500 group-hover:text-teal-500" strokeWidth={2} />
              ) : (
                isVertical ? <ChevronUp x={-8} y={-8} className="w-4 h-4 text-stone-400 dark:text-stone-500 group-hover:text-teal-500" strokeWidth={2} /> : <ChevronLeft x={-8} y={-8} className="w-4 h-4 text-stone-500 group-hover:text-teal-500" strokeWidth={2} />
              )}
            </g>
          </React.Fragment>
        );
      })}

      {/* 4. Render Nodes */}
      {nodes.map((node) => {
        const isFocus = node.data.id === focusId;
        const years = settings.showDates ? getYears(node.data) : '';
        
        const titlePrefix = node.data.title ? `${node.data.title} ` : '';
        const displayName = `${titlePrefix}${node.data.firstName} ${settings.showLastName ? node.data.lastName : ''}`;
        const hasCollapsedBranch = Array.from(collapsePoints).some((cp) => cp.uniqueKey.startsWith(`${node.data.id}:`) && cp.isCollapsed);
        
        const genderBorderClass = node.data.gender === 'male' ? 'border-[var(--gender-male-border)]' : 'border-[var(--gender-female-border)]';
        const genderTextClass = node.data.gender === 'male' ? 'text-[var(--gender-male-text)]' : 'text-[var(--gender-female-text)]';

        return (
          <g 
            key={node.id} 
            transform={`translate(${node.x}, ${node.y})`}
            onClick={(e) => { e.stopPropagation(); onSelect(node.data.id); }}
            className="cursor-pointer"
          >
            <foreignObject x={-NODE_WIDTH/2} y={-NODE_HEIGHT/2} width={NODE_WIDTH} height={NODE_HEIGHT}>
              <div className={`uiverse-card ${node.data.gender} ${isFocus ? 'focus-ring' : ''} h-full w-full flex flex-col items-center rounded-xl overflow-hidden bg-[var(--card-bg)] border-[var(--card-border)] border shadow-card transition-all hover:border-[var(--focus-ring-color)] dark:hover:border-[var(--focus-ring-color)]`} style={{ backdropFilter: 'blur(8px)' }}>
                <div className="flex flex-col items-center justify-center text-center h-full w-full p-3 gap-1.5 relative">
                  {settings.showPhotos && (
                    <div className={`relative w-16 h-16 rounded-full flex-shrink-0 p-0.5 border-2 shadow-sm bg-white dark:bg-stone-800 ${genderBorderClass}`}>
                      {node.data.photoUrl ? (
                        <img src={node.data.photoUrl} className={`w-full h-full rounded-full object-cover ${node.data.isDeceased ? 'grayscale' : ''}`} />
                      ) : (
                        <div className="w-full h-full rounded-full bg-stone-50 dark:bg-stone-800 flex items-center justify-center">
                          <User className={`w-8 h-8`} style={{ color: node.data.gender === 'male' ? 'var(--gender-male-border)' : 'var(--gender-female-border)' }} />
                        </div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 w-full min-h-0 flex flex-col justify-start items-center">
                    <div className={`font-bold text-sm leading-tight break-words line-clamp-2 ${genderTextClass}`}>
                      {displayName}
                    </div>
                    {node.data.nickName && (
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 italic mt-0.5 opacity-90 truncate w-full" style={{ color: 'var(--card-text)' }}>
                        "{node.data.nickName}"
                      </div>
                    )}
                    {settings.showDates && (
                      <div className="text-[10px] text-stone-500 dark:text-stone-400 font-medium mt-1 tracking-wide" style={{ color: 'var(--card-text)' }}>
                        {years}
                      </div>
                    )}
                    {settings.showMiddleName && node.data.middleName && (
                      <div className="text-[9px] text-stone-400 mt-0.5 opacity-80 truncate w-full" style={{ color: 'var(--card-text)' }}>
                        {node.data.middleName}
                      </div>
                    )}
                  </div>
                  {node.data.isDeceased && (
                    <div className="absolute top-3 right-3 opacity-80">
                      <Ribbon className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400 fill-current" />
                    </div>
                  )}
                </div>
                {hasCollapsedBranch && (
                  <div className="absolute -bottom-2 inset-x-8 h-2 bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 rounded-b-xl -z-10 shadow-sm opacity-90"></div>
                )}
              </div>
            </foreignObject>
          </g>
        );
      })}
    </>
  );
});