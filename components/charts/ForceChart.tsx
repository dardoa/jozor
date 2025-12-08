import React, { memo } from 'react';
import { TreeLink, TreeSettings, TreeNode } from '../../types';
// import { User } from 'lucide-react'; // Removed User as it's not directly used in JSX
import { FORCE_NODE_RADIUS } from '../../utils/treeLayout'; // Import FORCE_NODE_RADIUS

interface ForceChartProps {
  nodes: TreeNode[];
  links: TreeLink[];
  focusId: string;
  onSelect: (id: string) => void;
  settings: TreeSettings;
}

export const ForceChart: React.FC<ForceChartProps> = memo(({ nodes, links, onSelect }) => { // Removed focusId, settings from destructuring
  const nodeRadius = FORCE_NODE_RADIUS; // Use the centralized constant

  return (
    <g>
      {links.map((_link, i) => ( // Changed 'link' to '_link' to indicate it's unused in JSX
        <path key={i} className="force-link stroke-[var(--link-line-stroke)]" strokeWidth="2" fill="none" />
      ))}
      {nodes.map((node) => (
        <g key={node.id} className="force-node cursor-pointer" onClick={(e) => { e.stopPropagation(); onSelect(node.data.id); }}>
          <circle 
            r={nodeRadius} 
            fill={node.data.gender === 'male' ? 'var(--gender-male-bg)' : 'var(--gender-female-bg)'} 
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
              className={node.data.isDeceased ? 'grayscale' : ''}
            />
          ) : (
            <text 
              dy={nodeRadius / 6} // Adjust vertical position to center
              textAnchor="middle" 
              className="font-bold" // Use card text color
              style={{ 
                fontSize: `${nodeRadius * 0.8}px`,
                fill: node.data.gender === 'male' ? 'var(--gender-male-text)' : 'var(--gender-female-text)'
              }} 
            >
              {node.data.firstName[0]}
            </text>
          )}
          <text 
            dy={nodeRadius + 15} // Position below the circle
            textAnchor="middle" 
            className="font-bold" // Use card text color
            style={{ 
                fontSize: `${nodeRadius * 0.4}px`,
                fill: 'var(--card-text)'
            }} 
          >
            {node.data.firstName}
          </text>
        </g>
      ))}
    </g>
  );
});