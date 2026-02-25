import { useRef, useEffect, useCallback, useState } from 'react';
import * as d3 from 'd3';
import { TreeNode } from '../types';

interface UseTreeInteractionProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    gRef: React.RefObject<SVGGElement | null>;
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    focusId: string;
    nodes: TreeNode[];
    isFanChart: boolean;
    isForce: boolean;
    searchTarget: { id: string; timestamp: number } | null;
    isAdvancedBarOpen?: boolean;
}

interface UseTreeInteractionReturn {
    handleZoomIn: () => void;
    handleZoomOut: () => void;
    handleResetZoom: () => void;
    handleFitToScreen: () => void;
    zoomScale: number;
    zoomX: number;
    zoomY: number;
}

/**
 * useTreeInteraction Hook
 * 
 * Extracts all D3 zoom behavior and camera centering logic from FamilyTree.tsx.
 * This hook manages viewport transformations and ensures smooth transitions.
 * 
 * Key features:
 * - Initializes D3 zoom behavior with scale limits [0.1, 4]
 * - Auto-centers on focus node changes
 * - Provides zoom in/out/reset controls
 * - Maintains the same efficiency as the original implementation
 */
export const useTreeInteraction = ({
    svgRef,
    gRef,
    wrapperRef,
    focusId,
    nodes,
    isFanChart,
    isForce,
    searchTarget,
    isAdvancedBarOpen = false,
}: UseTreeInteractionProps): UseTreeInteractionReturn => {
    const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [zoomX, setZoomX] = useState(0);
    const [zoomY, setZoomY] = useState(0);

    // Initialize zoom behavior
    useEffect(() => {
        if (!svgRef.current || !gRef.current) return;

        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 4])
            .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                if (gRef.current) d3.select(gRef.current).attr('transform', event.transform.toString());
                setZoomScale(event.transform.k);
                setZoomX(event.transform.x);
                setZoomY(event.transform.y);
            });

        d3.select(svgRef.current).call(zoom).on("dblclick.zoom", null);
        zoomBehavior.current = zoom;
    }, [svgRef, gRef]);

    // Auto-center on focus changes (Normal navigation)
    useEffect(() => {
        // Skip if searchTarget was just set (let the more dramatic Fly-to effect handle it)
        if (searchTarget && Date.now() - searchTarget.timestamp < 100) return;

        if (wrapperRef.current && svgRef.current && zoomBehavior.current) {
            const { width, height } = wrapperRef.current.getBoundingClientRect();
            let tX = 0, tY = 0, scale = 1;

            // Viewport Shift Logic: offset center Y if advanced bar is open
            const viewportOffsetY = isAdvancedBarOpen ? -70 : 0;

            if (isFanChart || isForce) {
                tX = width / 2;
                tY = height / 2 + viewportOffsetY;
                scale = isForce ? 0.6 : isFanChart ? 0.8 : 1;
            } else if (nodes.length > 0) {
                const focusNode = nodes.find(n => n.id === focusId);
                if (focusNode) {
                    scale = 0.85;
                    tX = width / 2 - focusNode.x * scale;
                    tY = (height / 2 + viewportOffsetY) - focusNode.y * scale;
                }
            }

            if (tX !== 0 || tY !== 0) {
                const svg = d3.select(svgRef.current);
                svg.transition()
                    .duration(500)
                    .ease(d3.easeCubicOut)
                    .call(zoomBehavior.current.transform, d3.zoomIdentity.translate(tX, tY).scale(scale));
            }
        }
    }, [focusId, nodes, isFanChart, isForce, svgRef, wrapperRef, isAdvancedBarOpen]);

    useEffect(() => {
        if (!searchTarget || !wrapperRef.current || !svgRef.current || !zoomBehavior.current) return;

        const targetNode = nodes.find(n => n.id === searchTarget.id);
        if (!targetNode) return;

        const { width, height } = wrapperRef.current.getBoundingClientRect();
        const viewportOffsetY = isAdvancedBarOpen ? -70 : 0;
        const targetScale = 1.1; // Slightly closer for emphasis
        const tX = width / 2 - targetNode.x * targetScale;
        const tY = (height / 2 + viewportOffsetY) - targetNode.y * targetScale;

        d3.select(svgRef.current)
            .transition()
            .duration(800)
            .ease(d3.easeCubicInOut)
            .call(zoomBehavior.current.transform, d3.zoomIdentity.translate(tX, tY).scale(targetScale));

    }, [searchTarget, nodes, svgRef, wrapperRef, isAdvancedBarOpen]);

    const handleZoomIn = useCallback(() => {
        if (svgRef.current && zoomBehavior.current) {
            d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, 1.2);
        }
    }, [svgRef]);

    const handleZoomOut = useCallback(() => {
        if (svgRef.current && zoomBehavior.current) {
            d3.select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, 0.8);
        }
    }, [svgRef]);

    const handleResetZoom = useCallback(() => {
        if (zoomBehavior.current && wrapperRef.current && svgRef.current) {
            const { width, height } = wrapperRef.current.getBoundingClientRect();
            const viewportOffsetY = isAdvancedBarOpen ? -70 : 0;
            const transform = (isFanChart || isForce)
                ? d3.zoomIdentity.translate(width / 2, height / 2 + viewportOffsetY).scale(isForce ? 0.6 : 0.8)
                : d3.zoomIdentity.translate(width / 2 - (nodes[0]?.x || 0), (height / 2 + viewportOffsetY) - (nodes[0]?.y || 0)).scale(0.85);

            d3.select(svgRef.current).transition().duration(500).call(zoomBehavior.current.transform, transform);
        }
    }, [isFanChart, isForce, nodes, svgRef, wrapperRef, isAdvancedBarOpen]);

    const handleFitToScreen = useCallback(() => {
        if (!zoomBehavior.current || !wrapperRef.current || !svgRef.current || nodes.length === 0) return;
        const { width, height } = wrapperRef.current.getBoundingClientRect();

        if (isFanChart || isForce) {
            const transform = d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(isForce ? 0.6 : 0.8);
            d3.select(svgRef.current).transition().duration(600).call(zoomBehavior.current.transform, transform);
            return;
        }

        // Compute bounding box of all nodes and fit them into the viewport
        const xs = nodes.map(n => n.x);
        const ys = nodes.map(n => n.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const treeW = maxX - minX + 240; // +240 for card width
        const treeH = maxY - minY + 240; // +240 for card height

        const scaleX = width / treeW;
        const scaleY = height / treeH;
        const scale = Math.min(scaleX, scaleY, 1.0); // Never zoom in beyond 100%
        const clampedScale = Math.max(scale, 0.15);  // Never too small

        const viewportOffsetY = isAdvancedBarOpen ? -70 : 0;
        const tX = width / 2 - ((minX + maxX) / 2) * clampedScale;
        const tY = (height / 2 + viewportOffsetY) - ((minY + maxY) / 2) * clampedScale;

        d3.select(svgRef.current)
            .transition().duration(600).ease(d3.easeCubicOut)
            .call(zoomBehavior.current.transform, d3.zoomIdentity.translate(tX, tY).scale(clampedScale));
    }, [isFanChart, isForce, nodes, svgRef, wrapperRef, isAdvancedBarOpen]);

    useEffect(() => {
        const handleResetEvent = () => handleFitToScreen();
        window.addEventListener('reset-interactive-view', handleResetEvent);
        return () => window.removeEventListener('reset-interactive-view', handleResetEvent);
    }, [handleFitToScreen]);

    return {
        handleZoomIn,
        handleZoomOut,
        handleResetZoom,
        handleFitToScreen,
        zoomScale,
        zoomX,
        zoomY,
    };
};
