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
  | 'radial-layout'
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

export interface VisualOutputDefinition {
  id: string;
  productType: VisualOutputProductType;
  templateId: string;
  displayName: {
    en: string;
    ar: string;
  };
  description: {
    en: string;
    ar: string;
  };
  rendererTargets: VisualOutputRenderer[];
  layoutEngine: VisualOutputLayoutEngine;
  readingStrategy: VisualOutputReadingStrategy;
  supportedSizes: string[];
  supportedOrientations: Array<'portrait' | 'landscape' | 'square'>;
  status: 'active' | 'deprecated' | 'experimental';
  metadata?: Record<string, unknown>;
}
