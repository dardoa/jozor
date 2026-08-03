export type VisualOutputProductType =
  | 'poster'
  | 'snapshot'
  | 'fan-chart'
  | 'ancestor-tree'
  | 'descendant-tree'
  | 'timeline'
  | 'migration-map'
  | 'network'
  | 'infographic'
  | 'book-cover'
  | 'certificate';

export type VisualOutputRenderer = 'png' | 'pdf' | 'svg' | 'html';

export type VisualOutputLayoutEngine =
  | 'tree-layout'
  | 'poster-layout'
  | 'ancestor-tiered'
  | 'descendant-tiered'
  | 'family-network-tiered'
  | 'full-tree-overview'
  | 'focus-family'
  | 'radial-layout'
  | 'radial-generations'
  | 'timeline-layout'
  | 'map-layout'
  | 'network-layout'
  | 'book-layout';

export type VisualOutputReadingStrategy =
  | 'ancestor'
  | 'descendant'
  | 'narrative'
  | 'radial'
  | 'chronological'
  | 'network';

export type VisualOutputSize =
  | 'viewport'
  | 'A4'
  | 'A3'
  | 'A2'
  | 'A1'
  | 'A0'
  | 'instagram-square'
  | 'facebook-cover'
  | 'presentation-16-9'
  | 'custom';

export type VisualOutputOrientation =
  | 'portrait'
  | 'landscape'
  | 'square'
  | 'current-view';

export type VisualOutputScope =
  | 'current-tree'
  | 'selected-root'
  | 'ancestor-line'
  | 'descendant-line'
  | 'branch'
  | 'full-tree'
  | 'visible-nodes';

export type VisualOutputPhotoMode =
  | 'none'
  | 'available-profile-photos'
  | 'circle'
  | 'square'
  | 'sepia'
  | 'original';

export type VisualOutputStylePreset =
  | 'classic'
  | 'modern'
  | 'modern-gallery'
  | 'warm'
  | 'dark'
  | 'vintage'
  | 'minimal'
  | 'royal'
  | 'manuscript'
  | 'arabic';

export type VisualOutputGenerationDepth = 1 | 2 | 3 | 4 | 'all';

export interface VisualOutputCapabilities {
  readonly sizes: readonly VisualOutputSize[];
  readonly orientations: readonly VisualOutputOrientation[];
  readonly scopes: readonly VisualOutputScope[];
  readonly rendererTargets: readonly VisualOutputRenderer[];
  readonly photoModes?: readonly VisualOutputPhotoMode[];
  readonly stylePresets?: readonly VisualOutputStylePreset[];
  readonly readingStrategies?: readonly VisualOutputReadingStrategy[];
  readonly layoutEngines?: readonly VisualOutputLayoutEngine[];
  readonly generationDepths?: readonly VisualOutputGenerationDepth[];
}

export interface VisualOutputPreviewAsset {
  readonly type: 'placeholder' | 'image' | 'generated';
  readonly src?: string;
  readonly alt: {
    readonly en: string;
    readonly ar: string;
  };
  readonly aspectRatio?: 'portrait' | 'landscape' | 'square' | 'poster';
}

export interface VisualOutputRecommendation {
  readonly en: readonly string[];
  readonly ar: readonly string[];
}

export interface VisualOutputDefinition {
  readonly id: string;
  readonly productType: VisualOutputProductType;
  readonly templateId: string;
  readonly displayName: {
    readonly en: string;
    readonly ar: string;
  };
  readonly description: {
    readonly en: string;
    readonly ar: string;
  };
  /** Canonical visual source. Derived renderer targets must consume this output. */
  readonly defaultRenderer?: VisualOutputRenderer;
  /** @deprecated use capabilities.rendererTargets instead */
  readonly rendererTargets: readonly VisualOutputRenderer[];
  readonly layoutEngine: VisualOutputLayoutEngine;
  readonly readingStrategy: VisualOutputReadingStrategy;
  /** @deprecated use capabilities.sizes instead */
  readonly supportedSizes: readonly string[];
  /** @deprecated use capabilities.orientations instead */
  readonly supportedOrientations: ReadonlyArray<'portrait' | 'landscape' | 'square'>;
  readonly status: 'active' | 'deprecated' | 'experimental';
  readonly capabilities: VisualOutputCapabilities;
  readonly plannedCapabilities?: Partial<VisualOutputCapabilities>;
  readonly previewAsset: VisualOutputPreviewAsset;
  readonly recommendedFor?: VisualOutputRecommendation;
  readonly metadata?: Record<string, unknown>;
}
