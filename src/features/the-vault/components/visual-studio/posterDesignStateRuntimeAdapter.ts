import type {
  PosterDesignState,
  PosterCombinationCapability,
} from '../../../publishing';
import { getPosterLayoutCombinationCapability } from '../../../publishing';
import type { VisualStudioPosterOptions, VisualStudioPosterScope } from './visualStudioPosterOptions';
import type { PosterContentSpec, PosterFocusLayoutOptions, PosterRadialLayoutOptions } from '../../../publishing/visualOutputs/posterSceneTypes';

export interface PosterRuntimeContext {
  readonly focalPreviewId?: string;
  readonly definitionId?: string;
  readonly language?: 'en' | 'ar';
  readonly title?: string;
  readonly subtitle?: string;
}

export interface VisualStudioPosterOptionsMappingResult {
  readonly supported: boolean;
  readonly capability: PosterCombinationCapability;
  readonly reason?: string;
  readonly posterOptions?: VisualStudioPosterOptions;
}

/**
 * Pure runtime adapter that maps PosterDesignState + explicit PosterRuntimeContext into
 * the discriminated VisualStudioPosterOptions union (TieredPosterOptions | FocusPosterOptions).
 */
export function mapPosterDesignStateToRuntimeOptions(
  state: PosterDesignState,
  context?: PosterRuntimeContext
): VisualStudioPosterOptionsMappingResult {
  const capability = getPosterLayoutCombinationCapability(state.productMode, state.layoutMode, state.scope);

  // Rejects unsupported combinations
  if (!capability.isRuntimeSupported) {
    const language = context?.language ?? 'en';
    return {
      supported: false,
      capability,
      reason: capability.description[language] || (
        language === 'ar'
          ? 'تركيبة المخرج والتخطيط المحددة غير مدعومة حاليًا.'
          : 'Selected layout combination is not supported by the current runtime.'
      ),
    };
  }

  const baseOptions = {
    scope: (state.scope === 'around-person' ? 'ancestors' : state.scope) as VisualStudioPosterScope,
    generationDepth: state.tiered.generationDepth,
    size: state.shared.size,
    orientation: state.shared.orientation,
    marginPreset: state.shared.marginPreset,
    direction: state.shared.direction,
    privacyMode: state.shared.privacyMode,
    includePhotos: state.shared.includePhotos,
    hideLivingPhotos: state.shared.hideLivingPhotos,
    photoShape: state.shared.photoShape,
    showYears: state.shared.showYears,
    showRelationship: state.shared.showRelationship,
    showBirthPlace: state.shared.showBirthPlace,
    showOccupation: state.shared.showOccupation,
    showDescription: state.shared.showDescription,
    connectorStyle: state.shared.connectorStyle,
    connectorPath: state.shared.connectorPath,
    spacing: state.shared.spacing,
    colorPalette: state.shared.colorPalette,
    colorOverrides: state.shared.colorOverrides,
    decoration: state.shared.decoration,
    ornament: state.shared.ornament,
    typography: state.shared.typography,
    fontFamily: state.shared.fontFamily,
    cardScale: state.shared.cardScale,
    cardEffect: state.shared.cardEffect,
    cardFrame: state.shared.cardFrame,
    cardCorner: state.shared.cardCorner,
    cardLayout: state.shared.cardLayout,
    pageFrame: state.shared.pageFrame,
    header: state.shared.header,
    footerText: state.shared.footerText ?? '',
    showJozorAttribution: state.shared.showJozorAttribution ?? true,
    productMode: state.productMode,
    tiledRows: state.productBucket.tiledRows,
    tiledColumns: state.productBucket.tiledColumns,
    tiledSheetSize: state.productBucket.tiledSheetSize,
    tiledOverlapMm: state.productBucket.tiledOverlapMm,
    branchCollectionIndexTitle: state.productBucket.branchCollectionIndexTitle,
  };

  // Focus Family layout mode
  if (state.layoutMode === 'focus-family') {
    if (!context?.focalPreviewId) {
      return {
        supported: false,
        capability,
        reason: 'Missing or unresolvable focal person selection.',
      };
    }

    const focusOptions: PosterFocusLayoutOptions = {
      focalPreviewId: context.focalPreviewId,
      ancestorDepth: state.focus.ancestorDepth,
      descendantDepth: state.focus.descendantDepth,
      includeFocalSpouses: state.focus.includeSpouses,
      includeFocalSiblings: state.focus.includeSiblings,
    };

    const content: PosterContentSpec & { readonly scope: 'selected-root-focus' } = {
      definitionId: context?.definitionId || 'classic-ancestor-poster',
      language: context?.language || 'ar',
      title: context?.title || state.shared.headerText || 'لوحة حول الشخص المحوري',
      subtitle: context?.subtitle || state.shared.subheaderText,
      scope: 'selected-root-focus',
      generationCount: 4,
      privacyMode: state.shared.privacyMode,
    };

    return {
      supported: true,
      capability,
      posterOptions: {
        ...baseOptions,
        engineId: 'focus-family',
        content,
        focusOptions,
      },
    };
  }

  // Radial Generations layout mode
  if (state.layoutMode === 'radial-generations') {
    if (!context?.focalPreviewId) {
      return {
        supported: false,
        capability,
        reason: 'Missing or unresolvable root person selection for Radial layout.',
      };
    }

    const radialScope = state.scope === 'descendants' ? 'descendants' : 'ancestors';
    const contentScope = radialScope === 'descendants' ? 'selected-root-descendants' : 'selected-root-ancestors';

    const radialOptions: PosterRadialLayoutOptions = {
      focalPreviewId: context.focalPreviewId,
      radialSpan: state.radial.radialSpan,
      generationRings: state.radial.generationRings,
      ringSpacing: state.radial.ringSpacing,
      centerCardScale: state.radial.centerCardScale,
      labelOrientation: 'straight-unwarped',
    };

    const content: PosterContentSpec = {
      definitionId: context?.definitionId || 'classic-ancestor-poster',
      language: context?.language || 'ar',
      title: context?.title || state.shared.headerText || 'لوحة العائلة الشعاعية',
      subtitle: context?.subtitle || state.shared.subheaderText,
      scope: contentScope,
      generationCount: state.radial.generationRings,
      privacyMode: state.shared.privacyMode,
    };

    return {
      supported: true,
      capability,
      posterOptions: {
        ...baseOptions,
        engineId: 'radial-generations',
        content,
        radialOptions,
      },
    };
  }

  // Tiered layout mode
  const tieredEngineId =
    state.productMode === 'full-tree-overview'
      ? 'full-tree-overview'
      : state.scope === 'descendants' || state.scope === 'selected-branch'
      ? 'descendant-tiered'
      : 'ancestor-tiered';

  const tieredScope =
    state.scope === 'descendants'
      ? 'selected-root-descendants'
      : state.scope === 'selected-branch'
      ? 'selected-branch'
      : state.scope === 'full-tree'
      ? 'full-tree'
      : 'selected-root-ancestors';

  const content: PosterContentSpec = {
    definitionId: context?.definitionId || 'classic-ancestor-poster',
    language: context?.language || 'ar',
    title: context?.title || state.shared.headerText || 'لوحة العائلة',
    subtitle: context?.subtitle || state.shared.subheaderText,
    scope: tieredScope,
    generationCount: typeof state.tiered.generationDepth === 'number' ? state.tiered.generationDepth : 4,
    privacyMode: state.shared.privacyMode,
  };

  return {
    supported: true,
    capability,
    posterOptions: {
      ...baseOptions,
      engineId: tieredEngineId,
      content,
    },
  };
}
