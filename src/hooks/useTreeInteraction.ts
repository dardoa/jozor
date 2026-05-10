import { useRef, useEffect, useCallback, useState } from 'react';
import { easeCubicInOut, easeCubicOut } from 'd3-ease';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom';
import { extent } from 'd3-array';
import { useAppStore } from '../store/useAppStore';
import { TreeNode } from '../types';

interface UseTreeInteractionProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    gRef: React.RefObject<SVGGElement | null>;
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    focusId: string;
    nodes: TreeNode[];
    fanArcCount: number;
    isFanChart: boolean;
    isForce: boolean;
    searchTarget: { id: string; timestamp: number } | null;
    isAdvancedBarOpen?: boolean;
    viewportResetKey: string;
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
 * useTreeInteraction Hook (V2 - Unified Engine)
 * 
 * The single source of truth for all D3 zoom behavior and camera centering logic.
 * Merges legacy TreeInteractiveControls logic into a unified reactive engine.
 */
export const useTreeInteraction = ({
    svgRef,
    gRef,
    wrapperRef,
    focusId,
    nodes,
    fanArcCount,
    isFanChart,
    isForce,
    searchTarget,
    isAdvancedBarOpen = false,
    viewportResetKey,
}: UseTreeInteractionProps): UseTreeInteractionReturn => {
    const zoomBehavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [zoomX, setZoomX] = useState(0);
    const [zoomY, setZoomY] = useState(0);

    // Sync guard: prevents auto-centering from interrupting user interaction or background saves
    const isSyncing = useAppStore(state => 
        state.syncStatus?.supabaseStatus === 'syncing' || 
        state.syncStatus?.state === 'saving'
    );
    const isUserInteracting = useRef(false);
    const isTransitioning = useRef(false);

    // --- Touch / Pinch-to-zoom state (mobile only) ---
    const touchStartDistanceRef = useRef<number | null>(null);
    const touchStartScaleRef = useRef<number>(1);
    const isPinchingRef = useRef(false);
    const lastAutoFitKeyRef = useRef<string | null>(null);
    const lastFocusId = useRef<string | null>(null);

    // Initialize zoom behavior
    useEffect(() => {
        if (!svgRef.current || !gRef.current || !wrapperRef.current) return;

        const svgElement = svgRef.current;
        const zoomController = zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.05, 10]) // Expanded range for precision
            .on('start', (event) => {
                if (event.sourceEvent) isUserInteracting.current = true;
            })
            .on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
                if (gRef.current) select(gRef.current).attr('transform', event.transform.toString());
                setZoomScale(event.transform.k);
                setZoomX(event.transform.x);
                setZoomY(event.transform.y);
            })
            .on('end', (event) => {
                if (event.sourceEvent) {
                    setTimeout(() => {
                        isUserInteracting.current = false;
                    }, 500);
                }
            });

        select(svgElement).call(zoomController).on("dblclick.zoom", null);
        zoomBehavior.current = zoomController;

        // Lightweight pinch-to-zoom handling on mobile
        const handleTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 2) {
                isPinchingRef.current = true;
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                touchStartDistanceRef.current = Math.hypot(dx, dy);
                touchStartScaleRef.current = zoomScale;
                e.preventDefault();
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (!isPinchingRef.current || !zoomBehavior.current || !touchStartDistanceRef.current) return;
            if (e.touches.length !== 2) return;

            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const currentDistance = Math.hypot(dx, dy);
            if (currentDistance <= 0) return;

            const scaleFactor = currentDistance / touchStartDistanceRef.current;
            const nextScale = touchStartScaleRef.current * scaleFactor;

            select(svgElement)
                .call(
                    zoomBehavior.current.scaleTo,
                    Math.max(0.05, Math.min(10, nextScale))
                );

            e.preventDefault();
        };

        const handleTouchEnd = (e: TouchEvent) => {
            if (e.touches.length < 2) {
                isPinchingRef.current = false;
                touchStartDistanceRef.current = null;
            }
        };

        svgElement.addEventListener('touchstart', handleTouchStart, { passive: false });
        svgElement.addEventListener('touchmove', handleTouchMove, { passive: false });
        svgElement.addEventListener('touchend', handleTouchEnd);
        svgElement.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            svgElement.removeEventListener('touchstart', handleTouchStart);
            svgElement.removeEventListener('touchmove', handleTouchMove);
            svgElement.removeEventListener('touchend', handleTouchEnd);
            svgElement.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [svgRef, gRef, wrapperRef, zoomScale]);

    // Update translateExtent separately when nodes or dimensions change
    useEffect(() => {
        if (!zoomBehavior.current || !wrapperRef.current) return;

        const { width: vWidth, height: vHeight } = wrapperRef.current.getBoundingClientRect() || { width: 1000, height: 1000 };

        if (nodes.length > 0) {
            const xExtent = extent(nodes, n => n.x);
            const yExtent = extent(nodes, n => n.y);

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

    // Unified Center/Fit logic
    const centerOnTarget = useCallback((force = false, fitAll = false) => {
        if (!wrapperRef.current || !svgRef.current || !zoomBehavior.current || nodes.length === 0) return;

        // Block auto-centering if user is interacting or if we are in a background sync update
        if (!force && !fitAll) {
            if (isUserInteracting.current) return;
            if (isSyncing) return;
        }

        // Skip if same target and not forced (prevents jitter)
        if (!force && !fitAll && focusId === lastFocusId.current) return;
        if (isTransitioning.current && !force && !fitAll) return;

        const { width, height } = wrapperRef.current.getBoundingClientRect();
        if (width === 0 || height === 0) return;

        let tX = 0, tY = 0, scale = 1;
        const viewportOffsetY = isAdvancedBarOpen ? -70 : 0;

        if (fitAll) {
            if (isFanChart || isForce) {
                const radius = isFanChart ? 900 : 500;
                scale = Math.min(width / (radius * 2), height / (radius * 2), 0.8) * 0.9;
                tX = width / 2;
                tY = height / 2 + viewportOffsetY;
            } else if (nodes.length > 0) {
                const xExt = extent(nodes, n => n.x);
                const yExt = extent(nodes, n => n.y);
                if (xExt[0] !== undefined && yExt[0] !== undefined) {
                    const treeW = xExt[1]! - xExt[0]! + 240;
                    const treeH = yExt[1]! - yExt[0]! + 240;
                    scale = Math.min((width - 60) / treeW, (height - 60) / treeH, 1.2);
                    scale = Math.max(scale, 0.1);
                    tX = width / 2 - (xExt[0]! + (treeW - 240) / 2) * scale;
                    tY = (height / 2 + viewportOffsetY) - (yExt[0]! + (treeH - 240) / 2) * scale;
                }
            }
        } else if (isFanChart || isForce) {
            tX = width / 2;
            tY = height / 2 + viewportOffsetY;
            scale = isForce ? 0.6 : isFanChart ? 0.8 : 1;
        } else {
            const focusNode = nodes.find(n => n.id === focusId) || nodes[0];
            if (focusNode) {
                scale = 0.85;
                tX = width / 2 - focusNode.x * scale;
                tY = (height / 2 + viewportOffsetY) - focusNode.y * scale;
            }
        }

        if (!fitAll) lastFocusId.current = focusId;
        isTransitioning.current = true;

        const svg = select(svgRef.current);
        svg
            .transition()
            .duration(fitAll ? 600 : 500)
            .ease(easeCubicOut)
            .call(zoomBehavior.current.transform, zoomIdentity.translate(tX, tY).scale(scale))
            .on('end interrupt', () => {
                isTransitioning.current = false;
            });
    }, [focusId, nodes, isFanChart, isForce, svgRef, wrapperRef, isAdvancedBarOpen, isSyncing]);

    // Handle Resize Observer
    useEffect(() => {
        if (!wrapperRef.current) return;
        const observer = new ResizeObserver(() => {
            requestAnimationFrame(() => centerOnTarget());
        });
        observer.observe(wrapperRef.current);
        return () => observer.disconnect();
    }, [centerOnTarget, wrapperRef]);

    // Trigger centering on focus changes
    useEffect(() => {
        if (searchTarget && Date.now() - searchTarget.timestamp < 100) return;
        if (lastAutoFitKeyRef.current === viewportResetKey) return;
        centerOnTarget();
    }, [focusId, centerOnTarget, searchTarget, viewportResetKey]);

    // Fly-to effect for Search
    useEffect(() => {
        if (!searchTarget || !wrapperRef.current || !svgRef.current || !zoomBehavior.current) return;
        const targetNode = nodes.find(n => n.id === searchTarget.id);
        if (!targetNode) return;

        const { width, height } = wrapperRef.current.getBoundingClientRect();
        const viewportOffsetY = isAdvancedBarOpen ? -70 : 0;
        const targetScale = 1.1;
        const tX = width / 2 - targetNode.x * targetScale;
        const tY = (height / 2 + viewportOffsetY) - targetNode.y * targetScale;

        select(svgRef.current)
            .transition().duration(800).ease(easeCubicInOut)
            .call(zoomBehavior.current.transform, zoomIdentity.translate(tX, tY).scale(targetScale));
    }, [searchTarget, nodes, svgRef, wrapperRef, isAdvancedBarOpen]);

    // Auto-fit on first load
    useEffect(() => {
        const hasContent = isFanChart ? fanArcCount > 0 : nodes.length > 0;
        if (!hasContent || lastAutoFitKeyRef.current === viewportResetKey) return;
        centerOnTarget(true, true);
        lastAutoFitKeyRef.current = viewportResetKey;
    }, [fanArcCount, nodes.length, isFanChart, viewportResetKey, centerOnTarget]);

    const handleZoomIn = useCallback(() => {
        if (svgRef.current && zoomBehavior.current) {
            select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, 1.4);
        }
    }, [svgRef]);

    const handleZoomOut = useCallback(() => {
        if (svgRef.current && zoomBehavior.current) {
            select(svgRef.current).transition().duration(300).call(zoomBehavior.current.scaleBy, 0.7);
        }
    }, [svgRef]);

    const handleResetZoom = useCallback(() => centerOnTarget(true, true), [centerOnTarget]);
    const handleFitToScreen = useCallback(() => centerOnTarget(true, true), [centerOnTarget]);

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
