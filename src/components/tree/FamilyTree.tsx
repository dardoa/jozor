import React, { useImperativeHandle, useRef } from 'react';
import type { Person, TreeSettings } from '../../types';
import { useTranslation } from '../../context/TranslationContext';
import { FamilyTreeCanvas } from './FamilyTreeCanvas';
import { useTreeInteraction } from '../../hooks/tree/useTreeInteraction';
import { useFamilyTreeLayoutController } from '../../hooks/tree/useFamilyTreeLayoutController';
import { useLayoutModeTransition } from '../../hooks/ui/useLayoutModeTransition';

interface FamilyTreeProps {
  people: Record<string, Person>;
  focusId: string;
  onSelect: (id: string) => void;
  settings: TreeSettings;
  isDetailsPanelOpen: boolean;
  hasBlockingOverlay?: boolean;
  onPresent: () => void;
  onOpenSnapshotHistory?: () => void;
  onOpenPreferences?: () => void;
  activeModal: string | null;
  setDetailsPanelOpen: (open: boolean) => void;
  onOpenLinkModal: (type: 'parent' | 'spouse' | 'child', gender: 'male' | 'female') => void;
  onNodeContextMenu?: (e: React.MouseEvent, id: string) => void;
  onAddFirstPerson?: (gender: 'male' | 'female') => void;
}

export const FamilyTree = React.memo(React.forwardRef<SVGSVGElement, FamilyTreeProps>((props, ref) => {
  const {
    people,
    focusId,
    onSelect,
    settings,
    isDetailsPanelOpen,
    hasBlockingOverlay = false,
    onOpenPreferences,
    onNodeContextMenu = () => {},
    onAddFirstPerson = () => {},
  } = props;
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => svgRef.current!);

  const {
    isAdvancedBarOpen,
    searchTarget,
    viewportSize,
    isLoading,
    hasReceivedLayout,
    highlightedPath,
    activeChartType,
    chartModel,
    activeLayout,
    displayNodes,
    displayLinks,
    displayFanArcs,
    displayCollapsePoints,
    isForce,
    isFanChart,
    toggleCollapse,
    debugLayoutState,
  } = useFamilyTreeLayoutController({
    people,
    focusId,
    settings,
  });

  useLayoutModeTransition({
    layoutMode: settings.layoutMode,
    gRef: gRef as any,
  });

  const { handleZoomIn, handleZoomOut, handleResetZoom, handleFitToScreen, zoomScale, zoomX, zoomY } = useTreeInteraction({
    svgRef,
    gRef,
    wrapperRef,
    focusId,
    nodes: displayNodes,
    fanArcCount: displayFanArcs.length,
    isFanChart,
    isForce,
    searchTarget,
    isAdvancedBarOpen,
    viewportResetKey: JSON.stringify({
      chartType: activeChartType,
      chartModel,
      focusId,
      showDeceased: settings.showDeceased,
      generationLimit: settings.generationLimit,
      nodeCount: displayNodes.length,
      linkCount: displayLinks.length,
      fanArcCount: displayFanArcs.length,
    }),
  });

  React.useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as Window & { __JOZOR_LAYOUT_DEBUG__?: unknown }).__JOZOR_LAYOUT_DEBUG__ = {
      chartType: activeChartType,
      focusId,
      nodeIds: displayNodes.map((node) => node.id).sort(),
      referenceNodeIds: displayNodes.filter((node) => node.isReference).map((node) => node.id).sort(),
      linkKeys: displayLinks.map((link) => {
        const source = typeof link.source === 'string' ? link.source : link.source.id;
        const target = typeof link.target === 'string' ? link.target : link.target.id;
        return `${link.type}:${source}->${target}`;
      }).sort(),
      collapseKeys: displayCollapsePoints.map((cp) => cp.uniqueKey).sort(),
      collapsedKeys: displayCollapsePoints.filter((cp) => cp.isCollapsed).map((cp) => cp.uniqueKey).sort(),
      highlightedPathIds: highlightedPath ? Array.from(highlightedPath).sort() : [],
      highlightedPathSize: highlightedPath?.size ?? 0,
      nodeCount: displayNodes.length,
      linkCount: displayLinks.length,
      collapsePointCount: displayCollapsePoints.length,
      fanArcCount: displayFanArcs.length,
      zoomScale,
      zoomX,
      zoomY,
      viewportSize,
      hasReceivedLayout,
      isLoading,
      chartModel,
      activeLayoutSummary: {
        nodeCount: activeLayout && typeof activeLayout === 'object' && 'nodes' in (activeLayout as any)
          ? (activeLayout as { nodes?: unknown[] }).nodes?.length ?? 0
          : 0,
        linkCount: activeLayout && typeof activeLayout === 'object' && 'links' in (activeLayout as any)
          ? (activeLayout as { links?: unknown[] }).links?.length ?? 0
          : 0,
        fanArcCount: activeLayout && typeof activeLayout === 'object' && 'fanArcs' in (activeLayout as any)
          ? (activeLayout as { fanArcs?: unknown[] }).fanArcs?.length ?? 0
          : 0,
      },
      controllerDebug: debugLayoutState,
    };
  }, [
    activeChartType,
    activeLayout,
    chartModel,
    debugLayoutState,
    displayCollapsePoints,
    displayFanArcs.length,
    displayLinks,
    displayNodes,
    focusId,
    hasReceivedLayout,
    highlightedPath,
    isLoading,
    viewportSize,
    zoomScale,
    zoomX,
    zoomY,
  ]);

  return (
    <FamilyTreeCanvas
      people={people}
      focusId={focusId}
      settings={settings}
      isDetailsPanelOpen={isDetailsPanelOpen}
      hasBlockingOverlay={hasBlockingOverlay}
      wrapperRef={wrapperRef}
      svgRef={svgRef}
      gRef={gRef}
      isLoading={isLoading}
      activeLayout={activeLayout}
      displayNodes={displayNodes}
      displayFanArcs={displayFanArcs}
      displayCollapsePoints={displayCollapsePoints}
      highlightedPath={highlightedPath}
      zoomScale={zoomScale}
      hasReceivedLayout={hasReceivedLayout}
      isFanChart={isFanChart}
      isForce={isForce}
      onSelect={onSelect}
      onNodeContextMenu={onNodeContextMenu}
      onAddFirstPerson={onAddFirstPerson}
      toggleCollapse={toggleCollapse}
      onZoomIn={handleZoomIn}
      onZoomOut={handleZoomOut}
      onResetZoom={handleResetZoom}
      onFitToScreen={handleFitToScreen}
      onOpenPreferences={onOpenPreferences}
      t={t}
    />
  );
}));

FamilyTree.displayName = 'FamilyTree';
