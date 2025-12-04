import React, { memo } from 'react';
import { Person, TreeLink, TreeSettings, TreeNode } from '../../types';
import { User } from 'lucide-react';
import { FORCE_NODE_RADIUS } from '../../utils/treeLayout'; // Import FORCE_NODE_RADIUS

interface ForceChartProps {
  nodes: TreeNode[];
  links: TreeLink[];
  focusId: string;
  onSelect: (id: string) => void;
  settings: TreeSettings;
}

export const ForceChart: React.FC<ForceChartProps> = memo(({ nodes, links, focusId, onSelect, settings }) => {
  const nodeRadius = FORCE_NODE_RADIUS; // Use the centralized constant

  return (
    <g>
      {links.map((link, i) => (
        <path key={i} className="force-link stroke-[var(--link-line-stroke)]" strokeWidth="2" fill="none" />
      ))}
      {nodes.map((node) => (
        <g key={node.id} className="force-node cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelect(node.data.id); }}>
          <circle 
            r={nodeRadius} 
            fill={node.data.gender === 'male' ? 'var(--brand-100)' : 'var(--pink-100)'} 
            stroke={node.data.gender === 'male' ? 'var(--gender-male-border)' : 'var(--gender-female-border)'} 
            strokeWidth="2" 
          />
          {node.data.photoUrl ? (
            <image 
              href={node.data.photoUrl} 
              x={-nodeRadius} 
              y={-nodeRadius} 
              height={nodeRadius * 2} 
              width={nodeRadius * 2} 
              clipPath={`circle(${nodeRadius}px at ${nodeRadius}px ${nodeRadius}px)`} 
            />
          ) : (
            <text 
              dy={nodeRadius / 6} // Adjust vertical position to center
              textAnchor="middle" 
              className="text-[var(--card-text)] font-bold" // Use card text color
              style={{ fontSize: `${nodeRadius * 0.8}px` }} // Dynamic font size
            >
              {node.data.firstName[0]}
            </text>
          )}
          <text 
            dy={nodeRadius + 15} // Position below the circle
            textAnchor="middle" 
            className="text-[var(--card-text)] font-bold" // Use card text color
            style={{ fontSize: `${nodeRadius * 0.4}px` }} // Dynamic font size
          >
            {node.data.firstName}
          </text>
        </g>
      ))}
    </g>
  );
});