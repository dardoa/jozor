import type {
  VisualOutputProductType,
  VisualOutputLayoutEngine,
  VisualOutputReadingStrategy,
} from './visualOutputTypes';
import type { SanitizedPreviewGraph } from './previewSanitizerTypes';

export type VisualPreviewMode = 'static-mock' | 'sanitized-data' | 'high-fidelity';

export type VisualPreviewPrivacyMode = 'public' | 'masked' | 'owner-full';

export interface VisualPreviewRequest {
  readonly definitionId: string;
  readonly mode: VisualPreviewMode;
  readonly privacyMode: VisualPreviewPrivacyMode;
  readonly language: 'en' | 'ar';
  readonly maxNodes?: number;
  readonly sanitizedGraph?: SanitizedPreviewGraph;
}

export interface VisualPreviewPersonNode {
  readonly id: string;
  readonly displayName: string;
  readonly generation?: number;
  readonly isMasked?: boolean;
  readonly hasPhoto?: boolean;
  readonly birthYear?: number;
  readonly deathYear?: number;
}

export interface VisualPreviewEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly relationshipType?: 'parent-child' | 'spouse' | 'ancestor';
}

export interface VisualPreviewModel {
  readonly definitionId: string;
  readonly productType: VisualOutputProductType;
  readonly layoutEngine: VisualOutputLayoutEngine;
  readonly readingStrategy: VisualOutputReadingStrategy;
  readonly mode: VisualPreviewMode;
  readonly privacyMode: VisualPreviewPrivacyMode;
  readonly nodes: readonly VisualPreviewPersonNode[];
  readonly edges: readonly VisualPreviewEdge[];
  readonly warnings: readonly string[];
  readonly metadata: {
    readonly truncated: boolean;
    readonly nodeCount: number;
    readonly maxNodes?: number;
  };
}

export interface VisualPreviewAdapter {
  readonly productType: VisualOutputProductType;
  readonly createPreviewModel: (request: VisualPreviewRequest) => VisualPreviewModel;
}
