import {
  createPosterScene,
  FocusLayoutCapacityError,
  normalizePosterFooterText,
  RadialLayoutCapacityError,
  type FocusSelectionBoundaryResult,
  type PosterDesignState,
  type PosterDocumentSpec,
  type PosterScene,
  type PosterVisualStylePreset,
  type RadialSelectionBoundaryResult,
  type SanitizedPreviewGraph,
} from '../../../publishing';
import type { VisualStudioPosterOptions } from './visualStudioPosterOptions';

interface SelectionEvaluation<TSelection, TError extends Error> {
  readonly selection?: TSelection;
  readonly error?: TError;
}

export interface VisualStudioPosterSceneEvaluationRequest {
  readonly language: 'ar' | 'en';
  readonly designState: PosterDesignState;
  readonly posterOptions?: VisualStudioPosterOptions;
  readonly document?: PosterDocumentSpec;
  readonly previewGraph?: SanitizedPreviewGraph;
  readonly focusSelection?: SelectionEvaluation<FocusSelectionBoundaryResult, FocusLayoutCapacityError>;
  readonly radialSelection?: SelectionEvaluation<RadialSelectionBoundaryResult, RadialLayoutCapacityError>;
  readonly selectedDefinitionId: string;
  readonly posterTitle: string;
  readonly posterSubtitle: string;
  readonly stylePreset: PosterVisualStylePreset;
}

export interface VisualStudioPosterSceneEvaluation {
  readonly scene?: PosterScene;
  readonly capacityError?: FocusLayoutCapacityError | RadialLayoutCapacityError;
}

export function isFocusCapacityError(error: unknown): boolean {
  if (error instanceof FocusLayoutCapacityError) return true;
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === 'FOCUS_LAYOUT_CAPACITY_EXCEEDED'
    || (typeof candidate.message === 'string'
      && candidate.message.startsWith('Focus layout capacity exceeded:'));
}

export function isRadialCapacityError(error: unknown): boolean {
  if (error instanceof RadialLayoutCapacityError) return true;
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: unknown; message?: unknown };
  return candidate.code === 'RADIAL_LAYOUT_CAPACITY_EXCEEDED'
    || (typeof candidate.message === 'string'
      && candidate.message.startsWith('Radial layout capacity exceeded:'));
}

const getVisibleGenerationCount = (graph: SanitizedPreviewGraph): number => Math.max(
  1,
  ...graph.nodes.map((node) => node.generation ?? 1)
);

const getExplicitPresetValue = <T extends string>(
  value: T | undefined
): Exclude<T, 'style-default'> | undefined => (
  value && value !== 'style-default'
    ? value as Exclude<T, 'style-default'>
    : undefined
);

function getSceneAppearance(
  designState: PosterDesignState,
  stylePreset: PosterVisualStylePreset
) {
  return {
    stylePreset,
    photoShape: designState.shared.photoShape,
    connectorStyle: designState.shared.connectorStyle,
    connectorPathStyle: getExplicitPresetValue(designState.shared.connectorPath),
    colorPalette: getExplicitPresetValue(designState.shared.colorPalette),
    colorOverrides: designState.shared.colorOverrides,
    decoration: getExplicitPresetValue(designState.shared.decoration),
    ornament: getExplicitPresetValue(designState.shared.ornament),
    typographyPreset: designState.shared.typography,
    fontFamily: getExplicitPresetValue(designState.shared.fontFamily),
    cardScalePreset: designState.shared.cardScale,
    cardEffectPreset: getExplicitPresetValue(designState.shared.cardEffect),
    cardFramePreset: getExplicitPresetValue(designState.shared.cardFrame),
    cardCornerPreset: getExplicitPresetValue(designState.shared.cardCorner),
    cardLayoutPreset: getExplicitPresetValue(designState.shared.cardLayout),
    pageFramePreset: getExplicitPresetValue(designState.shared.pageFrame),
    headerPreset: getExplicitPresetValue(designState.shared.header),
    spacingPreset: getExplicitPresetValue(designState.shared.spacing),
    direction: designState.shared.direction,
  };
}

export function evaluateVisualStudioPosterScene(
  request: VisualStudioPosterSceneEvaluationRequest
): VisualStudioPosterSceneEvaluation {
  const {
    language,
    designState,
    posterOptions,
    document,
    previewGraph,
    focusSelection,
    radialSelection,
    selectedDefinitionId,
    posterTitle,
    posterSubtitle,
    stylePreset,
  } = request;

  if (designState.layoutMode === 'radial-generations' && radialSelection?.error) {
    return { capacityError: radialSelection.error };
  }
  if (designState.layoutMode === 'focus-family' && focusSelection?.error) {
    return { capacityError: focusSelection.error };
  }
  if (!posterOptions || !document || !previewGraph) return {};

  const appearance = getSceneAppearance(designState, stylePreset);

  if (posterOptions.engineId === 'radial-generations' && radialSelection?.selection) {
    try {
      const radialGraph = radialSelection.selection.sanitizedGraph;
      return {
        scene: createPosterScene({
          graph: radialGraph,
          document,
          content: {
            ...posterOptions.content,
            generationCount: getVisibleGenerationCount(radialGraph),
          },
          engineId: 'radial-generations',
          radialOptions: posterOptions.radialOptions,
          ...appearance,
        }),
      };
    } catch (error) {
      if (!isRadialCapacityError(error)) throw error;
      return {
        capacityError: error instanceof RadialLayoutCapacityError
          ? error
          : new RadialLayoutCapacityError('Exceeded radial capacity.'),
      };
    }
  }

  if (posterOptions.engineId === 'focus-family' && focusSelection?.selection) {
    try {
      const focusGraph = focusSelection.selection.sanitizedGraph;
      return {
        scene: createPosterScene({
          graph: focusGraph,
          document,
          content: {
            ...posterOptions.content,
            scope: 'selected-root-focus',
            generationCount: getVisibleGenerationCount(focusGraph),
          },
          engineId: 'focus-family',
          focusOptions: posterOptions.focusOptions,
          ...appearance,
        }),
      };
    } catch (error) {
      if (!isFocusCapacityError(error)) throw error;
      return {
        capacityError: error instanceof FocusLayoutCapacityError
          ? error
          : new FocusLayoutCapacityError('Exceeded focus capacity.'),
      };
    }
  }

  return {
    scene: createPosterScene({
      graph: previewGraph,
      document,
      content: {
        definitionId: selectedDefinitionId,
        language,
        generationCount: getVisibleGenerationCount(previewGraph),
        privacyMode: designState.shared.privacyMode,
        title: posterTitle,
        subtitle: posterSubtitle,
        footerText: normalizePosterFooterText(designState.shared.footerText || ''),
        showJozorAttribution: designState.shared.showJozorAttribution,
        scope: designState.scope === 'ancestors'
          ? 'selected-root-ancestors'
          : designState.scope === 'descendants'
            ? 'selected-root-descendants'
            : designState.scope === 'selected-branch'
              ? 'selected-branch'
              : 'full-tree',
        showYears: designState.shared.showYears,
        showRelationship: designState.shared.showRelationship,
        showBirthPlace: designState.shared.showBirthPlace,
        showOccupation: designState.shared.showOccupation,
        showDescription: designState.shared.showDescription,
      },
      ...appearance,
    }),
  };
}
