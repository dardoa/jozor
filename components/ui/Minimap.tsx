import React from 'react';
import { TreeNode, TreeLink } from '../../types';

interface MinimapProps {
  nodes: TreeNode[];
  links: TreeLink[];
  focusId: string;
}

export const Minimap: React.FC<MinimapProps> = ({ nodes, links, focusId }) => {
  if (nodes.length === 0) return null;

  const minX = Math.min(...nodes.map(n => n.x));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxX = Math.max(...nodes.map(n => n.x));
  const maxY = Math.max(...nodes.map(n => n.y));

  const viewBoxX = minX - 100;
  const viewBoxY = minY - 100;
  const viewBoxWidth = (maxX - minX) + 200;
  const viewBoxHeight = (maxY - minY) + 200;

  return (
    <div className="absolute bottom-5 left-5 w-[150px] h-[100px] bg-white/80 dark:bg-stone-950/80 border border-stone-200/50 dark:border-stone-700/50 rounded-xl pointer-events-none overflow-hidden z-20 shadow-lg backdrop-blur-sm">
      <svg viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-full opacity-50">
        {nodes.map(n => (
          <circle key={n.id} cx={n.x} cy={n.y} r={20} fill={n.id === focusId ? 'var(--focus-ring-color)' : 'var(--link-line-stroke)'} />
        ))}
        {links.map((l, i) => {
          const s = nodes.find(n => n.id === l.source);
          const t = nodes.find(n => n.id === l.target);
          if (!s || !t) return null;
          return <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="var(--link-line-stroke)" strokeWidth="10" />
        })}
      </svg>
    </div>
  );
};