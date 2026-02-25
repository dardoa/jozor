import { useState, useCallback, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import { TreeNode } from '../types';

interface TreeNavigationProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    zoomBehavior: React.RefObject<d3.ZoomBehavior<SVGSVGElement, unknown> | null>;
    nodes: TreeNode[];
    wrapperRef: React.RefObject<HTMLDivElement | null>;
}

export const useTreeNavigation = ({
    svgRef,
    zoomBehavior,
    nodes,
    wrapperRef
}: TreeNavigationProps) => {
    const [pulsingNodeId, setPulsingNodeId] = useState<string | null>(null);
    const [isDimmed, setIsDimmed] = useState(false);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const navigateToNode = useCallback((nodeId: string, duration = 800) => {
        if (!svgRef.current || !zoomBehavior.current || !wrapperRef.current) return;

        const targetNode = nodes.find(n => n.id === nodeId);
        if (!targetNode) return;

        const { width, height } = wrapperRef.current.getBoundingClientRect();
        const scale = 1.2; // Zoom in on search result
        const tX = width / 2 - targetNode.x * scale;
        const tY = height / 2 - targetNode.y * scale;

        // Dim the tree during transition
        setIsDimmed(true);

        d3.select(svgRef.current)
            .transition()
            .duration(duration)
            .ease(d3.easeCubicOut)
            .call(
                zoomBehavior.current.transform,
                d3.zoomIdentity.translate(tX, tY).scale(scale)
            )
            .on('end', () => {
                // Trigger pulse effect
                setPulsingNodeId(nodeId);
                setIsDimmed(false);

                // Clear pulse after animation
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => {
                    setPulsingNodeId(null);
                }, 2000);
            });
    }, [nodes, svgRef, zoomBehavior, wrapperRef]);

    // Cleanup
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return {
        navigateToNode,
        pulsingNodeId,
        isDimmed,
        setPulsingNodeId
    };
};
