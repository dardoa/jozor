import { memo } from 'react';
import { TreeLink, TreeSettings, TreeNode, Person } from '../../types';
import './ChartStyles.css';
// import { User } from 'lucide-react'; // Removed User as it's not directly used in JSX
import { FORCE_NODE_RADIUS, FORCE_NODE_RADIUS_COMPACT } from '../../utils/treeLayout'; // Import FORCE_NODE_RADIUS
import { useAppStore } from '../../store/useAppStore';

interface ForceChartProps {
  nodes: TreeNode[];
  links: TreeLink[];
  people: Record<string, Person>;
  focusId: string;
  onSelect: (id: string) => void;
  settings: TreeSettings;
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
  zoomScale: number;
  isDimmed?: boolean;
}
export const ForceChart = memo<ForceChartProps>(({ nodes, links, people, focusId, onSelect, onNodeContextMenu, zoomScale, isDimmed, settings }) => {
  // Removed focusId, settings from destructuring
  const nodeRadius = settings.isCompact ? FORCE_NODE_RADIUS_COMPACT : FORCE_NODE_RADIUS; // Use the centralized constant

  return (
    <g>
      {/* Render links FIRST (behind nodes) */}
      {links.map((link, i) => {
        const source = link.source as TreeNode;
        const target = link.target as TreeNode;

        // Only render if both source and target have valid positions
        if (source.x == null || source.y == null || target.x == null || target.y == null) return null;

        return (
          <g key={i}>
            {/* Enhanced curved link with better visibility */}
            <defs>
              <marker
                id={`arrowhead-${i}`}
                markerWidth="10"
                markerHeight="10"
                refX="8"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path
                  d="M0,0 L0,6 L9,3 z"
                  fill={link.type === 'marriage' ? '#f59e0b' : '#64748b'}
                />
              </marker>
            </defs>
            
            {/* Main curved path */}
            <path
              d={link.type === 'marriage' 
                ? `M ${source.x} ${source.y} Q ${(source.x + target.x) / 2} ${source.y - 30} ${target.x} ${target.y}`
                : `M ${source.x} ${source.y} Q ${(source.x + target.x) / 2} ${(source.y + target.y) / 2} ${target.x} ${target.y}`
              }
              className='force-link'
              stroke={
                link.type === 'marriage' 
                  ? 'var(--marriage-link-stroke, #f59e0b)'
                  : 'var(--parent-link-stroke, #64748b)'
              }
              strokeWidth={link.type === 'marriage' ? '3' : '2.5'}
              fill='none'
              strokeDasharray={link.type === 'marriage' ? '8,4' : 'none'}
              opacity='0.9'
              strokeLinecap='round'
              strokeLinejoin='round'
              markerEnd={link.type !== 'marriage' ? `url(#arrowhead-${i})` : ''}
            />
            
            {/* Subtle shadow/glow for depth */}
            <path
              d={link.type === 'marriage' 
                ? `M ${source.x} ${source.y} Q ${(source.x + target.x) / 2} ${source.y - 30} ${target.x} ${target.y}`
                : `M ${source.x} ${source.y} Q ${(source.x + target.x) / 2} ${(source.y + target.y) / 2} ${target.x} ${target.y}`
              }
              className='force-link-glow'
              stroke={
                link.type === 'marriage' 
                  ? 'var(--marriage-link-glow, #fbbf24)'
                  : 'var(--parent-link-glow, #94a3b8)'
              }
              strokeWidth={link.type === 'marriage' ? '5' : '4'}
              fill='none'
              opacity='0.2'
              strokeLinecap='round'
              strokeLinejoin='round'
            />
          </g>
        );
      })}

      {/* Render nodes SECOND (in front of links) */}
      {nodes.map((node) => (
        <g
          key={node.id}
          className={`force-node cursor-pointer transition-all duration-300 ${isDimmed ? 'opacity-40 grayscale-[20%]' : 'opacity-100'}`}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(node.id);
          }}
          onContextMenu={(e) => onNodeContextMenu(e, node.id)}
        >
          {(() => {
            const person = people[node.id] || node.data;
            const initials = [person.firstName?.[0], person.lastName?.[0]].filter(Boolean).join('').toUpperCase();

            return (
              <>
                <circle
                  r={nodeRadius}
                  fill={person.photoUrl ? 'var(--card-bg)' : (person.gender === 'male' ? 'url(#monogramMaleGrad)' : 'url(#monogramFemaleGrad)')}
                  stroke={
                    node.id === focusId ? 'var(--primary-600)' : (person.gender === 'male'
                      ? 'var(--gender-male-border)'
                      : 'var(--gender-female-border)')
                  }
                  strokeWidth={node.id === focusId ? '4' : '2'}
                  className='transition-all duration-300'
                />

                {person.photoUrl ? (
                  <image
                    href={person.photoUrl}
                    aria-label={`${person.firstName}'s photo`}
                    x={-nodeRadius}
                    y={-nodeRadius}
                    height={nodeRadius * 2}
                    width={nodeRadius * 2}
                    clipPath={`circle(${nodeRadius}px at ${nodeRadius}px ${nodeRadius}px)`}
                    className={`${person.isDeceased ? 'grayscale' : ''} transition-transform duration-500 hover:scale-110`}
                  />
                ) : (
                  <text
                    dy={nodeRadius / 4}
                    textAnchor='middle'
                    className='font-black text-white mix-blend-overlay opacity-60'
                    style={
                      {
                        fontSize: `${nodeRadius * 0.9}px`,
                        pointerEvents: 'none'
                      } as React.CSSProperties
                    }
                  >
                    {initials}
                  </text>
                )}
                {zoomScale > 0.6 && (
                  <text
                    dy={nodeRadius + 15} // Position below the circle
                    textAnchor='middle'
                    className='font-bold force-chart-label'
                    style={
                      {
                        '--force-label-size': `${nodeRadius * 0.4}px`,
                      } as React.CSSProperties
                    }
                  >
                    {person.firstName}
                  </text>
                )}
              </>
            );
          })()}
        </g>
      ))}
    </g>
  );
});
