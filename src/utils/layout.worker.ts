import { FanArc, TreeNode, TreeLink } from '../types';
import { getChartModel } from '../domain/chartTypeAdapter';
import { calculateFocusLayout } from './layout/focusLayout';
import { calculateRadialLayout } from './layout/radialLayout';
import { computeV3PipelineData } from './layout/v3LayoutPipeline';
import type { CollapsePoint } from './layout/constants';

/**
 * Layout Web Worker — routes to the correct layout engine based on chartType.
 *
 * Why a Worker: layout calculations iterate over potentially 500+ nodes.
 * Running them off the main thread prevents UI jank during re-layout.
 *
 * Output contract (must match useFamilyTreeLayoutController message handler):
 *   { requestId, requestMetadata, nodes, links, collapsePoints, fanArcs, v3Pipeline }
 */
self.onmessage = (e: MessageEvent) => {
  const { requestId, people, focusId, settings, collapsedIds, requestMetadata } = e.data;

  // Resolve a safe focus ID — fall back to the first person if focusId is invalid.
  const firstId = people ? Object.keys(people)[0] : undefined;
  const effectiveFocusId =
    focusId && people && people[focusId] ? focusId : firstId ?? focusId;

  try {
    const chartModel = getChartModel(settings.chartType);

    if (chartModel === 'radial') {
      // Radial Mode: full circular layout using d3-partition via calculateRadialLayout.
      // Returns FanArc[] consumed by FanChart.tsx. nodes/links are empty for this mode.
      const fanArcs: FanArc[] = calculateRadialLayout(
        effectiveFocusId,
        people,
        settings
      );

      self.postMessage({
        requestId,
        requestMetadata,
        nodes: [] as TreeNode[],
        links: [] as TreeLink[],
        collapsePoints: [] as CollapsePoint[],
        fanArcs,
        v3Pipeline: null,
      });
      return;
    }

    // Focus Mode: runs the unified layout pipeline.
    const collapsedSet = new Set<string>(Array.isArray(collapsedIds) ? collapsedIds : []);

    // 1. Generate baseline collapse points using the legacy/fallback focus layout
    const fallbackLayout = calculateFocusLayout(effectiveFocusId, people, settings, collapsedSet);
    const collapsePoints = fallbackLayout.collapsePoints;

    // 2. Compute the complete V3 pipeline layout (including scaled positions & edges)
    const v3Pipeline = computeV3PipelineData({
      people,
      focusId: effectiveFocusId,
      collapsePoints,
      settings,
    });

    // 3. Map pipeline outputs to standard TreeNode/TreeLink objects for backward compatibility
    let nodes: TreeNode[] = [];
    let links: TreeLink[] = [];

    if (v3Pipeline) {
      nodes = v3Pipeline.projectedNodes
        .map((pn) => {
          const personData = people[pn.personId];
          if (!personData) return null;
          return {
            id: pn.uniqueEntityId,
            x: pn.x,
            y: pn.y,
            data: personData,
            type: pn.personId === effectiveFocusId ? 'focus' : 'ancestor',
            depth: 0,
            isReference: pn.isReference,
          } as TreeNode;
        })
        .filter((n): n is TreeNode => n !== null);

      links = v3Pipeline.edgeEntities.map((edge) => {
        return {
          source: edge.metadata.sourcePersonId || '',
          target: edge.metadata.targetPersonId || '',
          type: edge.type === 'partner-link' ? 'marriage' : 'parent-child',
          pathData: edge.pathData,
        } as TreeLink;
      });
    }

    self.postMessage({
      requestId,
      requestMetadata,
      nodes,
      links,
      collapsePoints,
      fanArcs: [] as FanArc[],
      v3Pipeline,
    });
  } catch (error) {
    self.postMessage({
      requestId,
      requestMetadata,
      error:
        error instanceof Error
          ? error.message
          : 'Unknown layout calculation error',
    });
  }
};
