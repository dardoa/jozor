import React, { useMemo } from 'react';
import type { FanArc, Person, TreeNode, TreeSettings } from '../../types';
import type { CollapsePoint } from '../../utils/layout/constants';
import type { V3RendererPipeline } from '../../utils/layout/v3LayoutPipeline';
import { TreeLoader } from './TreeLoader';
import { TreeHUD } from './TreeHUD';
import {
  FamilyTreeChartRenderer,
  type FamilyTreeChartData,
  type FamilyTreeChartHandlers,
  type FamilyTreeChartViewport,
  type FamilyTreeRendererMode,
} from './FamilyTreeChartRenderer';
import { useTreeCssVariables } from '../../hooks/ui/useTreeCssVariables';
import { useTreeRenderDiagnostics } from '../../hooks/ui/useTreeRenderDiagnostics';

interface FamilyTreeCanvasProps {
  people: Record<string, Person>;
  focusId: string;
  settings: TreeSettings;
  isDetailsPanelOpen: boolean;
  hasBlockingOverlay?: boolean;
  wrapperRef: React.RefObject<HTMLDivElement | null>;
  svgRef: React.RefObject<SVGSVGElement | null>;
  gRef: React.RefObject<SVGGElement | null>;
  isLoading: boolean;
  activeLayout: any;
  displayNodes: TreeNode[];
  displayFanArcs: FanArc[];
  displayCollapsePoints: CollapsePoint[];
  displayPipeline?: V3RendererPipeline | null;
  highlightedPath?: Set<string>;
  zoomScale: number;
  hasReceivedLayout: boolean;
  isFanChart: boolean;
  isForce: boolean;
  onSelect: (id: string) => void;
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
  onAddFirstPerson: (gender: 'male' | 'female') => void;
  toggleCollapse: (uniqueKey: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onFitToScreen: () => void;
  onOpenPreferences?: () => void;
  t: any;
}

export const FamilyTreeCanvas: React.FC<FamilyTreeCanvasProps> = ({
  people,
  focusId,
  settings,
  isDetailsPanelOpen,
  hasBlockingOverlay = false,
  wrapperRef,
  svgRef,
  gRef,
  isLoading,
  activeLayout,
  displayNodes,
  displayFanArcs,
  displayCollapsePoints,
  displayPipeline,
  highlightedPath,
  zoomScale,
  hasReceivedLayout,
  isFanChart,
  isForce,
  onSelect,
  onNodeContextMenu,
  onAddFirstPerson,
  toggleCollapse,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onFitToScreen,
  onOpenPreferences,
  t,
}) => {
  const rendererMode: FamilyTreeRendererMode = isFanChart ? 'radial' : 'tree';
  const { canvasBg, canvasOverlay, ...treeCssVariables } = useTreeCssVariables();

  const chartData = useMemo<FamilyTreeChartData>(() => ({
    people,
    focusId,
    settings,
    nodes: displayNodes,
    fanArcs: displayFanArcs,
    collapsePoints: displayCollapsePoints,
    highlightedPath,
    pipeline: displayPipeline,
  }), [
    displayCollapsePoints,
    displayFanArcs,
    displayNodes,
    displayPipeline,
    focusId,
    highlightedPath,
    people,
    settings,
  ]);
  const chartViewport = useMemo<FamilyTreeChartViewport>(() => ({
    zoomScale,
  }), [zoomScale]);
  const chartHandlers = useMemo<FamilyTreeChartHandlers>(() => ({
    onSelect,
    onNodeContextMenu,
    onAddFirstPerson,
    toggleCollapse,
  }), [
    onAddFirstPerson,
    onNodeContextMenu,
    onSelect,
    toggleCollapse,
  ]);
  useTreeRenderDiagnostics({ hasReceivedLayout });

  return (
    <div
      id="family-tree-canvas"
      ref={wrapperRef}
      className="flex-1 h-full overflow-hidden relative cursor-move select-none transition-all duration-500 ease-in-out pb-[72px] sm:pb-0"
      style={{
        ...treeCssVariables,
        backgroundColor: canvasBg,
        backgroundImage: canvasOverlay,
        backgroundBlendMode: 'normal',
      }}
    >
      {isLoading && <TreeLoader />}

      <TreeHUD
        isFanChart={isFanChart}
        isForce={isForce}
        isDetailsPanelOpen={isDetailsPanelOpen}
        hasBlockingOverlay={hasBlockingOverlay}
        onOpenPreferences={onOpenPreferences}
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onResetZoom={onResetZoom}
        onFitToScreen={onFitToScreen}
        zoomScale={zoomScale}
      />

      <svg ref={svgRef} className="w-full h-full block">
        <defs>
          <filter id="shadow">
            <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.06" />
          </filter>
        </defs>

        <g ref={gRef} className="viewport transition-opacity duration-300" style={{ opacity: isLoading ? 0.3 : 1 }}>
          {activeLayout && (
            <FamilyTreeChartRenderer
              rendererMode={rendererMode}
              chartData={chartData}
              viewport={chartViewport}
              handlers={chartHandlers}
              isLoading={isLoading}
              hasReceivedLayout={hasReceivedLayout}
              t={t}
            />
          )}
        </g>
      </svg>
    </div>
  );
};
