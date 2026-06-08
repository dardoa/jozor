import React from 'react';
import type { FanArc, Person, TreeNode, TreeSettings } from '../../types';
import type { CollapsePoint } from '../../utils/layout/constants';
import type { V3RendererPipeline } from '../../utils/layout/v3LayoutPipeline';
import type { TranslationSchema } from '../../utils/translationLoader';
import { V3FamilyGraphChart } from '../charts/V3FamilyGraphChart';
import { FanEmptyState, TreeEmptyState } from './FamilyTreeEmptyStates';

const FanChart = React.lazy(() =>
  import('../charts/FanChart').then((module) => ({ default: module.FanChart }))
);

export type FamilyTreeRendererMode = 'tree' | 'radial';

export interface FamilyTreeChartData {
  people: Record<string, Person>;
  focusId: string;
  settings: TreeSettings;
  nodes: TreeNode[];
  fanArcs: FanArc[];
  collapsePoints: CollapsePoint[];
  highlightedPath?: Set<string>;
  pipeline?: V3RendererPipeline | null;
}

export interface FamilyTreeChartViewport {
  zoomScale: number;
  zoomX: number;
  zoomY: number;
  viewportSize: { width: number; height: number };
}

export interface FamilyTreeChartHandlers {
  onSelect: (id: string) => void;
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
  onAddFirstPerson: (gender: 'male' | 'female') => void;
  toggleCollapse: (uniqueKey: string) => void;
}

interface FamilyTreeChartRendererProps {
  rendererMode: FamilyTreeRendererMode;
  chartData: FamilyTreeChartData;
  viewport: FamilyTreeChartViewport;
  handlers: FamilyTreeChartHandlers;
  isLoading: boolean;
  hasReceivedLayout: boolean;
  t: TranslationSchema;
}

interface ChartFactoryProps {
  rendererMode: FamilyTreeRendererMode;
  chartData: FamilyTreeChartData;
  viewport: FamilyTreeChartViewport;
  handlers: FamilyTreeChartHandlers;
  isLoading: boolean;
  hasReceivedLayout: boolean;
  t: TranslationSchema;
}

const hasRenderableChartContent = (
  rendererMode: FamilyTreeRendererMode,
  chartData: FamilyTreeChartData,
): boolean => {
  if (rendererMode === 'radial') return chartData.fanArcs.length > 0;
  return Object.keys(chartData.people).length > 0 && Boolean(chartData.people[chartData.focusId]);
};

const areChartRendererPropsEqual = (
  prev: FamilyTreeChartRendererProps,
  next: FamilyTreeChartRendererProps,
): boolean => {
  const chartInputsAreStable =
    prev.rendererMode === next.rendererMode &&
    prev.chartData === next.chartData &&
    prev.viewport === next.viewport &&
    prev.handlers === next.handlers &&
    prev.t === next.t;

  if (!chartInputsAreStable) return false;

  if (
    hasRenderableChartContent(prev.rendererMode, prev.chartData) &&
    hasRenderableChartContent(next.rendererMode, next.chartData)
  ) {
    return true;
  }

  return (
    prev.isLoading === next.isLoading &&
    prev.hasReceivedLayout === next.hasReceivedLayout
  );
};

const ChartFactory = React.memo<ChartFactoryProps>(({
  rendererMode,
  chartData,
  viewport,
  handlers,
  isLoading,
  hasReceivedLayout,
  t,
}) => {
  const {
    people,
    focusId,
    settings,
    fanArcs,
    collapsePoints,
    highlightedPath,
    pipeline,
  } = chartData;
  const {
    onSelect,
    onNodeContextMenu,
    onAddFirstPerson,
    toggleCollapse,
  } = handlers;

  if (rendererMode === 'radial') {
    if (fanArcs.length > 0) {
      return (
        <React.Suspense fallback={null}>
          <FanChart
            fanArcs={fanArcs}
            people={people}
            privacyMode={Boolean(settings.privacyMode)}
            onSelect={onSelect}
            onNodeContextMenu={onNodeContextMenu}
            zoomScale={viewport.zoomScale}
            highlightedPath={highlightedPath}
          />
        </React.Suspense>
      );
    }

    if (!isLoading && hasReceivedLayout) {
      return <FanEmptyState title={t.fanEmpty.title} description={t.fanEmpty.description} />;
    }

    return null;
  }

  // Do not gate on layout-worker nodes here. The V3 pipeline below re-derives
  // the visible graph from `people`, so it stays current after local mutations.
  const hasPeople = Object.keys(people).length > 0 && Boolean(people[focusId]);

  if (hasPeople) {
    return (
      <V3FamilyGraphChart
        people={people}
        focusId={focusId}
        settings={settings}
        collapsePoints={collapsePoints}
        highlightedPath={highlightedPath}
        pipeline={pipeline}
        zoomScale={viewport.zoomScale}
        zoomX={viewport.zoomX}
        zoomY={viewport.zoomY}
        viewportSize={viewport.viewportSize}
        onSelect={onSelect}
        onNodeContextMenu={onNodeContextMenu}
        onToggleCollapse={toggleCollapse}
      />
    );
  }

  if (!isLoading) {
    return (
      <TreeEmptyState
        title={t.emptyState?.title || 'Start Your Family Tree'}
        description={
          t.emptyState?.description ||
          'This tree is currently empty. Add yourself or the first person to begin documenting your lineage.'
        }
        addMaleLabel={t.emptyState?.addMale || 'Add Male'}
        addFemaleLabel={t.emptyState?.addFemale || 'Add Female'}
        footerLabel={t.premiumInteractiveCanvas}
        onAddFirstPerson={onAddFirstPerson}
      />
    );
  }

  return null;
});

ChartFactory.displayName = 'ChartFactory';

export const FamilyTreeChartRenderer = React.memo<FamilyTreeChartRendererProps>(({
  rendererMode,
  chartData,
  viewport,
  handlers,
  isLoading,
  hasReceivedLayout,
  t,
}) => (
  <ChartFactory
    rendererMode={rendererMode}
    chartData={chartData}
    viewport={viewport}
    handlers={handlers}
    isLoading={isLoading}
    hasReceivedLayout={hasReceivedLayout}
    t={t}
  />
), areChartRendererPropsEqual);

FamilyTreeChartRenderer.displayName = 'FamilyTreeChartRenderer';
