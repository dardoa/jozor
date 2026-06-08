/**
 * V3FamilyGraphChart
 *
 * Thin wrapper that renders the worker-produced V3 pipeline through
 * V3FamilyGraphRenderer. This is the only family-graph drawing path.
 *
 * Responsibilities:
 *  - Receives the layout pipeline from the layout worker/controller.
 *  - Passes the pipeline to V3FamilyGraphRenderer (the pure SVG layer).
 *  - Returns null while the worker pipeline is not available.
 */
import React from 'react';
import type { Person, TreeSettings } from '../../types';
import type { CollapsePoint } from '../../utils/layout/constants';
import type { V3RendererPipeline } from '../../utils/layout/v3LayoutPipeline';
import { V3FamilyGraphRenderer } from './V3FamilyGraphRenderer';

interface V3FamilyGraphChartProps {
  people: Record<string, Person>;
  focusId: string;
  settings: TreeSettings;
  collapsePoints?: CollapsePoint[];
  highlightedPath?: Set<string>;
  pipeline?: V3RendererPipeline | null;
  zoomScale?: number;
  zoomX?: number;
  zoomY?: number;
  viewportSize?: { width: number; height: number };
  onSelect?: (id: string) => void;
  onNodeContextMenu?: (e: React.MouseEvent, id: string) => void;
  onToggleCollapse?: (uniqueKey: string) => void;
}

export const V3FamilyGraphChart: React.FC<V3FamilyGraphChartProps> = ({
  people,
  focusId,
  settings,
  highlightedPath,
  pipeline: propPipeline,
  zoomScale,
  zoomX,
  zoomY,
  viewportSize,
  onSelect,
  onNodeContextMenu,
  onToggleCollapse,
}) => {
  const activePipeline = propPipeline;

  if (!activePipeline) {
    return null;
  }

  return (
    <V3FamilyGraphRenderer
      people={people}
      settings={settings}
      pipeline={activePipeline}
      focusPersonId={focusId}
      highlightedPath={highlightedPath}
      zoomScale={zoomScale}
      zoomX={zoomX}
      zoomY={zoomY}
      viewportSize={viewportSize}
      onSelect={onSelect}
      onNodeContextMenu={onNodeContextMenu}
      onToggleCollapse={onToggleCollapse}
    />
  );
};

export default V3FamilyGraphChart;
