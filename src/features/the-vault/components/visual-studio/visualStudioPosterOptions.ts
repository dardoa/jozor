import {
  createPosterDocumentSpec,
  type StudioPosterPageSize,
  type PosterPhotoShape,
  type PosterMarginPreset,
  type PosterConnectorStyle,
  type PosterConnectorPathStyle,
  type PosterSpacingPreset,
  type PosterDecorationPreset,
  type PosterOrnamentPreset,
  type PosterTypographyPreset,
  type PosterCardScalePreset,
  type PosterCardEffectPreset,
  type PosterCardFramePreset,
  type PosterCardCornerPreset,
  type PosterCardLayoutPreset,
  type PosterPageFramePreset,
  type PosterHeaderPreset,
  type PosterColorPalette,
  type PosterColorOverrides,
  type PosterFontFamily,
  type VisualPreviewPrivacyMode,
} from '../../../publishing';

export type VisualStudioPosterDepth = 1 | 2 | 3 | 4 | 'all';
export type VisualStudioPosterSize = 'A4' | 'A3' | 'A2' | 'A1' | 'A0';
export type VisualStudioPosterOrientation = 'portrait' | 'landscape';
export type VisualStudioPosterMargin = PosterMarginPreset;
export type VisualStudioPosterDirection = 'vertical' | 'horizontal';
export type VisualStudioPosterScope = 'ancestors' | 'descendants' | 'full-tree';
export type VisualStudioPosterPrivacyMode = Extract<VisualPreviewPrivacyMode, 'masked' | 'owner-full'>;
export type VisualStudioTiledSheetSize = 'A4' | 'A3' | 'A2';
export type VisualStudioPosterPalette = 'style-default' | PosterColorPalette;
export type VisualStudioPosterDecoration = 'style-default' | PosterDecorationPreset;
export type VisualStudioPosterOrnament = 'style-default' | PosterOrnamentPreset;
export type VisualStudioPosterTypography = PosterTypographyPreset;
export type VisualStudioPosterFontFamily = 'style-default' | PosterFontFamily;
export type VisualStudioPosterCardScale = PosterCardScalePreset;
export type VisualStudioPosterCardEffect = 'style-default' | PosterCardEffectPreset;
export type VisualStudioPosterCardFrame = 'style-default' | PosterCardFramePreset;
export type VisualStudioPosterCardCorner = 'style-default' | PosterCardCornerPreset;
export type VisualStudioPosterCardLayout = 'style-default' | PosterCardLayoutPreset;
export type VisualStudioPosterPageFrame = 'style-default' | PosterPageFramePreset;
export type VisualStudioPosterHeader = 'style-default' | PosterHeaderPreset;
export type VisualStudioPosterConnectorPath = 'style-default' | PosterConnectorPathStyle;
export type VisualStudioPosterSpacing = 'style-default' | PosterSpacingPreset;

const VISUAL_STUDIO_PALETTE_COLORS: Record<PosterColorPalette, Required<PosterColorOverrides>> = {
  'heritage-warm': {
    background: '#f4ead8', cardBackground: '#fffaf0', accent: '#a86f35', connector: '#8d6d4e',
  },
  'gallery-dark': {
    background: '#151918', cardBackground: '#202622', accent: '#d8a85f', connector: '#86a69d',
  },
  evergreen: {
    background: '#edf1ec', cardBackground: '#f8faf7', accent: '#527b64', connector: '#698879',
  },
  'monochrome-print': {
    background: '#f7f7f5', cardBackground: '#ffffff', accent: '#111111', connector: '#666666',
  },
};

export interface VisualStudioPosterOptions {
  readonly generationDepth: VisualStudioPosterDepth;
  readonly scope: VisualStudioPosterScope;
  readonly size: VisualStudioPosterSize;
  readonly orientation: VisualStudioPosterOrientation;
  readonly marginPreset: VisualStudioPosterMargin;
  readonly direction: VisualStudioPosterDirection;
  readonly privacyMode: VisualStudioPosterPrivacyMode;
  readonly includePhotos: boolean;
  readonly hideLivingPhotos: boolean;
  readonly photoShape: PosterPhotoShape;
  readonly showYears: boolean;
  readonly showRelationship: boolean;
  readonly showBirthPlace: boolean;
  readonly showOccupation: boolean;
  readonly showDescription: boolean;
  readonly connectorStyle: PosterConnectorStyle;
  readonly connectorPath: VisualStudioPosterConnectorPath;
  readonly spacing: VisualStudioPosterSpacing;
  readonly footerText: string;
  readonly showJozorAttribution: boolean;
  readonly colorPalette: VisualStudioPosterPalette;
  readonly colorOverrides?: PosterColorOverrides;
  readonly decoration: VisualStudioPosterDecoration;
  readonly ornament: VisualStudioPosterOrnament;
  readonly typography: VisualStudioPosterTypography;
  readonly fontFamily: VisualStudioPosterFontFamily;
  readonly cardScale: VisualStudioPosterCardScale;
  readonly cardEffect: VisualStudioPosterCardEffect;
  readonly cardFrame: VisualStudioPosterCardFrame;
  readonly cardCorner: VisualStudioPosterCardCorner;
  readonly cardLayout: VisualStudioPosterCardLayout;
  readonly pageFrame: VisualStudioPosterPageFrame;
  readonly header: VisualStudioPosterHeader;
  readonly tiledRows: number;
  readonly tiledColumns: number;
  readonly tiledSheetSize: VisualStudioTiledSheetSize;
  readonly tiledOverlapMm: number;
  readonly productMode?: 'detailed-poster' | 'full-tree-overview' | 'branch-collection' | 'tiled-wall';
  readonly branchCollectionIndexTitle?: string;
}

export interface VisualStudioPosterRootOption {
  readonly token: string;
  readonly label: string;
}

export const DEFAULT_VISUAL_STUDIO_POSTER_OPTIONS: VisualStudioPosterOptions = {
  generationDepth: 4,
  scope: 'ancestors',
  size: 'A3',
  orientation: 'landscape',
  marginPreset: 'balanced',
  direction: 'horizontal',
  privacyMode: 'masked',
  includePhotos: true,
  hideLivingPhotos: true,
  photoShape: 'circle',
  showYears: true,
  showRelationship: false,
  showBirthPlace: false,
  showOccupation: false,
  showDescription: false,
  connectorStyle: 'classic',
  connectorPath: 'style-default',
  spacing: 'style-default',
  footerText: '',
  showJozorAttribution: true,
  colorPalette: 'style-default',
  colorOverrides: undefined,
  decoration: 'style-default',
  ornament: 'style-default',
  typography: 'balanced',
  fontFamily: 'style-default',
  cardScale: 'standard',
  cardEffect: 'style-default',
  cardFrame: 'style-default',
  cardCorner: 'style-default',
  cardLayout: 'style-default',
  pageFrame: 'style-default',
  header: 'style-default',
  tiledRows: 3,
  tiledColumns: 3,
  tiledSheetSize: 'A3',
  tiledOverlapMm: 8,
};

export function getVisualStudioPosterColorDefaults(
  palette: VisualStudioPosterPalette,
  selectedDefinitionId?: string
): Required<PosterColorOverrides> {
  const resolvedPalette: PosterColorPalette = palette === 'style-default'
    ? selectedDefinitionId === 'modern-ancestor-poster'
      ? 'gallery-dark'
      : selectedDefinitionId === 'dense-genealogy-poster'
        ? 'evergreen'
        : 'heritage-warm'
    : palette;
  return VISUAL_STUDIO_PALETTE_COLORS[resolvedPalette];
}

export function getVisualStudioPosterNodeLimit(
  depth: VisualStudioPosterDepth,
  scope: VisualStudioPosterScope = 'ancestors'
): number {
  if (scope === 'full-tree') return 127;
  if (depth === 'all') return 127;
  return (2 ** depth) - 1;
}

export function getVisualStudioPosterPageSize(
  size: VisualStudioPosterSize,
  orientation: VisualStudioPosterOrientation
): StudioPosterPageSize {
  return createPosterDocumentSpec(size, orientation).sceneSize;
}

export function getVisualStudioPosterPhysicalPageSizeMm(
  size: VisualStudioPosterSize,
  orientation: VisualStudioPosterOrientation
): StudioPosterPageSize {
  return createPosterDocumentSpec(size, orientation).physicalSizeMm;
}
