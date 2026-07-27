import { ancestorTieredPosterLayoutEngine } from './ancestorTieredPosterLayout';
import { descendantTieredPosterLayoutEngine } from './descendantTieredPosterLayout';
import { familyNetworkPosterLayoutEngine } from './familyNetworkPosterLayout';
import { fullTreeOverviewPosterLayoutEngine } from './fullTreeOverviewPosterLayout';
import { branchIndexPosterLayoutEngine } from './branchIndexPosterLayout';
import { getPosterRasterScale } from './posterDocumentSpecs';
import { evaluatePosterPrintQuality } from './posterPrintQuality';
import type { SanitizedPreviewGraph } from './previewSanitizerTypes';
import type {
  PosterCardPreset,
  PosterCardScalePreset,
  PosterCardEffectPreset,
  PosterCardFramePreset,
  PosterCardCornerPreset,
  PosterCardLayoutPreset,
  PosterPageFramePreset,
  PosterHeaderPreset,
  PosterConnectorStyle,
  PosterConnectorPathStyle,
  PosterSpacingPreset,
  PosterColorPalette,
  PosterColorOverrides,
  PosterContentSpec,
  PosterDocumentSpec,
  PosterDecorationPreset,
  PosterOrnamentPreset,
  PosterLayoutSpec,
  PosterPhotoShape,
  PosterScene,
  PosterSceneTheme,
  PosterTypographyPreset,
  PosterFontFamily,
  PosterVisualStylePreset,
} from './posterSceneTypes';

export interface CreatePosterSceneRequest {
  readonly graph: SanitizedPreviewGraph;
  readonly document: PosterDocumentSpec;
  readonly content: PosterContentSpec;
  readonly theme?: PosterSceneTheme;
  readonly stylePreset?: PosterVisualStylePreset;
  readonly photoShape?: PosterPhotoShape;
  readonly connectorStyle?: PosterConnectorStyle;
  readonly colorPalette?: PosterColorPalette;
  readonly colorOverrides?: PosterColorOverrides;
  readonly decoration?: PosterDecorationPreset;
  readonly ornament?: PosterOrnamentPreset;
  readonly typographyPreset?: PosterTypographyPreset;
  readonly fontFamily?: PosterFontFamily;
  readonly cardScalePreset?: PosterCardScalePreset;
  readonly cardEffectPreset?: PosterCardEffectPreset;
  readonly cardFramePreset?: PosterCardFramePreset;
  readonly cardCornerPreset?: PosterCardCornerPreset;
  readonly cardLayoutPreset?: PosterCardLayoutPreset;
  readonly pageFramePreset?: PosterPageFramePreset;
  readonly headerPreset?: PosterHeaderPreset;
  readonly direction?: PosterLayoutSpec['direction'];
  readonly connectorPathStyle?: PosterConnectorPathStyle;
  readonly spacingPreset?: PosterSpacingPreset;
}

export function normalizePosterFooterText(value: string): string {
  return value
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
}

function normalizeHexColor(value?: string): string | undefined {
  const trimmed = value?.trim();
  return trimmed && /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : undefined;
}

export function normalizePosterColorOverrides(
  value?: PosterColorOverrides
): PosterColorOverrides | undefined {
  if (!value) return undefined;
  const normalized: PosterColorOverrides = {
    background: normalizeHexColor(value.background),
    cardBackground: normalizeHexColor(value.cardBackground),
    accent: normalizeHexColor(value.accent),
    connector: normalizeHexColor(value.connector),
  };
  return Object.values(normalized).some(Boolean) ? normalized : undefined;
}

function getDefaultPosterColorPalette(stylePreset: PosterVisualStylePreset): PosterColorPalette {
  if (stylePreset === 'modern-gallery') return 'gallery-dark';
  if (stylePreset === 'dense-genealogy' || stylePreset === 'branch-index') return 'evergreen';
  return 'heritage-warm';
}

function getDefaultPosterDecoration(stylePreset: PosterVisualStylePreset): PosterDecorationPreset {
  return stylePreset === 'classic-heritage' ? 'paper-grain' : 'clean';
}

function getDefaultPosterOrnament(stylePreset: PosterVisualStylePreset): PosterOrnamentPreset {
  if (stylePreset === 'classic-heritage') return 'lineage-medallion';
  if (stylePreset === 'modern-gallery') return 'gallery-marks';
  return 'none';
}

function getDefaultPosterCardEffect(stylePreset: PosterVisualStylePreset): PosterCardEffectPreset {
  if (stylePreset === 'modern-gallery') return 'elevated';
  if (stylePreset === 'dense-genealogy' || stylePreset === 'branch-index') return 'flat';
  return 'soft';
}

function getDefaultPosterCardFrame(stylePreset: PosterVisualStylePreset): PosterCardFramePreset {
  return stylePreset === 'classic-heritage' ? 'classic' : 'minimal';
}

function getDefaultPosterCardCorner(stylePreset: PosterVisualStylePreset): PosterCardCornerPreset {
  if (stylePreset === 'modern-gallery') return 'rounded';
  if (stylePreset === 'dense-genealogy') return 'square';
  return 'soft';
}

function getDefaultPosterCardLayout(stylePreset: PosterVisualStylePreset): PosterCardLayoutPreset {
  if (stylePreset === 'modern-gallery') return 'photo-focused';
  if (stylePreset === 'branch-index') return 'text-minimal';
  return 'standard';
}

function getDefaultPosterPageFrame(stylePreset: PosterVisualStylePreset): PosterPageFramePreset {
  if (stylePreset === 'classic-heritage') return 'heritage';
  if (stylePreset === 'modern-gallery') return 'gallery';
  return 'minimal';
}

function getDefaultPosterHeader(stylePreset: PosterVisualStylePreset): PosterHeaderPreset {
  if (stylePreset === 'modern-gallery') return 'gallery-rail';
  if (stylePreset === 'dense-genealogy' || stylePreset === 'branch-index') return 'registry';
  return 'ceremonial';
}

function getDefaultPosterConnectorPath(stylePreset: PosterVisualStylePreset): PosterConnectorPathStyle {
  if (stylePreset === 'modern-gallery') return 'straight';
  if (stylePreset === 'dense-genealogy' || stylePreset === 'branch-index') return 'orthogonal';
  return 'curved';
}

function getDefaultPosterSpacing(stylePreset: PosterVisualStylePreset): PosterSpacingPreset {
  if (stylePreset === 'modern-gallery') return 'airy';
  if (stylePreset === 'dense-genealogy' || stylePreset === 'branch-index') return 'compact';
  return 'balanced';
}

function getDefaultPosterFontFamily(stylePreset: PosterVisualStylePreset): PosterFontFamily {
  return stylePreset === 'classic-heritage' ? 'amiri' : 'noto-sans-arabic';
}

function applyPosterTypographyPreset(
  cardPreset: PosterCardPreset,
  typographyPreset: PosterTypographyPreset
): PosterCardPreset {
  const scale = typographyPreset === 'prominent' ? 1.12 : typographyPreset === 'compact' ? 0.92 : 1;
  if (scale === 1) return cardPreset;
  const scaled = (value: number) => Math.round(value * scale * 10) / 10;
  return {
    ...cardPreset,
    typography: {
      nameSize: scaled(cardPreset.typography.nameSize),
      yearsSize: scaled(cardPreset.typography.yearsSize),
      statusSize: scaled(cardPreset.typography.statusSize),
    },
  };
}

function applyPosterCardScalePreset(
  cardPreset: PosterCardPreset,
  cardScalePreset: PosterCardScalePreset
): PosterCardPreset {
  const scale = cardScalePreset === 'large' ? 1.14 : cardScalePreset === 'compact' ? 0.88 : 1;
  if (scale === 1) return cardPreset;
  const scaled = (value: number) => Math.round(value * scale * 10) / 10;
  return {
    ...cardPreset,
    geometry: {
      ...cardPreset.geometry,
      minWidth: scaled(cardPreset.geometry.minWidth),
      maxWidth: scaled(cardPreset.geometry.maxWidth),
      height: scaled(cardPreset.geometry.height),
      borderRadius: scaled(cardPreset.geometry.borderRadius),
    },
    photo: {
      ...cardPreset.photo,
      preferredDiameter: scaled(cardPreset.photo.preferredDiameter),
      borderWidth: scaled(cardPreset.photo.borderWidth),
    },
  };
}

function applyPosterCardCornerPreset(
  cardPreset: PosterCardPreset,
  cardCornerPreset: PosterCardCornerPreset
): PosterCardPreset {
  const borderRadius = cardCornerPreset === 'square'
    ? 0
    : cardCornerPreset === 'rounded'
      ? Math.min(18, cardPreset.geometry.height * 0.14)
      : Math.min(8, cardPreset.geometry.height * 0.06);
  return {
    ...cardPreset,
    geometry: { ...cardPreset.geometry, borderRadius: Math.round(borderRadius * 10) / 10 },
  };
}

function applyPosterCardLayoutPreset(
  cardPreset: PosterCardPreset,
  cardLayoutPreset: PosterCardLayoutPreset
): PosterCardPreset {
  if (cardPreset.visualStyle === 'dense-overview' || cardPreset.visualStyle === 'branch-index') {
    return cardPreset;
  }
  if (cardLayoutPreset === 'standard') return cardPreset;
  if (cardLayoutPreset === 'text-minimal') {
    return {
      ...cardPreset,
      geometry: {
        ...cardPreset.geometry,
        height: Math.round(cardPreset.geometry.height * 0.78 * 10) / 10,
      },
      photo: {
        ...cardPreset.photo,
        preferredDiameter: 0,
        borderWidth: 0,
        overlapsCard: false,
      },
    };
  }
  return {
    ...cardPreset,
    geometry: {
      ...cardPreset.geometry,
      height: Math.round(cardPreset.geometry.height * 1.14 * 10) / 10,
    },
    photo: {
      ...cardPreset.photo,
      preferredDiameter: Math.round(cardPreset.photo.preferredDiameter * 1.28 * 10) / 10,
      overlapsCard: true,
    },
  };
}

export function createClassicHeritageCardPreset(theme: PosterSceneTheme = 'classic'): PosterCardPreset {
  const visualStyle = theme === 'classic' ? 'classic-heritage' : 'modern-gallery';
  return {
    id: visualStyle,
    theme,
    visualStyle,
    geometry: {
      minWidth: 104,
      maxWidth: 280,
      height: 160,
      borderRadius: 6,
    },
    typography: {
      nameSize: 19,
      yearsSize: 12,
      statusSize: 10,
    },
    photo: {
      shape: 'circle',
      preferredDiameter: 92,
      borderWidth: 4,
      overlapsCard: true,
    },
  };
}

export function createDenseGenealogyCardPreset(): PosterCardPreset {
  return {
    id: 'dense-genealogy',
    theme: 'classic',
    visualStyle: 'dense-genealogy',
    geometry: {
      minWidth: 82,
      maxWidth: 184,
      height: 124,
      borderRadius: 3,
    },
    typography: {
      nameSize: 22,
      yearsSize: 14,
      statusSize: 12,
    },
    photo: {
      shape: 'circle',
      preferredDiameter: 34,
      borderWidth: 2,
      overlapsCard: false,
    },
  };
}

export function createBranchIndexCardPreset(): PosterCardPreset {
  return {
    id: 'branch-index',
    theme: 'classic',
    visualStyle: 'branch-index',
    geometry: {
      minWidth: 260,
      maxWidth: 820,
      height: 260,
      borderRadius: 8,
    },
    typography: {
      nameSize: 32,
      yearsSize: 14,
      statusSize: 12,
    },
    photo: {
      shape: 'circle',
      preferredDiameter: 0,
      borderWidth: 0,
      overlapsCard: false,
    },
  };
}

export function createFullTreeOverviewCardPreset(
  theme: PosterSceneTheme = 'classic'
): PosterCardPreset {
  return {
    id: 'dense-overview',
    theme,
    visualStyle: 'dense-overview',
    geometry: {
      minWidth: 72,
      maxWidth: 132,
      height: 58,
      borderRadius: 4,
    },
    typography: {
      nameSize: 16,
      yearsSize: 11,
      statusSize: 9,
    },
    photo: {
      shape: 'circle',
      preferredDiameter: 0,
      borderWidth: 0,
      overlapsCard: false,
    },
  };
}

function createLayoutSpec(
  document: PosterDocumentSpec,
  direction: PosterLayoutSpec['direction'],
  scope: PosterContentSpec['scope'],
  connectorStyle: PosterConnectorStyle,
  spacingPreset: PosterSpacingPreset
): PosterLayoutSpec {
  const isFullTreeOverview = scope === 'full-tree';
  const headerHeight = isFullTreeOverview
    ? Math.max(120, document.sceneSize.height * 0.05)
    : document.sceneSize.height * 0.12;
  const footerHeight = Math.max(48, document.sceneSize.height * 0.04);
  const sectionGap = isFullTreeOverview
    ? Math.max(20, document.sceneSize.height * 0.012)
    : Math.max(24, document.sceneSize.height * 0.018);
  const x = document.margins.left;
  const y = document.margins.top + headerHeight + sectionGap;
  const width = document.sceneSize.width - document.margins.left - document.margins.right;
  const height = document.sceneSize.height
    - y
    - document.margins.bottom
    - footerHeight
    - sectionGap;

  return {
    engineId: scope === 'full-tree'
      ? 'full-tree-overview'
      : scope === 'selected-root-descendants'
        ? 'descendant-tiered'
        : 'ancestor-tiered',
    direction,
    connectorStyle,
    spacingPreset,
    treeBounds: { x, y, width, height },
  };
}

function assertSanitizedGraph(graph: SanitizedPreviewGraph): void {
  graph.nodes.forEach((node) => {
    if (!node.previewId.startsWith('preview-node-')) {
      throw new Error('PosterScene accepts session-isolated preview IDs only');
    }
  });
}

export function createPosterScene(request: CreatePosterSceneRequest): PosterScene {
  assertSanitizedGraph(request.graph);
  const content: PosterContentSpec = {
    ...request.content,
    footerText: request.content.footerText
      ? normalizePosterFooterText(request.content.footerText) || undefined
      : undefined,
  };
  const stylePreset = request.stylePreset
    ?? (request.theme === 'modern' ? 'modern-gallery' : 'classic-heritage');
  const spacingPreset = request.spacingPreset ?? getDefaultPosterSpacing(stylePreset);
  const baseLayout = createLayoutSpec(
    request.document,
    request.direction ?? 'vertical',
    content.scope,
    request.connectorStyle ?? 'classic',
    spacingPreset
  );
  const colorPalette = request.colorPalette ?? getDefaultPosterColorPalette(stylePreset);
  const colorOverrides = normalizePosterColorOverrides(request.colorOverrides);
  const decoration = request.decoration ?? getDefaultPosterDecoration(stylePreset);
  const ornament = request.ornament ?? getDefaultPosterOrnament(stylePreset);
  const typographyPreset = request.typographyPreset ?? 'balanced';
  const fontFamily = request.fontFamily ?? getDefaultPosterFontFamily(stylePreset);
  const cardScalePreset = request.cardScalePreset ?? 'standard';
  const cardEffectPreset = request.cardEffectPreset ?? getDefaultPosterCardEffect(stylePreset);
  const cardFramePreset = request.cardFramePreset ?? getDefaultPosterCardFrame(stylePreset);
  const cardCornerPreset = request.cardCornerPreset ?? getDefaultPosterCardCorner(stylePreset);
  const cardLayoutPreset = request.cardLayoutPreset ?? getDefaultPosterCardLayout(stylePreset);
  const pageFramePreset = request.pageFramePreset ?? getDefaultPosterPageFrame(stylePreset);
  const headerPreset = request.headerPreset ?? getDefaultPosterHeader(stylePreset);
  const connectorPathStyle = request.connectorPathStyle ?? getDefaultPosterConnectorPath(stylePreset);
  const layout: PosterLayoutSpec = stylePreset === 'branch-index'
    ? { ...baseLayout, engineId: 'branch-index-grid', direction: 'vertical' }
    : baseLayout;
  const theme: PosterSceneTheme = stylePreset === 'modern-gallery' ? 'modern' : 'classic';
  const baseCardPreset = content.scope === 'full-tree'
    ? createFullTreeOverviewCardPreset(theme)
    : stylePreset === 'branch-index'
      ? createBranchIndexCardPreset()
    : stylePreset === 'dense-genealogy'
      ? createDenseGenealogyCardPreset()
      : createClassicHeritageCardPreset(theme);
  const shapedCardPreset = request.photoShape && baseCardPreset.photo.preferredDiameter > 0
    ? {
        ...baseCardPreset,
        photo: { ...baseCardPreset.photo, shape: request.photoShape },
      }
    : baseCardPreset;
  const contentLayoutCardPreset = applyPosterCardLayoutPreset(shapedCardPreset, cardLayoutPreset);
  const scaledCardPreset = applyPosterCardScalePreset(contentLayoutCardPreset, cardScalePreset);
  const corneredCardPreset = applyPosterCardCornerPreset(scaledCardPreset, cardCornerPreset);
  const cardPreset = applyPosterTypographyPreset(corneredCardPreset, typographyPreset);
  const layoutEngine = layout.engineId === 'branch-index-grid'
    ? branchIndexPosterLayoutEngine
    : layout.engineId === 'full-tree-overview'
    ? fullTreeOverviewPosterLayoutEngine
    : layout.engineId === 'family-network-tiered'
      ? familyNetworkPosterLayoutEngine
    : layout.engineId === 'descendant-tiered'
      ? descendantTieredPosterLayoutEngine
      : ancestorTieredPosterLayoutEngine;
  const geometry = layoutEngine.createLayout({
    graph: request.graph,
    document: request.document,
    content,
    layout,
    cardPreset,
  });
  const quality = evaluatePosterPrintQuality({
    document: request.document,
    nodes: geometry.nodes,
    connectors: geometry.connectors,
    layoutEngineId: layout.engineId,
    truncated: request.graph.metadata.truncated,
    rasterScale: getPosterRasterScale(request.document.pageSize),
  });

  return {
    version: 1,
    colorPalette,
    colorOverrides,
    decoration,
    ornament,
    typographyPreset,
    fontFamily,
    cardScalePreset,
    cardEffectPreset,
    cardFramePreset,
    cardCornerPreset,
    cardLayoutPreset,
    pageFramePreset,
    headerPreset,
    connectorPathStyle,
    document: request.document,
    content,
    layout,
    cardPreset,
    ...geometry,
    quality,
    source: {
      sanitizedNodeCount: request.graph.nodes.length,
      sanitizedEdgeCount: request.graph.edges.length,
      truncated: request.graph.metadata.truncated,
    },
  };
}
