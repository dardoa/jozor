import { memo, RefObject } from 'react';
import { Person, TreeLink, TreeSettings, TreeNode, FanArc } from '../types';
import { DescendantPedigreeChart } from './charts/DescendantPedigreeChart';
import { FanChart } from './charts/FanChart';
import { ForceChart } from './charts/ForceChart';
import { CollapsePoint } from '../utils/treeLayout';

interface TreeCanvasProps {
    nodes: TreeNode[];
    links: TreeLink[];
    fanArcs: FanArc[];
    collapsePoints: CollapsePoint[];
    chartType: 'descendant' | 'pedigree' | 'fan' | 'force';
    settings: TreeSettings;
    focusId: string;
    onSelect: (id: string) => void;
    collapsedIds: Set<string>;
    onToggleCollapse: (id: string) => void;
    people: Record<string, Person>;
    gRef: RefObject<SVGGElement>;
    svgRef: RefObject<SVGSVGElement>;
    highlightedNodeId: string | null;
    onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
    zoomScale: number;
    pulsingNodeId?: string | null;
    isDimmed?: boolean;
    highlightedPath?: Set<string>;
}

/**
 * TreeCanvas - Pure rendering component for the family tree visualization
 * 
 * Responsibilities:
 * - Renders SVG structure with defs and filters
 * - Conditionally renders chart components based on chartType
 * - No interaction logic (zoom/pan handled by parent)
 * - No state management
 */
export const TreeCanvas = memo<TreeCanvasProps>(({
    nodes,
    links,
    fanArcs,
    collapsePoints,
    chartType,
    settings,
    focusId,
    onSelect,
    collapsedIds,
    onToggleCollapse,
    people,
    gRef,
    svgRef,
    highlightedNodeId,
    onNodeContextMenu,
    zoomScale,
    pulsingNodeId,
    isDimmed,
    highlightedPath,
}) => {
    return (
        <svg ref={svgRef} className='w-full h-full block' style={{ pointerEvents: 'all' }}>
            <defs>
                <filter id='shadow'>
                    <feDropShadow dx='0' dy='4' stdDeviation='6' floodColor='#000000' floodOpacity='0.06' />
                </filter>
            </defs>

            {/* Heritage Background Layer */}
            <rect width="100%" height="100%" fill="url(#heritage-parchment)" pointerEvents="none" />

            <g ref={gRef} className='viewport' style={{ willChange: 'transform' } as any}>
                {chartType === 'fan' && (
                    <FanChart
                        fanArcs={fanArcs}
                        focusId={focusId}
                        onSelect={onSelect}
                        settings={settings}
                        onNodeContextMenu={onNodeContextMenu}
                        zoomScale={zoomScale}
                        isDimmed={isDimmed}
                    />
                )}

                {chartType === 'force' && (
                    <ForceChart
                        nodes={nodes}
                        links={links}
                        focusId={focusId}
                        onSelect={onSelect}
                        settings={settings}
                        onNodeContextMenu={onNodeContextMenu}
                        zoomScale={zoomScale}
                        isDimmed={isDimmed}
                    />
                )}

                {(chartType === 'descendant' || chartType === 'pedigree') && (
                    <DescendantPedigreeChart
                        nodes={nodes}
                        links={links}
                        collapsePoints={collapsePoints}
                        focusId={focusId}
                        onSelect={onSelect}
                        settings={settings}
                        toggleCollapse={onToggleCollapse}
                        people={people}
                        highlightedNodeId={highlightedNodeId}
                        onNodeContextMenu={onNodeContextMenu}
                        zoomScale={zoomScale}
                        pulsingNodeId={pulsingNodeId}
                        isDimmed={isDimmed}
                    />
                )}
            </g>
        </svg>
    );
});

TreeCanvas.displayName = 'TreeCanvas';
