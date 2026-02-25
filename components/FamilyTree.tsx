import React, { useRef, useEffect, useState, useCallback, useMemo, useDeferredValue } from 'react';
import * as d3 from 'd3';
import { Person, TreeLink, TreeSettings, TreeNode, FanArc } from '../types';
import { CollapsePoint } from '../utils/layout/constants';
import { useAppStore } from '../store/useAppStore';
// Removed synchronous calculateTreeLayout import

// Import new sub-components
import { DescendantPedigreeChart } from './charts/DescendantPedigreeChart';
import { FanChart } from './charts/FanChart';
import { ForceChart } from './charts/ForceChart';
import { TreeHUD } from './tree/TreeHUD';
import { useTreeInteraction } from '../hooks/useTreeInteraction';

interface FamilyTreeProps {
  people: Record<string, Person>;
  focusId: string;
  onSelect: (id: string) => void;
  settings: TreeSettings;
  isSidebarOpen: boolean;
  onPresent: () => void;
  onOpenSnapshotHistory?: () => void;
  svgRef: React.RefObject<SVGSVGElement | null>;
  activeModal: string | null;
  setSidebarOpen: (open: boolean) => void;
  onOpenLinkModal: (type: 'parent' | 'spouse' | 'child', gender: 'male' | 'female') => void;
  onOpenModal: (type: any, data?: any) => void;
  onNodeContextMenu?: (e: React.MouseEvent, id: string) => void;
}

export const FamilyTree: React.FC<FamilyTreeProps> = React.memo(({
  people,
  focusId,
  onSelect,
  settings,
  isSidebarOpen,
  onOpenModal,
  onPresent,
  onOpenSnapshotHistory,
  svgRef: externalSvgRef,
  activeModal,
  setSidebarOpen,
  onOpenLinkModal,
  onNodeContextMenu = () => { }
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  // Bridge external providedSvgRef
  const setSvgRef = useCallback((node: SVGSVGElement | null) => {
    if (externalSvgRef) {
      if (typeof externalSvgRef === 'function') {
        (externalSvgRef as (n: SVGSVGElement | null) => void)(node);
      } else if (externalSvgRef && typeof externalSvgRef === 'object' && 'current' in externalSvgRef) {
        (externalSvgRef as React.MutableRefObject<SVGSVGElement | null>).current = node;
      }
    }
    // Also update internal ref
    (svgRef as React.MutableRefObject<SVGSVGElement | null>).current = node;
  }, [externalSvgRef]);

  const gRef = useRef<SVGGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const simulationRef = useRef<d3.Simulation<TreeNode, TreeLink> | null>(null);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const isAdvancedBarOpen = useAppStore(state => state.isAdvancedBarOpen);

  // 1. Prioritize UI responsiveness with deferred values
  const deferredSettings = useDeferredValue(settings);
  const deferredFocusId = useDeferredValue(focusId);

  // 2. Keep-Alive Rendering Logic: prevent background vanishing
  const [lastValidLayout, setLastValidLayout] = useState<{
    nodes: TreeNode[];
    links: TreeLink[];
    collapsePoints: CollapsePoint[];
    fanArcs: FanArc[];
    chartType: string;
  } | null>(null);

  // Track previous chart type to detect transitions
  const prevChartTypeRef = useRef<string>(settings.chartType);
  // Track layout/style changes for smooth D3 transitions
  const prevLayoutModeRef = useRef<string>(settings.layoutMode);
  const prevLineStyleRef = useRef<string | undefined>(settings.lineStyle);
  const [layoutData, setLayoutData] = useState<{
    nodes: TreeNode[];
    links: TreeLink[];
    collapsePoints: CollapsePoint[];
    fanArcs: FanArc[];
  }>({ nodes: [], links: [], collapsePoints: [], fanArcs: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [hasReceivedLayout, setHasReceivedLayout] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const latestRequestIdRef = useRef<number>(0);
  const layoutCacheRef = useRef<Map<string, any>>(new Map());

  const { nodes, links, collapsePoints, fanArcs } = layoutData;

  const isForce = settings.chartType === 'force';
  const isFanChart = settings.chartType === 'fan';

  // Reset node positions when chart type changes + clear layout cache to prevent cross-type data pollution
  useEffect(() => {
    if (prevChartTypeRef.current !== settings.chartType) {
      // Chart type changed - clear cached positions and the ENTIRE layout cache
      // to prevent stale descendant data being served to fan/force chart and vice versa.
      if (simulationRef.current) {
        simulationRef.current.stop();
        simulationRef.current = null;
      }
      layoutCacheRef.current.clear();
      setLayoutData({ nodes: [], links: [], collapsePoints: [], fanArcs: [] });
      prevChartTypeRef.current = settings.chartType;
    }
  }, [settings.chartType]);

  // D3 smooth fade transition when layout direction changes
  useEffect(() => {
    const layoutChanged = prevLayoutModeRef.current !== settings.layoutMode;
    if (layoutChanged && gRef.current) {
      // Quick fade-out then fade-in to signal the layout has changed
      d3.select(gRef.current)
        .transition().duration(180).ease(d3.easeSinInOut)
        .attr('opacity', 0)
        .transition().duration(300).ease(d3.easeSinInOut)
        .attr('opacity', 1);
    }
    prevLayoutModeRef.current = settings.layoutMode;
  }, [settings.layoutMode]);

  const peopleVersion = useAppStore(state => state.peopleVersion);
  const searchTarget = useAppStore(state => state.searchTarget);

  const geometryKey = useMemo(() => {
    const geometrySettings = {
      chartType: settings.chartType,
      layoutMode: settings.layoutMode,
      isCompact: settings.isCompact,
      nodeSpacingX: settings.nodeSpacingX,
      nodeSpacingY: settings.nodeSpacingY,
      enableTimeOffset: settings.enableTimeOffset,
      generationLimit: settings.generationLimit,
    };

    return JSON.stringify({
      focusId,
      settings: geometrySettings,
      peopleVersion,
      collapsedIds: Array.from(collapsedIds)
    });
  }, [
    focusId,
    settings.chartType,
    settings.layoutMode,
    settings.isCompact,
    settings.nodeSpacingX,
    settings.nodeSpacingY,
    settings.enableTimeOffset,
    settings.generationLimit,
    peopleVersion,
    collapsedIds,
  ]);

  // --- Web Worker Integration ---
  useEffect(() => {
    // Initialize Worker
    workerRef.current = new Worker(new URL('../utils/layout.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { requestId, nodes, links, collapsePoints, fanArcs, error } = e.data;

      if (error) {
        console.error('Layout Worker Error:', error);
        setIsLoading(false);
        return;
      }

      // Drop stale results
      if (requestId !== latestRequestIdRef.current) return;

      const isEmptyResult = (!nodes || nodes.length === 0) && (!fanArcs || fanArcs.length === 0);
      if (isEmptyResult) {
        console.warn('[FamilyTree] Empty layout result:', {
          requestId,
          peopleCount: Object.keys(people).length,
          focusId: deferredFocusId,
          chartType: deferredSettings.chartType
        });
        setIsLoading(false);
        return;
      }

      const newData = { nodes, links, collapsePoints, fanArcs };
      setLayoutData(newData);
      setLastValidLayout({ ...newData, chartType: settings.chartType }); // Use live chartType
      setHasReceivedLayout(true);
      setIsLoading(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    if (layoutCacheRef.current.has(geometryKey)) {
      const cached = layoutCacheRef.current.get(geometryKey);
      // Validate cached data matches the expected chart type
      const isFanExpected = settings.chartType === 'fan';
      const isValidCache = isFanExpected
        ? (cached.fanArcs?.length > 0)
        : (cached.nodes?.length > 0);

      if (isValidCache) {
        setLayoutData(cached);
        setIsLoading(false);
        return;
      }
      // Stale/wrong-type entry - remove and recalculate
      layoutCacheRef.current.delete(geometryKey);
    }

    setIsLoading(true);
    const requestId = ++latestRequestIdRef.current;

    const timeoutId = setTimeout(() => {
      workerRef.current?.postMessage({
        requestId,
        people,
        focusId: focusId,          // Use live focusId, not deferred
        settings: settings,        // Use live settings so chartType is always current
        collapsedIds: Array.from(collapsedIds)
      });
    }, 150);

    return () => clearTimeout(timeoutId);
  }, [people, geometryKey, collapsedIds]);

  // Update cache when layoutData changes and it's not from cache
  useEffect(() => {
    if (!layoutData.nodes.length && !layoutData.fanArcs.length) return;

    if (!layoutCacheRef.current.has(geometryKey)) {
      if (layoutCacheRef.current.size >= 20) {
        layoutCacheRef.current.clear();
      }
      layoutCacheRef.current.set(geometryKey, layoutData);
    }
  }, [layoutData, geometryKey]);

  // --- Highlight Branch Logic ---
  const highlightedPath = useMemo(() => {
    if (!settings.highlightBranch) return undefined;

    const rootId = settings.highlightedBranchRootId || focusId;
    if (!rootId || !people[rootId]) return undefined;

    const branch = new Set<string>();
    const stack = [rootId];

    while (stack.length > 0) {
      const id = stack.pop()!;
      if (branch.has(id)) continue;
      branch.add(id);

      const p = people[id];
      if (p) {
        if (p.children) stack.push(...p.children);
        if (p.spouses) stack.push(...p.spouses);
      }
    }
    return branch;
  }, [people, focusId, settings.highlightBranch, settings.highlightedBranchRootId]);

  // Keep-Alive Logic: use LIVE settings.chartType so the correct chart renders
  // immediately when layout data arrives, without waiting for deferred values.
  const activeChartType = (isLoading || (!layoutData.nodes.length && !layoutData.fanArcs.length))
    ? (lastValidLayout?.chartType || settings.chartType)
    : settings.chartType;
  const activeLayout = ((isLoading || (!layoutData.nodes.length && !layoutData.fanArcs.length)) && lastValidLayout)
    ? lastValidLayout
    : layoutData;

  const displayNodes = activeLayout.nodes;
  const displayLinks = activeLayout.links;
  const displayFanArcs = activeLayout.fanArcs;
  const displayCollapsePoints = activeLayout.collapsePoints;

  // --- Force Simulation Logic ---
  useEffect(() => {
    if (!isForce || !svgRef.current) return;

    const simulation = d3.forceSimulation<TreeNode, TreeLink>(nodes)
      .force("link", d3.forceLink<TreeNode, TreeLink>(links).id((d: TreeNode) => d.id).distance(150))
      .force("charge", d3.forceManyBody<TreeNode>().strength(-500))
      .force("center", d3.forceCenter<TreeNode>(0, 0))
      .force("collide", d3.forceCollide<TreeNode>(80));

    simulation.on("tick", () => {
      const uNodes = d3.select(gRef.current).selectAll('.force-node').data(nodes);
      uNodes.attr('transform', (d: TreeNode) => `translate(${d.x},${d.y})`);

      const uLinks = d3.select(gRef.current).selectAll('.force-link').data(links);
      uLinks.attr('d', (d: TreeLink) => `M ${(d.source as TreeNode).x} ${(d.source as TreeNode).y} L ${(d.target as TreeNode).x} ${(d.target as TreeNode).y}`);
    });

    simulationRef.current = simulation;

    if (!settings.enableForcePhysics) {
      // Static mode: stop continuous simulation and fast-forward 300 ticks synchronously
      simulation.stop();
      for (let i = 0; i < 300; ++i) simulation.tick();
      // Update DOM once after pre-calculating the layout
      d3.select(gRef.current).selectAll('.force-node').data(nodes)
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
      d3.select(gRef.current).selectAll('.force-link').data(links)
        .attr('d', (d: any) => `M ${d.source.x} ${d.source.y} L ${d.target.x} ${d.target.y}`);
    }

    return () => { simulation.stop(); };
  }, [isForce, nodes, links, settings.enableForcePhysics]);

  useEffect(() => {
    if (!simulationRef.current || !isForce) return;

    if (settings.enableForcePhysics) {
      simulationRef.current.alpha(1).restart();
    } else {
      simulationRef.current.stop();
    }
  }, [settings.enableForcePhysics, isForce]);

  // --- Use Tree Interaction Hook (Zoom & Camera Logic) ---
  const { handleZoomIn, handleZoomOut, handleResetZoom, handleFitToScreen, zoomScale, zoomX, zoomY } = useTreeInteraction({
    svgRef,
    gRef,
    wrapperRef,
    focusId,
    nodes,
    isFanChart,
    isForce,
    searchTarget,
    isAdvancedBarOpen,
  });

  const [viewportSize, setViewportSize] = useState({ width: 1920, height: 1080 });
  useEffect(() => {
    const handleResize = () => setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleCollapse = useCallback((uniqueKey: string) => {
    setCollapsedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(uniqueKey)) newSet.delete(uniqueKey);
      else newSet.add(uniqueKey);
      return newSet;
    });
  }, []);

  return (
    <div
      id="family-tree-canvas"
      ref={wrapperRef}
      className="flex-1 h-full bg-[var(--theme-bg)] overflow-hidden relative cursor-move select-none transition-all duration-500 ease-in-out"
    >

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/5 backdrop-blur-[2px] transition-opacity duration-300">
          <div className="flex flex-col items-center gap-3 bg-[var(--theme-bg-elevated)] p-6 rounded-2xl shadow-2xl border border-white/10">
            <div className="w-10 h-10 border-2 border-[var(--brand-color)] border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-[var(--theme-text-muted)]">Calculating Layout...</span>
          </div>
        </div>
      )}

      {/* HUD Overlay (Minimap, Zoom Controls, Floating View Settings) */}
      <TreeHUD
        nodes={nodes}
        links={links}
        focusId={focusId}
        showMinimap={settings.showMinimap}
        isFanChart={isFanChart}
        isForce={isForce}
        isSidebarOpen={isSidebarOpen}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onFitToScreen={handleFitToScreen}
        settings={settings}
        onPresent={onPresent}
        onOpenSnapshotHistory={onOpenSnapshotHistory}
        onOpenModal={onOpenModal}
      />

      <svg ref={setSvgRef} className="w-full h-full block">
        <defs>
          <filter id="shadow"><feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.06" /></filter>
        </defs>

        <g ref={gRef} className="viewport">
          {activeLayout && (
            <>
              {activeChartType === 'fan' && (
                displayFanArcs.length > 0 ? (
                  <FanChart
                    fanArcs={displayFanArcs}
                    people={people}
                    onSelect={onSelect}
                    onNodeContextMenu={onNodeContextMenu}
                    zoomScale={zoomScale}
                  />
                ) : !isLoading && hasReceivedLayout && (
                  <foreignObject x="-200" y="-80" width="400" height="160">
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-6 rounded-2xl bg-[var(--card-bg)] border border-white/10 shadow-xl">
                      <span className="text-3xl">🪭</span>
                      <p className="text-sm font-semibold text-[var(--text-main)]">Fan Chart (Ancestry) is empty.</p>
                      <p className="text-xs text-[var(--text-dim)] leading-relaxed">
                        Ensure the focused person has parents added to the tree.
                      </p>
                    </div>
                  </foreignObject>
                )
              )}
              {activeChartType === 'force' && displayNodes.length > 0 && (
                <ForceChart
                  nodes={displayNodes}
                  links={displayLinks}
                  people={people}
                  focusId={focusId}
                  onSelect={onSelect}
                  settings={settings}
                  onNodeContextMenu={() => { }}
                  zoomScale={zoomScale}
                />
              )}
              {(activeChartType === 'descendant' || activeChartType === 'pedigree') && (
                displayNodes.length > 0 ? (
                  <DescendantPedigreeChart
                    nodes={displayNodes}
                    links={displayLinks}
                    collapsePoints={displayCollapsePoints}
                    focusId={focusId}
                    onSelect={onSelect}
                    settings={settings}
                    toggleCollapse={toggleCollapse}
                    people={people}
                    onNodeContextMenu={() => { }}
                    zoomScale={zoomScale}
                    zoomX={zoomX}
                    zoomY={zoomY}
                    viewportWidth={viewportSize.width}
                    viewportHeight={viewportSize.height}
                    highlightedNodeId={null}
                    highlightedPath={highlightedPath}
                  />
                ) : !isLoading && hasReceivedLayout && (
                  <foreignObject x="-200" y="-80" width="400" height="160">
                    <div
                      style={{ fontFamily: 'sans-serif' }}
                      className="w-full h-full flex flex-col items-center justify-center gap-3 text-center p-6 rounded-2xl bg-[var(--card-bg,#1e293b)] border border-white/10 shadow-xl"
                    >
                      <span className="text-3xl">🌳</span>
                      <p className="text-sm font-semibold text-[var(--text-main,#f1f5f9)]">No data to display.</p>
                      <p className="text-xs text-[var(--text-dim,#94a3b8)] leading-relaxed">
                        Check <strong>Show Deceased</strong> or adjust <strong>Timeline Layout</strong> and filters in the <strong>Settings</strong> side drawer.
                      </p>
                    </div>
                  </foreignObject>
                )
              )}
            </>
          )}
        </g>
      </svg>
    </div>
  );
});