import { useEffect, useCallback, useRef, RefObject, useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import * as d3 from 'd3';
import { TreeNode } from '../types';

interface TreeInteractiveControlsProps {
    svgRef: RefObject<SVGSVGElement>;
    gRef: RefObject<SVGGElement>;
    wrapperRef: RefObject<HTMLDivElement>;
    focusId: string;
    nodes: TreeNode[];
    isFanChart: boolean;
    isForce: boolean;
    highlightedNodeId: string | null;
}

interface ZoomHandlers {
    handleZoomIn: () => void;
    handleZoomOut: () => void;
    handleResetZoom: () => void;
    zoomScale: number;
    zoomBehavior: RefObject<d3.ZoomBehavior<SVGSVGElement, unknown> | null>;
}

/**
 * TreeInteractiveControls - Manages zoom and pan interactions for the tree visualization
 * 
 * Responsibilities:
 * - Sets up D3 zoom behavior
 * - Handles zoom in/out/reset
 * - Centers view on focus node
 * - Returns zoom control handlers for parent component
 */
export const useTreeInteractiveControls = ({
    svgRef,
    gRef,
    wrapperRef,
    focusId,
    nodes,
    isFanChart,
    isForce,
    highlightedNodeId,
}: TreeInteractiveControlsProps): ZoomHandlers => {
    const zoomBehavior = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const lastFocusId = useRef<string | null>(null);
    const isTransitioning = useRef(false);
    const isUserInteracting = useRef(false);

    const isSyncing = useAppStore(state => state.syncStatus.supabaseStatus === 'syncing' || state.syncStatus.state === 'saving');

    const isAttached = useRef(false);

    // Initialize zoom behavior
    useEffect(() => {
        if (!svgRef.current || !gRef.current || isAttached.current) return;

        const zoom = d3
            .zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.05, 10])
            .on('start', (event) => {
                if (event.sourceEvent) isUserInteracting.current = true;
            })
            .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
                if (gRef.current) {
                    d3.select(gRef.current).attr('transform', event.transform.toString());
                    setZoomScale(event.transform.k);
                }
            })
            .on('end', (event) => {
                if (event.sourceEvent) {
                    setTimeout(() => {
                        isUserInteracting.current = false;
                    }, 1000);
                }
            });

        d3.select(svgRef.current).call(zoom).on('dblclick.zoom', null);
        zoomBehavior.current = zoom;
        isAttached.current = true;
    }, [svgRef, gRef, nodes]); // Include nodes to retry attachment if it missed first mount

    // Update translateExtent separately when nodes or dimensions change
    useEffect(() => {
        if (!zoomBehavior.current || !wrapperRef.current) return;

        const { width: vWidth, height: vHeight } = wrapperRef.current.getBoundingClientRect() || { width: 1000, height: 1000 };

        if (nodes.length > 0) {
            const xExtent = d3.extent(nodes, n => n.x);
            const yExtent = d3.extent(nodes, n => n.y);

            if (xExtent[0] !== undefined && yExtent[0] !== undefined) {
                zoomBehavior.current.translateExtent([
                    [xExtent[0]! - vWidth, yExtent[0]! - vHeight],
                    [xExtent[1]! + vWidth, yExtent[1]! + vHeight]
                ]);
            }
        } else {
            zoomBehavior.current.translateExtent([[-vWidth * 2, -vHeight * 2], [vWidth * 3, vHeight * 3]]);
        }
    }, [nodes, wrapperRef]);

    const nodesRef = useRef(nodes);
    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    // Center on target node or "Zoom to Fit"
    const centerOnTarget = useCallback((force = false, fitAll = false) => {
        if (!wrapperRef.current || !svgRef.current || !zoomBehavior.current || nodesRef.current.length === 0) return;

        // CRITICAL FIX: Block auto-centering if user is interacting or if we are in a background sync update
        if (!force && !fitAll) {
            if (isUserInteracting.current) return;
            if (isSyncing) return;
        }

        const targetId = highlightedNodeId || focusId;

        // Skip if same target and not forced (prevents jitter)
        if (!force && !fitAll && targetId === lastFocusId.current) return;
        if (isTransitioning.current && !force && !fitAll) return;

        const { width, height } = wrapperRef.current.getBoundingClientRect();
        if (width === 0 || height === 0) return;

        let tX = 0;
        let tY = 0;
        let scale = 1;

        if (fitAll) {
            // "Zoom to Fit" Logic: Calculate bounding box of all nodes OR assume radius for circular charts
            if (nodesRef.current.length > 0) {
                const xExtent = d3.extent(nodesRef.current, n => n.x);
                const yExtent = d3.extent(nodesRef.current, n => n.y);

                if (xExtent[0] !== undefined && yExtent[0] !== undefined) {
                    const treeWidth = xExtent[1]! - xExtent[0]!;
                    const treeHeight = yExtent[1]! - yExtent[0]!;
                    const padding = 60; // Extra breathing room

                    scale = Math.min(
                        (width - padding * 2) / Math.max(treeWidth, 1),
                        (height - padding * 2) / Math.max(treeHeight, 1),
                        1.2 // Max starting scale to avoid over-zooming tiny trees
                    );

                    // Ensure a minimum usable scale
                    scale = Math.max(scale, 0.1);

                    tX = width / 2 - (xExtent[0]! + treeWidth / 2) * scale;
                    tY = height / 2 - (yExtent[0]! + treeHeight / 2) * scale;
                }
            } else if (isFanChart || isForce) {
                // Circular layouts centered at 0,0
                const radius = isFanChart ? 900 : 500;
                const size = radius * 2;
                scale = Math.min(width / size, height / size, 0.8) * 0.9;
                tX = width / 2;
                tY = height / 2;
            }
        } else if (isFanChart || isForce) {
            tX = width / 2;
            tY = height / 2;
            scale = isForce ? 0.6 : isFanChart ? 0.8 : 1;
        } else {
            const targetNode = nodesRef.current.find((n) => n.id === targetId) || nodesRef.current[0];

            if (targetNode) {
                scale = highlightedNodeId ? 1.2 : 0.85;
                tX = width / 2 - targetNode.x * scale;
                tY = height / 2 - targetNode.y * scale;
            }
        }

        if (!fitAll) lastFocusId.current = targetId;
        isTransitioning.current = true;

        const svg = d3.select(svgRef.current);
        svg
            .transition()
            .duration(800) // Slightly slower for more "stately" feel
            .ease(d3.easeQuadInOut) // Smoother acceleration/deceleration
            .call(zoomBehavior.current.transform, d3.zoomIdentity.translate(tX, tY).scale(scale))
            .on('end interrupt', () => {
                isTransitioning.current = false;
            });
    }, [focusId, isFanChart, isForce, wrapperRef, svgRef, highlightedNodeId, isSyncing]);

    // Trigger centering on focus/highlight changes
    useEffect(() => {
        centerOnTarget();
    }, [focusId, highlightedNodeId, isFanChart, isForce, centerOnTarget]);

    // Handle Resize (ONLY if dimensions actually changed significantly)
    // Removed 'force' to respect interaction guards
    useEffect(() => {
        if (!wrapperRef.current) return;
        const observer = new ResizeObserver(() => {
            // Use a slight delay to ensure layout has settled
            requestAnimationFrame(() => centerOnTarget());
        });
        observer.observe(wrapperRef.current);
        return () => observer.disconnect();
    }, [centerOnTarget, wrapperRef]);

    // Zoom handlers with improved smoothness
    const handleZoomIn = useCallback(() => {
        if (svgRef.current && zoomBehavior.current) {
            d3.select(svgRef.current)
                .transition()
                .duration(400)
                .ease(d3.easeQuadOut)
                .call(zoomBehavior.current.scaleBy, 1.4); // Faster zoom per click
        }
    }, [svgRef]);

    const handleZoomOut = useCallback(() => {
        if (svgRef.current && zoomBehavior.current) {
            d3.select(svgRef.current)
                .transition()
                .duration(400)
                .ease(d3.easeQuadOut)
                .call(zoomBehavior.current.scaleBy, 0.7);
        }
    }, [svgRef]);

    const handleResetZoom = useCallback(() => {
        centerOnTarget(true, true); // Force AND fitAll
    }, [centerOnTarget]);

    return {
        handleZoomIn,
        handleZoomOut,
        handleResetZoom,
        zoomScale,
        zoomBehavior,
    };
};
