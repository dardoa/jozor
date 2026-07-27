import type { SanitizedPreviewGraph, VisualPreviewSanitizerPolicy } from './previewSanitizerTypes';

/**
 * Interface contract governing family tree data sanitization.
 * TRawGraph is abstracted as an unknown generic parameter to isolate
 * raw database schema and store types from the visual preview layouts.
 */
export interface VisualPreviewSanitizer<TRawGraph = unknown> {
  readonly sanitize: (
    rawGraph: TRawGraph,
    policy: VisualPreviewSanitizerPolicy
  ) => SanitizedPreviewGraph;
}
