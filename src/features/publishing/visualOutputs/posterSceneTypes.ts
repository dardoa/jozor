import type {
  SanitizedPreviewGraph,
  VisualPreviewRelationshipHint,
} from './previewSanitizerTypes';
import type { VisualPreviewPrivacyMode } from './previewAdapterTypes';

export type PosterPageSize = 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
export type PosterOrientation = 'portrait' | 'landscape';
export type PosterMarginPreset = 'compact' | 'balanced' | 'generous';
export type PosterLanguage = 'en' | 'ar';
export type PosterSceneTheme = 'classic' | 'modern';
export type PosterPhotoShape = 'circle' | 'square' | 'rounded';
export type PosterConnectorStyle = 'subtle' | 'classic' | 'bold';
export type PosterConnectorPathStyle = 'straight' | 'orthogonal' | 'curved';
export type PosterSpacingPreset = 'compact' | 'balanced' | 'airy';
export type PosterDecorationPreset = 'clean' | 'paper-grain' | 'lineage-grid';
export type PosterOrnamentPreset = 'none' | 'lineage-medallion' | 'gallery-marks' | 'corner-branches';
export type PosterTypographyPreset = 'balanced' | 'prominent' | 'compact';
export type PosterFontFamily = 'amiri' | 'noto-sans-arabic' | 'noto-kufi-arabic';
export type PosterCardScalePreset = 'compact' | 'standard' | 'large';
export type PosterCardEffectPreset = 'flat' | 'soft' | 'elevated';
export type PosterCardFramePreset = 'minimal' | 'classic' | 'ornate';
export type PosterCardCornerPreset = 'square' | 'soft' | 'rounded';
export type PosterCardLayoutPreset = 'standard' | 'photo-focused' | 'text-minimal';
export type PosterPageFramePreset = 'none' | 'minimal' | 'heritage' | 'gallery';
export type PosterHeaderPreset = 'ceremonial' | 'gallery-rail' | 'registry';
export type PosterColorPalette =
  | 'heritage-warm'
  | 'gallery-dark'
  | 'evergreen'
  | 'monochrome-print';
export interface PosterColorOverrides {
  readonly background?: string;
  readonly cardBackground?: string;
  readonly accent?: string;
  readonly connector?: string;
}
export type PosterVisualStylePreset =
  | 'classic-heritage'
  | 'modern-gallery'
  | 'dense-genealogy'
  | 'branch-index';

export interface PosterSize {
  readonly width: number;
  readonly height: number;
}

export interface PosterInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface PosterRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PosterDocumentSpec {
  readonly pageSize: PosterPageSize;
  readonly orientation: PosterOrientation;
  readonly marginPreset: PosterMarginPreset;
  readonly physicalSizeMm: PosterSize;
  readonly sceneSize: PosterSize;
  readonly marginsMm: PosterInsets;
  readonly margins: PosterInsets;
}

export interface PosterContentSpec {
  readonly definitionId: string;
  readonly language: PosterLanguage;
  readonly title: string;
  readonly subtitle?: string;
  readonly footerText?: string;
  readonly showJozorAttribution?: boolean;
  readonly scope: 'selected-root-ancestors' | 'selected-root-descendants' | 'full-tree';
  readonly rootPreviewId?: string;
  readonly generationCount: number;
  readonly privacyMode: VisualPreviewPrivacyMode;
  readonly showYears?: boolean;
  readonly showRelationship?: boolean;
  readonly showBirthPlace?: boolean;
  readonly showOccupation?: boolean;
  readonly showDescription?: boolean;
}

export interface PosterLayoutSpec {
  readonly engineId:
    | 'ancestor-tiered'
    | 'descendant-tiered'
    | 'family-network-tiered'
    | 'full-tree-overview'
    | 'branch-index-grid';
  readonly direction: 'vertical' | 'horizontal';
  readonly connectorStyle: PosterConnectorStyle;
  readonly spacingPreset: PosterSpacingPreset;
  readonly treeBounds: PosterRect;
}

export interface PosterCardPreset {
  readonly id:
    | 'classic-heritage'
    | 'modern-gallery'
    | 'dense-genealogy'
    | 'dense-overview'
    | 'branch-index';
  readonly theme: PosterSceneTheme;
  readonly visualStyle: PosterVisualStylePreset | 'dense-overview';
  readonly geometry: {
    readonly minWidth: number;
    readonly maxWidth: number;
    readonly height: number;
    readonly borderRadius: number;
  };
  readonly typography: {
    readonly nameSize: number;
    readonly yearsSize: number;
    readonly statusSize: number;
  };
  readonly photo: {
    readonly shape: PosterPhotoShape;
    readonly preferredDiameter: number;
    readonly borderWidth: number;
    readonly overlapsCard: boolean;
  };
}

export interface PosterSceneNode {
  readonly previewId: string;
  readonly displayName: string;
  readonly generation: number;
  readonly isRoot: boolean;
  readonly isMasked: boolean;
  readonly hasPhoto: boolean;
  readonly birthYear?: number;
  readonly deathYear?: number;
  readonly relationshipHint: VisualPreviewRelationshipHint;
  readonly birthPlaceLabel?: string;
  readonly occupationLabel?: string;
  readonly descriptionLabel?: string;
  readonly initials: string;
  readonly nameFontSize: number;
  readonly rect: PosterRect;
}

export interface PosterSceneConnector {
  readonly fromPreviewId: string;
  readonly toPreviewId: string;
  readonly relationshipType: 'parent-child' | 'spouse' | 'ancestor' | 'descendant' | 'relative';
  readonly start: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
}

export interface PrintQualityReport {
  readonly status: 'not-evaluated' | 'pass' | 'warning' | 'blocked';
  readonly evaluated: boolean;
  readonly warnings: readonly string[];
  readonly metrics: {
    readonly effectiveDpi?: number;
    readonly minimumFontSizePt?: number;
    readonly estimatedMemoryBytes?: number;
    readonly overlappingCardPairs?: number;
    readonly connectorCount?: number;
  };
}

export interface PosterSceneBounds {
  readonly page: PosterRect;
  readonly tree: PosterRect;
  readonly content: PosterRect;
}

export interface PosterScene {
  readonly version: 1;
  readonly colorPalette: PosterColorPalette;
  readonly colorOverrides?: PosterColorOverrides;
  readonly decoration: PosterDecorationPreset;
  readonly ornament: PosterOrnamentPreset;
  readonly typographyPreset: PosterTypographyPreset;
  readonly fontFamily: PosterFontFamily;
  readonly cardScalePreset: PosterCardScalePreset;
  readonly cardEffectPreset: PosterCardEffectPreset;
  readonly cardFramePreset: PosterCardFramePreset;
  readonly cardCornerPreset: PosterCardCornerPreset;
  readonly cardLayoutPreset: PosterCardLayoutPreset;
  readonly pageFramePreset: PosterPageFramePreset;
  readonly headerPreset: PosterHeaderPreset;
  readonly connectorPathStyle: PosterConnectorPathStyle;
  readonly document: PosterDocumentSpec;
  readonly content: PosterContentSpec;
  readonly layout: PosterLayoutSpec;
  readonly cardPreset: PosterCardPreset;
  readonly nodes: readonly PosterSceneNode[];
  readonly connectors: readonly PosterSceneConnector[];
  readonly bounds: PosterSceneBounds;
  readonly quality: PrintQualityReport;
  readonly source: {
    readonly sanitizedNodeCount: number;
    readonly sanitizedEdgeCount: number;
    readonly truncated: boolean;
  };
}

export interface PosterLayoutEngineRequest {
  readonly graph: SanitizedPreviewGraph;
  readonly document: PosterDocumentSpec;
  readonly content: PosterContentSpec;
  readonly layout: PosterLayoutSpec;
  readonly cardPreset: PosterCardPreset;
}

export interface PosterLayoutEngineResult {
  readonly nodes: readonly PosterSceneNode[];
  readonly connectors: readonly PosterSceneConnector[];
  readonly bounds: PosterSceneBounds;
}

export interface PosterLayoutEngine {
  readonly id: PosterLayoutSpec['engineId'];
  readonly createLayout: (request: PosterLayoutEngineRequest) => PosterLayoutEngineResult;
}
