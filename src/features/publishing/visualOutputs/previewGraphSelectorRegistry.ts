import type {
  VisualPreviewGraphSelector,
  VisualPreviewSelectorProduct,
} from './previewGraphSelectorTypes';

const selectorMap: Partial<Record<VisualPreviewSelectorProduct, VisualPreviewGraphSelector>> = {};

/**
 * Returns the registered raw graph selector for a visual preview product.
 * Phase 4C intentionally registers no selectors; live source readers are deferred.
 */
export function getVisualPreviewGraphSelector(
  productType: VisualPreviewSelectorProduct
): VisualPreviewGraphSelector | undefined {
  return selectorMap[productType];
}

/**
 * Returns all registered raw graph selectors.
 * Phase 4C returns an empty list to preserve the no-runtime-wiring boundary.
 */
export function listVisualPreviewGraphSelectors(): VisualPreviewGraphSelector[] {
  return Object.values(selectorMap) as VisualPreviewGraphSelector[];
}
