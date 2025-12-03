import React, { memo } from 'react';
import { Person, TreeLink, TreeSettings, TreeNode } from '../../types';
import { User } from 'lucide-react';

interface ForceChartProps {
  nodes: TreeNode[];
  links: TreeLink[];
  focusId: string;
  onSelect: (id: string) => void;
  settings: TreeSettings;
}

export const ForceChart: React.FC<ForceChartProps> = memo(({ nodes, links, focusId, onSelect, settings }) => {
  return (
    <g>
      {links.map((link, i) => (
        <path key={i} className="force-link stroke-[var(--link-line-stroke)]" strokeWidth="2" fill="none" />
      ))}
      {nodes.map((node) => (
        <g key={node.id} className="force-node cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelect(node.data.id); }}>
          <circle r={30} fill={node.data.gender === 'male' ? 'var(--brand-100)' : 'var(--pink-100)'} stroke="var(--card-border)" strokeWidth="2" />
          {node.data.photoUrl ? (
            <image href={node.data.photoUrl} x="-30" y="-30" height="60" width="60" clipPath="circle(30px at 30px 30px)" />
          ) : (
            <text dy="5" textAnchor="middle" className="text-[var(--card-text)] text-xl">{node.data.firstName[0]}</text>
          )}
          <text dy="45" textAnchor="middle" className="text-xs font-bold text-[var(--card-text)] pointer-events-none">{node.data.firstName}</text>
        </g>
      ))}
    </g>
  );
});