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
  PosterContentSpec,
  PosterFocusLayoutOptions,
  PosterRadialLayoutOptions,
  PosterProductMode,
  PosterTreeScope,
  PosterPaperSize,
  PosterPageOrientation,
  PosterTreeDirection,
  PosterPrivacyMode,
  PosterTiledSheetSize,
} from '../../../publishing';

export type VisualStudioPosterScope = Extract<PosterTreeScope, 'ancestors' | 'descendants' | 'selected-branch' | 'full-tree'>;

export interface BaseStudioPosterOptions {
  readonly scope: VisualStudioPosterScope;
  readonly generationDepth: 1 | 2 | 3 | 4 | 'all';
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
  readonly footerText: string;
  readonly showJozorAttribution: boolean;
  readonly productMode: PosterProductMode;
  readonly tiledRows: number;
  readonly tiledColumns: number;
  readonly tiledSheetSize: PosterTiledSheetSize;
  readonly tiledOverlapMm: number;
  readonly branchCollectionIndexTitle: string;
}

export interface TieredPosterOptions extends BaseStudioPosterOptions {
  readonly engineId?: 'ancestor-tiered' | 'descendant-tiered' | 'full-tree-overview' | 'branch-index-grid';
  readonly content?: PosterContentSpec;
}

export interface FocusPosterOptions extends BaseStudioPosterOptions {
  readonly engineId: 'focus-family';
  readonly content: PosterContentSpec & { readonly scope: 'selected-root-focus' };
  readonly focusOptions: PosterFocusLayoutOptions;
}

export interface RadialPosterOptions extends BaseStudioPosterOptions {
  readonly engineId: 'radial-generations';
  readonly content: PosterContentSpec;
  readonly radialOptions: PosterRadialLayoutOptions;
}

export type VisualStudioPosterOptions = TieredPosterOptions | FocusPosterOptions | RadialPosterOptions;

export interface VisualStudioPosterRootOption {
  readonly token: string;
  readonly label: string;
}

export function getVisualStudioPosterNodeLimit(depth: 1 | 2 | 3 | 4 | 'all', scope: PosterTreeScope): number {
  if (scope === 'full-tree') return 500;
  if (depth === 'all') return 200;
  if (depth === 1) return 5;
  if (depth === 2) return 15;
  if (depth === 3) return 35;
  return 80;
}
