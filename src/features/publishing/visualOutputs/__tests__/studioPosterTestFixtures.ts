import type { VisualPreviewModel } from '../previewAdapterTypes';
import { createPosterDocumentSpec } from '../posterDocumentSpecs';
import { createPosterScene } from '../posterSceneBuilder';
import type {
  PosterLanguage,
  PosterMarginPreset,
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
  PosterDecorationPreset,
  PosterOrnamentPreset,
  PosterOrientation,
  PosterPageSize,
  PosterPhotoShape,
  PosterScene,
  PosterSceneTheme,
  PosterTypographyPreset,
  PosterFontFamily,
  PosterLayoutSpec,
  PosterVisualStylePreset,
} from '../posterSceneTypes';
import type { SanitizedPreviewGraph } from '../previewSanitizerTypes';

interface CreateTestPosterSceneOptions {
  readonly model: VisualPreviewModel;
  readonly language: PosterLanguage;
  readonly title: string;
  readonly subtitle?: string;
  readonly theme?: PosterSceneTheme;
  readonly pageSize?: PosterPageSize;
  readonly orientation?: PosterOrientation;
  readonly marginPreset?: PosterMarginPreset;
  readonly generationCount?: 1 | 2 | 3 | 4;
  readonly direction?: PosterLayoutSpec['direction'];
  readonly stylePreset?: PosterVisualStylePreset;
  readonly photoShape?: PosterPhotoShape;
  readonly connectorStyle?: PosterConnectorStyle;
  readonly connectorPathStyle?: PosterConnectorPathStyle;
  readonly spacingPreset?: PosterSpacingPreset;
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
}

function graphFromModel(model: VisualPreviewModel, language: PosterLanguage): SanitizedPreviewGraph {
  const previewIdByModelId = new Map(
    model.nodes.map((node, index) => [
      node.id,
      node.id.startsWith('preview-node-') ? node.id : `preview-node-${index + 1}`,
    ])
  );

  return {
    nodes: model.nodes.map((node) => ({
      previewId: previewIdByModelId.get(node.id)!,
      displayName: node.displayName,
      generation: node.generation,
      relationshipHint: (node.generation ?? 1) === 1 ? 'root' : 'ancestor',
      lifeStatus: node.deathYear ? 'deceased' : 'unknown',
      isMasked: node.isMasked ?? false,
      hasPhoto: node.hasPhoto ?? false,
      birthYear: node.birthYear,
      deathYear: node.deathYear,
    })),
    edges: model.edges.map((edge) => ({
      fromPreviewId: previewIdByModelId.get(edge.fromId) ?? edge.fromId,
      toPreviewId: previewIdByModelId.get(edge.toId) ?? edge.toId,
      relationshipType: edge.relationshipType ?? 'relative',
    })),
    warnings: model.warnings,
    metadata: {
      truncated: model.metadata.truncated,
      sanitizedNodeCount: model.nodes.length,
      policy: {
        privacyMode: model.privacyMode,
        includePhotos: model.nodes.some((node) => node.hasPhoto),
        includeYears: true,
        maxNodes: model.nodes.length,
        language,
      },
    },
  };
}

export function createTestPosterScene(options: CreateTestPosterSceneOptions): PosterScene {
  const maxGeneration = Math.max(1, ...options.model.nodes.map((node) => node.generation ?? 1));
  const generationCount = options.generationCount
    ?? Math.min(4, maxGeneration) as 1 | 2 | 3 | 4;
  const graph = graphFromModel(options.model, options.language);

  return createPosterScene({
    graph,
    document: createPosterDocumentSpec(
      options.pageSize ?? 'A4',
      options.orientation ?? 'portrait',
      options.marginPreset
    ),
    content: {
      definitionId: options.model.definitionId,
      language: options.language,
      title: options.title,
      subtitle: options.subtitle,
      scope: 'selected-root-ancestors',
      rootPreviewId: graph.nodes.find((node) => node.relationshipHint === 'root')?.previewId,
      generationCount,
      privacyMode: options.model.privacyMode,
    },
    theme: options.theme,
    stylePreset: options.stylePreset,
    photoShape: options.photoShape,
    connectorStyle: options.connectorStyle,
    connectorPathStyle: options.connectorPathStyle,
    spacingPreset: options.spacingPreset,
    colorPalette: options.colorPalette,
    colorOverrides: options.colorOverrides,
    decoration: options.decoration,
    ornament: options.ornament,
    typographyPreset: options.typographyPreset,
    fontFamily: options.fontFamily,
    cardScalePreset: options.cardScalePreset,
    cardEffectPreset: options.cardEffectPreset,
    cardFramePreset: options.cardFramePreset,
    cardCornerPreset: options.cardCornerPreset,
    cardLayoutPreset: options.cardLayoutPreset,
    pageFramePreset: options.pageFramePreset,
    headerPreset: options.headerPreset,
    direction: options.direction,
  });
}
