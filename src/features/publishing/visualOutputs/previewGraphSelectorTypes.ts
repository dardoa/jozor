import type { PreviewSanitizerRawGraph } from './previewProductionSanitizer';
import type { VisualOutputProductType } from './visualOutputTypes';

import type { PosterPersonTokenCatalogBoundary } from './posterPersonTokenCatalog';

export type VisualPreviewSelectorProduct = Extract<VisualOutputProductType, 'poster' | 'snapshot'>;

export interface VisualPreviewSelectorContext {
  readonly productType: VisualPreviewSelectorProduct;
  readonly definitionId: string;
  readonly rootPersonId?: string;
  readonly rootPersonToken?: string;
  readonly tokenCatalog?: PosterPersonTokenCatalogBoundary;
  readonly visibleNodeIds?: readonly string[];
  readonly maxDepth?: number | 'all';
  readonly maxNodes: number;
  readonly language: 'en' | 'ar';
}

export interface VisualPreviewGraphSelector<TRawSource = unknown> {
  readonly productType: VisualPreviewSelectorProduct;
  readonly selectRawGraph: (
    source: TRawSource,
    context: VisualPreviewSelectorContext
  ) => PreviewSanitizerRawGraph;
}
