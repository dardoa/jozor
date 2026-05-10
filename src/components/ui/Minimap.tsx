import React from 'react';
import type { MinimapGraph } from '../../domain/minimapGraph';

interface MinimapProps {
  graph: MinimapGraph;
}

export const Minimap: React.FC<MinimapProps> = ({ graph }) => {
  const { nodes, links, focusPersonId } = graph;

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
    <div data-testid="minimap-container" className='absolute bottom-5 start-5 w-[150px] h-[100px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl pointer-events-none overflow-hidden z-20 shadow-sm'>
      <svg data-testid="minimap-svg" viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`} className="w-full h-full opacity-50">
        {nodes.map(n => (
          <circle data-minimap-node={n.personId} key={n.id} cx={n.x} cy={n.y} r={20} fill={n.isFocus || n.personId === focusPersonId ? 'var(--focus-ring-color)' : 'var(--link-line-stroke)'} />
        ))}
        {links.map((l, i) => {
          const s = nodes.find(n => n.id === l.sourceNodeId);
          const t = nodes.find(n => n.id === l.targetNodeId);
          if (!s || !t) return null;
          return <line data-minimap-link={l.id} key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y} stroke="var(--link-line-stroke)" strokeWidth="10" />
        })}
      </svg>
    </div>
  );
};
