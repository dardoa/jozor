import type { VisualPreviewPrivacyMode } from './previewAdapterTypes';

export type VisualPreviewLifeStatus = 'living' | 'deceased' | 'unknown';

export type VisualPreviewRelationshipHint =
  | 'root'
  | 'parent'
  | 'child'
  | 'spouse'
  | 'ancestor'
  | 'descendant'
  | 'relative'
  | 'unknown';

export interface VisualPreviewSanitizerPolicy {
  readonly privacyMode: VisualPreviewPrivacyMode;
  readonly includePhotos: boolean;
  readonly includeYears: boolean;
  readonly includeBirthPlace?: boolean;
  readonly includeOccupation?: boolean;
  readonly includeDescription?: boolean;
  readonly maxNodes: number;
  readonly language: 'en' | 'ar';
}

export interface SanitizedPreviewNode {
  readonly previewId: string; // Exclusively previewId (no raw 'id' to assert decoupling)
  readonly displayName: string;
  readonly generation?: number;
  readonly relationshipHint: VisualPreviewRelationshipHint;
  readonly lifeStatus: VisualPreviewLifeStatus;
  readonly isMasked: boolean;
  readonly hasPhoto: boolean;
  readonly birthYear?: number;
  readonly deathYear?: number;
  readonly birthPlaceLabel?: string;
  readonly occupationLabel?: string;
  readonly descriptionLabel?: string;
}

export interface SanitizedPreviewEdge {
  readonly fromPreviewId: string;
  readonly toPreviewId: string;
  readonly relationshipType: 'parent-child' | 'spouse' | 'ancestor' | 'descendant' | 'relative';
}

export interface SanitizedPreviewGraph {
  readonly nodes: readonly SanitizedPreviewNode[];
  readonly edges: readonly SanitizedPreviewEdge[];
  readonly warnings: readonly string[];
  readonly metadata: {
    readonly truncated: boolean;
    readonly originalNodeCount?: number;
    readonly sanitizedNodeCount: number;
    readonly policy: VisualPreviewSanitizerPolicy;
  };
}
