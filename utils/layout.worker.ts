import { FanArc, TreeNode, TreeLink } from '../types';
import { getChartModel } from '../domain/chartTypeAdapter';
import { calculateFocusLayout, calculateV3FocusLayout } from './layout/focusLayout';
import { calculateRadialLayout } from './layout/radialLayout';
import type { CollapsePoint } from './layout/constants';

/**
 * Layout Web Worker — routes to the correct layout engine based on chartType.
 *
 * Why a Worker: layout calculations iterate over potentially 500+ nodes.
 * Running them off the main thread prevents UI jank during re-layout.
 *
 * Output contract (must match useFamilyTreeLayoutController message handler):
 *   { requestId, requestMetadata, nodes, links, collapsePoints, fanArcs }
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
      });
      return;
    }

    // Focus Mode: shows focused person + ancestors + descendants + direct spouses.
    // Anchor Protocol: focused person is always placed at (0, 0).
    const collapsedSet = new Set<string>(Array.isArray(collapsedIds) ? collapsedIds : []);

    const { nodes, links, collapsePoints } = calculateV3FocusLayout(
      effectiveFocusId,
      people,
      settings,
      collapsedSet
    );

    self.postMessage({
      requestId,
      requestMetadata,
      nodes,
      links,
      collapsePoints,
      fanArcs: [] as FanArc[],
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
