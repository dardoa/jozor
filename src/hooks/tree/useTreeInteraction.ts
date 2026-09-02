import { useRef, useEffect, useCallback, useState } from 'react';
import { easeCubicInOut, easeCubicOut } from 'd3-ease';
import { select } from 'd3-selection';
import 'd3-transition';
import { zoom, zoomIdentity, type D3ZoomEvent, type ZoomBehavior } from 'd3-zoom';
import { selectIsTreeSyncing, useAppStore } from '../../store/useAppStore';
import type { FanArc, TreeNode } from '../../types';
import { useThrottledCallback } from '../ui/useDebounce';
import {
    calculateTreeViewportTransform,
    getTreeContentBounds,
    type TreeViewportMode,
} from './treeViewportTransform';

interface UseTreeInteractionProps {
    svgRef: React.RefObject<SVGSVGElement | null>;
    gRef: React.RefObject<SVGGElement | null>;
    wrapperRef: React.RefObject<HTMLDivElement | null>;
    focusId: string;
    nodes: TreeNode[];
    fanArcs: FanArc[];
    isFanChart: boolean;
    isForce: boolean;
    nodeWidth: number;
    nodeHeight: number;
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
 * Centralizes tree viewport interaction logic into a unified reactive engine.
 */
export const useTreeInteraction = ({
    svgRef,
    gRef,
    wrapperRef,
    focusId,
    nodes,
    fanArcs,
    isFanChart,
    isForce,
    nodeWidth,
    nodeHeight,
    searchTarget,
    isAdvancedBarOpen = false,
    viewportResetKey,
}: UseTreeInteractionProps): UseTreeInteractionReturn => {
    const zoomBehavior = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);
    const [zoomScale, setZoomScale] = useState(1);
    const [zoomX, setZoomX] = useState(0);
    const [zoomY, setZoomY] = useState(0);
    const zoomScaleRef = useRef(1);

    // Sync guard: prevents auto-centering from interrupting user interaction or background saves
    const isSyncing = useAppStore(selectIsTreeSyncing);
    const isUserInteracting = useRef(false);
    const isTransitioning = useRef(false);

    // --- Touch / Pinch-to-zoom state (mobile only) ---
    const touchStartDistanceRef = useRef<number | null>(null);
    const touchStartScaleRef = useRef<number>(1);
    const isPinchingRef = useRef(false);
    const lastAutoFitKeyRef = useRef<string | null>(null);
    const lastFocusId = useRef<string | null>(null);

    const syncZoomState = useCallback((scale: number, x: number, y: number) => {
        zoomScaleRef.current = scale;
        setZoomScale(scale);
        setZoomX(x);
        setZoomY(y);
    }, []);

    const updateStateThrottled = useThrottledCallback(syncZoomState, 100);

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
                updateStateThrottled(event.transform.k, event.transform.x, event.transform.y);
            })
            .on('end', (event) => {
                updateStateThrottled.flush(event.transform.k, event.transform.x, event.transform.y);
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
                touchStartScaleRef.current = zoomScaleRef.current;
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
            updateStateThrottled.cancel();
        };
    }, [svgRef, gRef, wrapperRef, updateStateThrottled]);

    // Update translateExtent separately when nodes or dimensions change
    useEffect(() => {
        if (!zoomBehavior.current || !wrapperRef.current) return;

        const { width: vWidth, height: vHeight } = wrapperRef.current.getBoundingClientRect() || { width: 1000, height: 1000 };

        const bounds = getTreeContentBounds({
            nodes,
            fanArcs,
            isFanChart,
            nodeWidth,
            nodeHeight,
        });
        if (bounds) {
            zoomBehavior.current.translateExtent([
                [bounds.minX - vWidth, bounds.minY - vHeight],
                [bounds.maxX + vWidth, bounds.maxY + vHeight]
            ]);
        } else {
            zoomBehavior.current.translateExtent([[-vWidth * 2, -vHeight * 2], [vWidth * 3, vHeight * 3]]);
        }
    }, [fanArcs, isFanChart, nodeHeight, nodeWidth, nodes, wrapperRef]);

    // Unified Center/Fit logic
    const centerOnTarget = useCallback((force = false, mode: TreeViewportMode = 'focus') => {
        const hasContent = isFanChart ? fanArcs.length > 0 : nodes.length > 0;
        if (!wrapperRef.current || !svgRef.current || !zoomBehavior.current || !hasContent) return;

        // Block auto-centering if user is interacting or if we are in a background sync update
        if (!force && mode === 'focus') {
            if (isUserInteracting.current) return;
            if (isSyncing) return;
        }

        // Skip if same target and not forced (prevents jitter)
        if (!force && mode === 'focus' && focusId === lastFocusId.current) return;
        if (isTransitioning.current && !force && mode === 'focus') return;

        const { width, height } = wrapperRef.current.getBoundingClientRect();
        if (width === 0 || height === 0) return;

        const viewportOffsetY = isAdvancedBarOpen ? -70 : 0;
        const transform = calculateTreeViewportTransform({
            mode,
            viewportWidth: width,
            viewportHeight: height,
            viewportOffsetY,
            focusId,
            nodes,
            fanArcs,
            isFanChart,
            isForce,
            nodeWidth,
            nodeHeight,
        });
        if (!transform) return;

        if (mode === 'focus') lastFocusId.current = focusId;
        isTransitioning.current = true;

        const svg = select(svgRef.current);
        svg
            .transition()
            .duration(mode === 'fit' ? 600 : 500)
            .ease(easeCubicOut)
            .call(
                zoomBehavior.current.transform,
                zoomIdentity.translate(transform.x, transform.y).scale(transform.scale),
            )
            .on('end interrupt', () => {
                isTransitioning.current = false;
            });
    }, [fanArcs, focusId, isAdvancedBarOpen, isFanChart, isForce, isSyncing, nodeHeight, nodeWidth, nodes, svgRef, wrapperRef]);

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

    // Start from a readable focal view. The explicit fit control remains the
    // overview action for large trees.
    useEffect(() => {
        const hasContent = isFanChart ? fanArcs.length > 0 : nodes.length > 0;
        if (!hasContent || lastAutoFitKeyRef.current === viewportResetKey) return;
        centerOnTarget(true, 'focus');
        lastAutoFitKeyRef.current = viewportResetKey;
    }, [fanArcs.length, nodes.length, isFanChart, viewportResetKey, centerOnTarget]);

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

    const handleResetZoom = useCallback(() => centerOnTarget(true, 'focus'), [centerOnTarget]);
    const handleFitToScreen = useCallback(() => centerOnTarget(true, 'fit'), [centerOnTarget]);

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
