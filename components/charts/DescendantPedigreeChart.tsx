import React, { useCallback, memo } from 'react';
import { Person, TreeLink, TreeSettings, TreeNode } from '../../types';
import { CollapsePoint } from '../../utils/treeLayout'; // Corrected import path
import { getYears } from '../../utils/familyLogic';
import { User, Ribbon, ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Plus, BookOpen, Baby, ArrowUp, Heart, ArrowDown, Camera, Sparkles, Loader2, X, Trash2 } from 'lucide-react';
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
  const CORNER_RADIUS = 20;
  const isVertical = settings.layoutMode === 'vertical';

  const drawRoundedPath = useCallback((startX: number, startY: number, jointX: number, jointY: number, targetX: number, targetY: number) => {
    const splitOffset = 30; 
    const r = CORNER_RADIUS;
    
    if (isVertical) {
        const startBottomY = startY + NODE_HEIGHT / 2; // Start from bottom of source node
        const targetTopY = targetY - NODE_HEIGHT / 2; // Connect to top of target node
        
        if (Math.abs(targetX - jointX) < 1) { // Straight vertical line
            return `M ${startX} ${startBottomY} V ${targetTopY}`;
        }
        const dirX = targetX > jointX ? 1 : -1;
        return `M ${startX} ${startBottomY} V ${jointY + splitOffset - r} Q ${jointX} ${jointY + splitOffset} ${jointX + (r * dirX)} ${jointY + splitOffset} H ${targetX - (r * dirX)} Q ${targetX} ${jointY + splitOffset} ${targetX} ${jointY + splitOffset + r} V ${targetTopY}`;
    } else {
        const startRightX = startX + NODE_WIDTH / 2; // Start from right of source node
        const targetLeftX = targetX - NODE_WIDTH / 2; // Connect to left of target node
        
        if (Math.abs(targetY - jointY) < 1) { // Straight horizontal line
            return `M ${startRightX} ${startY} H ${targetLeftX}`;
        }
        const dirY = targetY > jointY ? 1 : -1;
        return `M ${startRightX} ${startY} H ${jointX + splitOffset - r} Q ${jointX + splitOffset} ${jointY} ${jointX + splitOffset} ${jointY + (r * dirY)} V ${targetY - (r * dirY)} Q ${jointX + splitOffset} ${targetY} ${jointX + splitOffset + r} ${targetY} H ${targetLeftX}`;
    }
  }, [isVertical, NODE_HEIGHT, NODE_WIDTH]);

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
        if (childData.parents.length > 1) {
           const otherParentId = childData.parents.find(id => people[id]?.id !== (source.data as Person).id); 
           if (otherParentId) {
              correctJoint = collapsePoints.find(cp => cp.id === (source.data as Person).id && cp.spouseId === otherParentId);
           }
        }
        if (!correctJoint) correctJoint = collapsePoints.find(cp => cp.id === (source.data as Person).id && cp.spouseId === 'single');
        
        if (correctJoint) {
            const startX = source.x;
            const startY = source.y;
            return drawRoundedPath(startX, startY, correctJoint.x, correctJoint.y, target.x, target.y);
        }
        const startBottomX = source.x;
        const startBottomY = source.y + NODE_HEIGHT / 2;
        const targetTopX = target.x;
        const targetTopY = target.y - NODE_HEIGHT / 2;
        return `M ${startBottomX} ${startBottomY} L ${targetTopX} ${targetTopY}`;
    }
    return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
  }, [nodes, settings.chartType, collapsePoints, drawRoundedPath, NODE_WIDTH, NODE_HEIGHT, people]);

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
            className={`stroke-stone-400 dark:stroke-stone-500 ${isMarriage ? "stroke-stone-300 dark:stroke-stone-600" : ""}`}
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
            <path d={`M ${cp.originX} ${cp.originY} L ${cp.x} ${cp.y}`} fill="none" className="stroke-stone-400 dark:stroke-stone-500" strokeWidth={2} strokeLinecap="round" />
            <g transform={`translate(${cp.x}, ${cp.y})`} onClick={(e) => { e.stopPropagation(); toggleCollapse(cp.uniqueKey); }} className="cursor-pointer group">
              <circle r="12" className="fill-white dark:fill-stone-900 stroke-stone-200 dark:stroke-stone-700 stroke-2 shadow-sm transition-all group-hover:scale-110 group-hover:stroke-teal-400 group-hover:shadow-md" />
              {cp.isCollapsed ? (
                isVertical ? <ChevronDown x={-8} y={-8} className="w-4 h-4 text-stone-500 dark:text-stone-400 group-hover:text-teal-500" strokeWidth={2} /> : <ChevronRight x={-8} y={-8} className="w-4 h-4 text-stone-500 group-hover:text-teal-500" strokeWidth={2} />
              ) : (
                isVertical ? <ChevronUp x={-8} y={-8} className="w-4 h-4 text-stone-400 dark:text-stone-500 group-hover:text-teal-500" strokeWidth={2} /> : <ChevronLeft x={-8} y={-8} className="w-4 h-4 text-stone-500 group-hover:text-teal-500" strokeWidth={2} />
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
                        <div className="w-full h-full rounded-full bg-stone-50 dark:bg-stone-800">
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