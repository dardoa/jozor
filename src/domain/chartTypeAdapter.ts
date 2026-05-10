import type { ChartType } from '../types';

/**
 * Adapter-facing chart-model vocabulary.
 * Now that ChartType = 'focus' | 'radial' (M-004 complete), this adapter
 * is a direct pass-through. Kept as a stable import point so callers do not
 * need to import from types.ts directly.
 */
export type ChartModel = 'focus' | 'radial';

export function normalizeChartType(chartType: ChartType | null | undefined): ChartModel {
  return chartType === 'radial' ? 'radial' : 'focus';
}

/**
 * Returns the chart model for a given ChartType.
 * Why a function and not a direct cast: provides a single refactor point if
 * the ChartType union ever expands again in the future.
 *
 * @param chartType - The ChartType from TreeSettings or the store.
 * @returns 'focus' | 'radial'
 */
export function getChartModel(chartType: ChartType): ChartModel {
  return normalizeChartType(chartType);
}

/**
 * Visible-tree eligibility check.
 *
 * Why retained: FamilyTree.tsx and useFamilyTreeLayoutController read this
 * to decide minimap and highlighting paths. The legacy pedigree/fan concrete
 * types are gone — only 'focus' and 'radial' are valid.
 *
 * @param chartType - The active ChartType.
 * @returns model, allowVisibleTree (always false now — VisibleTree pipeline removed),
 *          and concreteType (always null).
 */
export interface VisibleTreeEligibility {
  model: ChartModel;
  allowVisibleTree: boolean;
  concreteType: null;
}

export function getVisibleTreeEligibility(
  chartType: ChartType
): VisibleTreeEligibility {
  // VisibleTree pipeline (pedigree/fan adapters) was removed in M-009.
  // Both modes use the new direct layout engines exclusively.
  return {
    model: getChartModel(chartType),
    allowVisibleTree: false,
    concreteType: null,
  };
}
