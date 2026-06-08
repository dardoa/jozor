import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FanArc, Person, TreeLink, TreeNode, TreeSettings } from '../../types';
import type { CollapsePoint } from '../../utils/layout/constants';
import type { V3RendererPipeline } from '../../utils/layout/v3LayoutPipeline';
import { useAppStore } from '../../store/useAppStore';
import { useDebouncedCallback } from '../ui/useDebounce';
import { calculateHighlightedPath } from '../../domain/treeBranch';
import {
  getChartModel,
} from '../../domain/chartTypeAdapter';
import { generateGeometryKey } from '../../domain/treeLayout';


interface LayoutData {
  nodes: TreeNode[];
  links: TreeLink[];
  collapsePoints: CollapsePoint[];
  fanArcs: FanArc[];
  v3Pipeline?: V3RendererPipeline | null;
}

interface LayoutRequestMetadata {
  geometryKey: string;
  requestIdentityKey: string;
  peopleVersion: number;
}

interface UseFamilyTreeLayoutControllerParams {
  people: Record<string, Person>;
  focusId: string;
  settings: TreeSettings;
}

function areSetsEqual<T>(left: ReadonlySet<T>, right: ReadonlySet<T>): boolean {
  if (left.size !== right.size) return false;

  for (const item of left) {
    if (!right.has(item)) return false;
  }

  return true;
}

function useStableHighlightedPath(
  people: Record<string, Person>,
  focusId: string,
  settings: TreeSettings,
): Set<string> | undefined {
  const previousPathRef = useRef<Set<string> | undefined>(undefined);

  return useMemo(() => {
    if (!settings.highlightBranch) {
      previousPathRef.current = undefined;
      return undefined;
    }

    const rootId = settings.highlightedBranchRootId || focusId;
    const nextPath = calculateHighlightedPath(people, rootId);
    const previousPath = previousPathRef.current;

    if (!nextPath) {
      previousPathRef.current = undefined;
      return undefined;
    }

    if (previousPath && areSetsEqual(previousPath, nextPath)) {
      return previousPath;
    }

    previousPathRef.current = nextPath;
    return nextPath;
  }, [
    people,
    focusId,
    settings.highlightBranch,
    settings.highlightedBranchRootId,
  ]);
}

export const useFamilyTreeLayoutController = ({
  people: _people,
  focusId,
  settings,
}: UseFamilyTreeLayoutControllerParams) => {
  const isAdvancedBarOpen = useAppStore((state) => state.isAdvancedBarOpen);
  const isSettingsDrawerOpen = useAppStore((state) => state.isSettingsDrawerOpen);
  const people = useAppStore((state) => state.people);
  const peopleVersion = useAppStore((state) => state.peopleVersion);
  const searchTarget = useAppStore((state) => state.searchTarget);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [lastValidLayout, setLastValidLayout] = useState<(LayoutData & LayoutRequestMetadata) | null>(null);
  const [layoutData, setLayoutData] = useState<LayoutData>({
    nodes: [],
    links: [],
    collapsePoints: [],
    fanArcs: [],
  });
  const [layoutPeopleVersion, setLayoutPeopleVersion] = useState(peopleVersion);
  const [layoutIdentityKey, setLayoutIdentityKey] = useState<string | null>(null);
  const [latestRequestMetadataDebug, setLatestRequestMetadataDebug] = useState<LayoutRequestMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasReceivedLayout, setHasReceivedLayout] = useState(false);
  const [layoutRefreshNonce, setLayoutRefreshNonce] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  const collapsedIdsRef = useRef<Set<string>>(new Set());



  const workerRef = useRef<Worker | null>(null);
  const latestRequestIdRef = useRef<number>(0);
  const latestRequestMetadataRef = useRef<LayoutRequestMetadata | null>(null);
  const layoutCacheRef = useRef<Map<string, LayoutData>>(new Map());
  const pendingResetRef = useRef(false);
  const prevPeopleVersionRef = useRef<number>(peopleVersion);
  /**
   * Opening the lab is a deliberate spacing-tuning moment. We clear any cached
   * geometry once so the worker recomputes the freshest node density instead of
   * reusing a stale frame that may have been generated before the refinement pass.
   */
  useEffect(() => {
    if (!isSettingsDrawerOpen) return;
    layoutCacheRef.current.clear();
    setLayoutRefreshNonce((value) => value + 1);
  }, [isSettingsDrawerOpen]);

  const geometryKey = useMemo(() => {
    return generateGeometryKey({
      focusId,
      settings,
      peopleVersion,
      collapsedIds: Array.from(collapsedIds),
    }) + `::lab-${layoutRefreshNonce}`;
  }, [
    focusId,
    settings,
    peopleVersion,
    collapsedIds,
    layoutRefreshNonce,
  ]);
  const requestIdentityKey = settings.chartType;
  const prevRequestIdentityKeyRef = useRef<string>(requestIdentityKey);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../../utils/layout.worker.ts', import.meta.url), { type: 'module' });

    workerRef.current.onmessage = (e: MessageEvent) => {
      const { requestId, requestMetadata, nodes, links, collapsePoints, fanArcs, v3Pipeline, error } = e.data;

      if (error) {
        console.error('Layout Worker Error:', error);
        setIsLoading(false);
        return;
      }

      if (requestId !== latestRequestIdRef.current) return;
      if (!requestMetadata) return;

      const latestRequestMetadata = latestRequestMetadataRef.current;
      if (
        !latestRequestMetadata ||
        latestRequestMetadata.geometryKey !== requestMetadata.geometryKey ||
        latestRequestMetadata.requestIdentityKey !== requestMetadata.requestIdentityKey ||
        latestRequestMetadata.peopleVersion !== requestMetadata.peopleVersion
      ) {
        return;
      }

      const startMark = `layout-start-${requestId}`;
      if (performance.getEntriesByName(startMark).length > 0) {
        const endMark = `layout-end-${requestId}`;
        performance.mark(endMark);
        const measureName = `layout-worker-time`;
        performance.clearMeasures(measureName);
        performance.measure(measureName, startMark, endMark);
        
        const measure = performance.getEntriesByName(measureName)[0];
        if (measure && typeof window !== 'undefined') {
          window.__LAST_LAYOUT_DURATION__ = measure.duration;
          window.__LAST_LAYOUT_CACHED__ = false;
        }
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
      }

      const newData = { nodes, links, collapsePoints, fanArcs, v3Pipeline } as LayoutData;
      const isEmptyResult = (!nodes || nodes.length === 0) && (!fanArcs || fanArcs.length === 0);
      setLayoutData(newData);
      setLayoutPeopleVersion(requestMetadata.peopleVersion);
      setLayoutIdentityKey(requestMetadata.requestIdentityKey);
      if (!isEmptyResult) {
        setLastValidLayout({ ...newData, ...requestMetadata });
      }
      setHasReceivedLayout(true);
      setIsLoading(false);
    };

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    const hasPeopleGraphChanged = prevPeopleVersionRef.current !== peopleVersion;
    prevPeopleVersionRef.current = peopleVersion;

    if (hasPeopleGraphChanged && settings.chartType === 'focus') {
      layoutCacheRef.current.clear();
    }

    if (prevRequestIdentityKeyRef.current !== requestIdentityKey) {
      layoutCacheRef.current.clear();
      pendingResetRef.current = true;
      prevRequestIdentityKeyRef.current = requestIdentityKey;
    }

    if (pendingResetRef.current) {
      pendingResetRef.current = false;
    }

    if (layoutCacheRef.current.has(geometryKey)) {
      const cached = layoutCacheRef.current.get(geometryKey)!;
      const chartModel = getChartModel(settings.chartType);
      const isFanExpected = chartModel === 'radial';
      const isValidCache = isFanExpected ? cached.fanArcs?.length > 0 : cached.nodes?.length > 0;

      if (isValidCache) {
        setLayoutData(cached);
        setLayoutIdentityKey(requestIdentityKey);
        setIsLoading(false);
        if (typeof window !== 'undefined') {
          window.__LAST_LAYOUT_DURATION__ = 0;
          window.__LAST_LAYOUT_CACHED__ = true;
        }
        return;
      }

      layoutCacheRef.current.delete(geometryKey);
    }

    setIsLoading(true);

    const requestId = ++latestRequestIdRef.current;
    const requestMetadata: LayoutRequestMetadata = {
      geometryKey,
      requestIdentityKey,
      peopleVersion,
    };
    latestRequestMetadataRef.current = requestMetadata;
    setLatestRequestMetadataDebug(requestMetadata);

    const timeoutId = setTimeout(() => {
      const effectiveSettings = isMobile
        ? { ...settings, enableForcePhysics: false, generationLimit: Math.min(settings.generationLimit, 3) }
        : settings;

      performance.mark(`layout-start-${requestId}`);
      workerRef.current?.postMessage({
        requestId,
        people,
        focusId,
        settings: effectiveSettings,
        collapsedIds: Array.from(collapsedIds),
        requestMetadata,
      });
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [
    geometryKey,
    requestIdentityKey,
    collapsedIds,
    settings,
    focusId,
    people,
    peopleVersion,
  ]);

  useEffect(() => {
    if (!layoutData.nodes.length && !layoutData.fanArcs.length) return;

    if (!layoutCacheRef.current.has(geometryKey)) {
      if (layoutCacheRef.current.size >= 20) {
        layoutCacheRef.current.clear();
      }
      layoutCacheRef.current.set(geometryKey, layoutData);
    }
  }, [layoutData, geometryKey]);

  useEffect(() => {
    collapsedIdsRef.current = collapsedIds;
    if (import.meta.env.DEV && typeof window !== 'undefined') {
      (window as Window & { __jozorFamilyGraphCollapsedIds?: string[] }).__jozorFamilyGraphCollapsedIds = Array.from(
        collapsedIds
      );
    }
  }, [collapsedIds]);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;
    type DebugCollapseDetail = { ids?: string[] };

    const handleSetCollapsedIds = (event: Event) => {
      const customEvent = event as CustomEvent<DebugCollapseDetail>;
      const nextIds = Array.isArray(customEvent.detail?.ids) ? customEvent.detail.ids : [];
      setCollapsedIds(new Set(nextIds));
    };

    const handleClearCollapsedIds = () => {
      setCollapsedIds(new Set());
    };

    window.addEventListener(
      'jozor-debug-set-family-graph-collapsed-ids',
      handleSetCollapsedIds as EventListener
    );
    window.addEventListener('jozor-debug-clear-family-graph-collapsed-ids', handleClearCollapsedIds);

    return () => {
      window.removeEventListener(
        'jozor-debug-set-family-graph-collapsed-ids',
        handleSetCollapsedIds as EventListener
      );
      window.removeEventListener(
        'jozor-debug-clear-family-graph-collapsed-ids',
        handleClearCollapsedIds
      );
    };
  }, []);

  const activeChartType = settings.chartType;
  const chartModel = getChartModel(activeChartType);

  const highlightedPath = useStableHighlightedPath(people, focusId, settings);

  const shouldReuseLastValidLayout =
    isLoading &&
    !!lastValidLayout &&
    lastValidLayout.requestIdentityKey === requestIdentityKey;
  const activeLayout =
    shouldReuseLastValidLayout
      ? lastValidLayout
      : layoutIdentityKey === requestIdentityKey &&
          layoutPeopleVersion === peopleVersion
        ? layoutData
        : { nodes: [], links: [], collapsePoints: [], fanArcs: [] };

  const handleResize = useDebouncedCallback(() => {
    setViewportSize({ width: window.innerWidth, height: window.innerHeight });
  }, 200);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [handleResize]);

  const toggleCollapse = useCallback((uniqueKey: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uniqueKey)) next.delete(uniqueKey);
      else next.add(uniqueKey);
      return next;
    });
  }, []);

  return {
    collapsedIds,
    isAdvancedBarOpen,
    searchTarget,
    viewportSize,
    isLoading,
    hasReceivedLayout,
    highlightedPath,
    activeChartType,
    chartModel,
    activeLayout,
    displayNodes: activeLayout.nodes,
    displayLinks: activeLayout.links,
    displayFanArcs: activeLayout.fanArcs,
    displayCollapsePoints: activeLayout.collapsePoints,
    displayPipeline: activeLayout.v3Pipeline,
    isForce: false,
    isFanChart: chartModel === 'radial',
    toggleCollapse,
    debugLayoutState: import.meta.env.DEV
      ? {
          geometryKey,
          layoutPeopleVersion,
          currentPeopleVersion: peopleVersion,
          debouncedPeopleVersion: peopleVersion,
          layoutIdentityKey,
          rawLayoutSummary: {
            nodeCount: layoutData.nodes.length,
            linkCount: layoutData.links.length,
            collapsePointCount: layoutData.collapsePoints.length,
            fanArcCount: layoutData.fanArcs.length,
          },
          lastValidLayoutSummary: lastValidLayout
            ? {
                geometryKey: lastValidLayout.geometryKey,
                requestIdentityKey: lastValidLayout.requestIdentityKey,
                peopleVersion: lastValidLayout.peopleVersion,
                nodeCount: lastValidLayout.nodes.length,
                linkCount: lastValidLayout.links.length,
                collapsePointCount: lastValidLayout.collapsePoints.length,
                fanArcCount: lastValidLayout.fanArcs.length,
              }
            : null,
          latestRequestMetadata: latestRequestMetadataDebug,
          shouldReuseLastValidLayout,
        }
      : undefined,
  };
};
