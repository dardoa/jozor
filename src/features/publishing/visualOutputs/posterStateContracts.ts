import type {
  PosterPhotoShape,
  PosterMarginPreset,
  PosterConnectorStyle,
  PosterConnectorPathStyle,
  PosterSpacingPreset,
  PosterDecorationPreset,
  PosterOrnamentPreset,
  PosterTypographyPreset,
  PosterCardScalePreset,
  PosterCardEffectPreset,
  PosterCardFramePreset,
  PosterCardCornerPreset,
  PosterCardLayoutPreset,
  PosterPageFramePreset,
  PosterHeaderPreset,
  PosterColorPalette,
  PosterColorOverrides,
  PosterFontFamily,
} from './posterSceneTypes';

import type { VisualPreviewPrivacyMode } from './previewAdapterTypes';

/**
 * Phase 1A Product Modes supported by Visual Publishing Studio IA.
 */
export type PosterProductMode =
  | 'detailed-poster'
  | 'full-tree-overview'
  | 'branch-collection'
  | 'tiled-wall';

/**
 * Phase 1A Layout Modes supported by Visual Publishing Studio IA.
 */
export type PosterLayoutMode =
  | 'tiered'
  | 'focus-family'
  | 'radial-generations';

/**
 * Phase 1A Tree Scopes supported by Visual Publishing Studio IA.
 */
export type PosterTreeScope =
  | 'full-tree'
  | 'ancestors'
  | 'descendants'
  | 'selected-branch';

export type PosterPaperSize = 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
export type PosterPageOrientation = 'portrait' | 'landscape';
export type PosterTreeDirection = 'vertical' | 'horizontal';
export type PosterPrivacyMode = Extract<VisualPreviewPrivacyMode, 'masked' | 'owner-full'>;
export type PosterTiledSheetSize = 'A4' | 'A3' | 'A2';

/**
 * Shared settings across all layout modes and product modes.
 */
export interface SharedPosterSettings {
  readonly size: PosterPaperSize;
  readonly orientation: PosterPageOrientation;
  readonly marginPreset: PosterMarginPreset;
  readonly direction: PosterTreeDirection;
  readonly privacyMode: PosterPrivacyMode;
  readonly includePhotos: boolean;
  readonly hideLivingPhotos: boolean;
  readonly photoShape: PosterPhotoShape;
  readonly showYears: boolean;
  readonly showRelationship: boolean;
  readonly showBirthPlace: boolean;
  readonly showOccupation: boolean;
  readonly showDescription: boolean;
  readonly connectorStyle: PosterConnectorStyle;
  readonly connectorPath: 'style-default' | PosterConnectorPathStyle;
  readonly spacing: 'style-default' | PosterSpacingPreset;
  readonly footerText: string;
  readonly showJozorAttribution: boolean;
  readonly colorPalette: 'style-default' | PosterColorPalette;
  readonly colorOverrides?: PosterColorOverrides;
  readonly decoration: 'style-default' | PosterDecorationPreset;
  readonly ornament: 'style-default' | PosterOrnamentPreset;
  readonly typography: PosterTypographyPreset;
  readonly fontFamily: 'style-default' | PosterFontFamily;
  readonly cardScale: PosterCardScalePreset;
  readonly cardEffect: 'style-default' | PosterCardEffectPreset;
  readonly cardFrame: 'style-default' | PosterCardFramePreset;
  readonly cardCorner: 'style-default' | PosterCardCornerPreset;
  readonly cardLayout: 'style-default' | PosterCardLayoutPreset;
  readonly pageFrame: 'style-default' | PosterPageFramePreset;
  readonly header: 'style-default' | PosterHeaderPreset;
  /** Session-safe token representing the selected root person (no raw database IDs) */
  readonly selectedPosterRootToken: string;
}

/**
 * Settings bucket specific to Tiered Poster layout engine.
 */
export interface TieredSettingsBucket {
  readonly generationDepth: 1 | 2 | 3 | 4 | 'all';
}

/**
 * Settings bucket specific to Focus Family layout engine ("حول شخص").
 */
export interface FocusSettingsBucket {
  readonly focalPersonToken: string;
  readonly ancestorDepth: 1 | 2 | 3 | 4 | 'all';
  readonly descendantDepth: 1 | 2 | 3 | 4 | 'all';
  readonly includeSpouses: boolean;
  readonly includeSiblings: boolean;
  readonly focalCardEmphasis: 'standard' | 'bolder-border' | 'glowing';
}

/**
 * Settings bucket specific to Radial Generations layout engine ("دائري / مروحي").
 */
export interface RadialSettingsBucket {
  readonly radialSpan: '360-full-circle' | '180-half-fan';
  readonly generationRings: 3 | 4 | 5 | 6;
  readonly ringSpacing: 'compact' | 'balanced' | 'spacious';
  readonly centerCardScale: 'compact' | 'standard' | 'large';
  readonly labelOrientation: 'straight-unwarped' | 'curved';
}

/**
 * Settings bucket specific to Product Modes (e.g. Tiled Wall, Branch Collection).
 */
export interface ProductModeSettingsBucket {
  readonly tiledRows: number;
  readonly tiledColumns: number;
  readonly tiledSheetSize: PosterTiledSheetSize;
  readonly tiledOverlapMm: number;
  readonly branchCollectionIndexTitle: string;
}

/**
 * Master Poster Design State contract encapsulating layout mode, scope, preset, and mode buckets.
 */
export interface PosterDesignState {
  readonly productMode: PosterProductMode;
  readonly layoutMode: PosterLayoutMode;
  readonly scope: PosterTreeScope;
  readonly activePresetId: string;
  readonly shared: SharedPosterSettings;
  readonly tiered: TieredSettingsBucket;
  readonly focus: FocusSettingsBucket;
  readonly radial: RadialSettingsBucket;
  readonly productBucket: ProductModeSettingsBucket;
}

/**
 * System Preset Definition contract.
 */
export interface PosterPresetDefinition {
  readonly id: string;
  readonly displayName: {
    readonly en: string;
    readonly ar: string;
  };
  readonly description: {
    readonly en: string;
    readonly ar: string;
  };
  readonly baselineSettings: Partial<SharedPosterSettings>;
}
