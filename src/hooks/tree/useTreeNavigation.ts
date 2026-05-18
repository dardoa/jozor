import { useState, useCallback, useRef, useEffect } from 'react';
import { easeCubicOut } from 'd3-ease';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoomIdentity, type ZoomBehavior } from 'd3-zoom';
import { TreeNode } from '../../types';

interface TreeNavigationProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    zoomBehavior: React.RefObject<ZoomBehavior<SVGSVGElement, unknown> | null>;
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

        select(svgRef.current)
            .transition()
            .duration(duration)
            .ease(easeCubicOut)
            .call(
                zoomBehavior.current.transform,
                zoomIdentity.translate(tX, tY).scale(scale)
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
