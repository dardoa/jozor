/**
 * V3FamilyGraphChart
 *
 * Thin wrapper that plumbs the useV3RendererPipeline hook into
 * V3FamilyGraphRenderer.  This is the only family-graph drawing path.
 *
 * Responsibilities:
 *  - Calls useV3RendererPipeline (the single useMemo pipeline).
 *  - Passes results to V3FamilyGraphRenderer (the pure SVG layer).
 *  - Returns null on invalid / empty state.
 */
import React from 'react';
import type { Person, TreeSettings } from '../../types';
import type { CollapsePoint } from '../../utils/layout/constants';
import { useV3RendererPipeline, type V3RendererPipeline } from '../../hooks/tree/useV3RendererPipeline';
import { V3FamilyGraphRenderer } from './V3FamilyGraphRenderer';

interface V3FamilyGraphChartProps {
  people: Record<string, Person>;
  focusId: string;
  settings: TreeSettings;
  collapsePoints?: CollapsePoint[];
  highlightedPath?: Set<string>;
  pipeline?: V3RendererPipeline | null;
  zoomScale?: number;
  onSelect?: (id: string) => void;
  onNodeContextMenu?: (e: React.MouseEvent, id: string) => void;
  onToggleCollapse?: (uniqueKey: string) => void;
}

export const V3FamilyGraphChart: React.FC<V3FamilyGraphChartProps> = ({
  people,
  focusId,
  settings,
  collapsePoints = [],
  highlightedPath,
  pipeline: propPipeline,
  zoomScale,
  onSelect,
  onNodeContextMenu,
  onToggleCollapse,
}) => {
  const fallbackPipeline = useV3RendererPipeline({
    people,
    focusId,
    collapsePoints,
    settings,
    skip: Boolean(propPipeline),
  });

  const activePipeline = propPipeline || fallbackPipeline;

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
      onSelect={onSelect}
      onNodeContextMenu={onNodeContextMenu}
      onToggleCollapse={onToggleCollapse}
    />
  );
};

export default V3FamilyGraphChart;
