import type {
  PosterDesignState,
  PosterCombinationCapability,
} from '../../../publishing';
import { getPosterLayoutCombinationCapability } from '../../../publishing';
import type { VisualStudioPosterOptions, VisualStudioPosterScope } from './visualStudioPosterOptions';

export interface VisualStudioPosterOptionsMappingResult {
  readonly supported: boolean;
  readonly capability: PosterCombinationCapability;
  readonly reason?: string;
  readonly posterOptions?: VisualStudioPosterOptions;
}

/**
 * Pure runtime adapter that maps PosterDesignState into the existing Visual Studio poster options
 * consumed by the current Tiered runtime.
 *
 * Rules:
 * - Maps ONLY runtime-supported combinations (runtime-supported-and-reachable or quality-gated).
 * - Rejects planned Focus or Radial combinations before passing to PosterScene.
 * - Does not modify PosterScene, selectors, sanitizers, or exporters.
 */
export function mapPosterDesignStateToRuntimeOptions(
  state: PosterDesignState
): VisualStudioPosterOptionsMappingResult {
  const capability = getPosterLayoutCombinationCapability(state.productMode, state.layoutMode, state.scope);

  // Focus and Radial layout modes are planned/unsupported in Phase 1B runtime
  if (state.layoutMode !== 'tiered' || !capability.isRuntimeSupported) {
    return {
      supported: false,
      capability,
      reason: capability.description.en || 'Selected layout combination is not supported by the current runtime.',
    };
  }

  const posterOptions: VisualStudioPosterOptions = {
    scope: (state.scope === 'selected-branch' ? 'ancestors' : state.scope) as VisualStudioPosterScope,
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

  return {
    supported: true,
    capability,
    posterOptions,
  };
}
