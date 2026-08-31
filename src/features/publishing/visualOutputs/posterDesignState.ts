import type {
  PosterDesignState,
  SharedPosterSettings,
  TieredSettingsBucket,
  FocusSettingsBucket,
  RadialSettingsBucket,
  ProductModeSettingsBucket,
  PosterLayoutMode,
  TieredTreeScope,
  PosterRadialTreeScope,
} from './posterStateContracts';
import {
  getPosterPresetDefinition,
  getDefaultSharedSettingsForPreset,
  normalizePresetId,
} from './posterPresets';

export const DEFAULT_SHARED_POSTER_SETTINGS: SharedPosterSettings = {
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
  headerText: '',
  subheaderText: '',
  footerText: '',
  showJozorAttribution: true,
  colorPalette: 'style-default',
  colorOverrides: undefined,
  decoration: 'style-default',
  ornament: 'style-default',
  typography: 'balanced',
  fontFamily: 'amiri',
  cardScale: 'standard',
  cardEffect: 'style-default',
  cardFrame: 'style-default',
  cardCorner: 'style-default',
  cardLayout: 'style-default',
  pageFrame: 'style-default',
  header: 'style-default',
  selectedPosterRootToken: 'preview-root-1',
};

export const DEFAULT_TIERED_SETTINGS_BUCKET: TieredSettingsBucket = {
  generationDepth: 4,
  lastTieredScope: 'ancestors',
};

export const DEFAULT_FOCUS_SETTINGS_BUCKET: FocusSettingsBucket = {
  focalPersonToken: 'preview-root-1',
  ancestorDepth: 1,
  descendantDepth: 1,
  includeSpouses: true,
  includeSiblings: true,
  focalCardEmphasis: 'bolder-border',
};

export const DEFAULT_RADIAL_SETTINGS_BUCKET: RadialSettingsBucket = {
  radialSpan: '360-full-circle',
  generationRings: 3,
  ringSpacing: 'balanced',
  centerCardScale: 'standard',
  labelOrientation: 'straight-unwarped',
  lastRadialScope: 'ancestors',
};

export const DEFAULT_PRODUCT_MODE_SETTINGS_BUCKET: ProductModeSettingsBucket = {
  tiledRows: 3,
  tiledColumns: 3,
  tiledSheetSize: 'A3',
  tiledOverlapMm: 8,
  branchCollectionIndexTitle: '',
};

export function createInitialPosterDesignState(presetId: string = 'classic-heritage'): PosterDesignState {
  const normalizedId = normalizePresetId(presetId);
  const presetBaseline = getDefaultSharedSettingsForPreset(normalizedId);
  return {
    productMode: 'detailed-poster',
    layoutMode: 'tiered',
    scope: 'ancestors',
    activePresetId: normalizedId,
    shared: {
      ...DEFAULT_SHARED_POSTER_SETTINGS,
      ...presetBaseline,
      colorOverrides: undefined,
    },
    tiered: { ...DEFAULT_TIERED_SETTINGS_BUCKET },
    focus: { ...DEFAULT_FOCUS_SETTINGS_BUCKET },
    radial: { ...DEFAULT_RADIAL_SETTINGS_BUCKET },
    productBucket: { ...DEFAULT_PRODUCT_MODE_SETTINGS_BUCKET },
  };
}

/**
 * Applies a system preset to shared settings, normalizing unknown IDs and clearing stale delta overrides.
 */
export function applyPreset(state: PosterDesignState, presetId: string): PosterDesignState {
  const normalizedId = normalizePresetId(presetId);
  const presetBaseline = getDefaultSharedSettingsForPreset(normalizedId);
  return {
    ...state,
    activePresetId: normalizedId,
    shared: {
      ...state.shared,
      ...presetBaseline,
      colorOverrides: undefined,
    },
  };
}

/**
 * Checks whether current shared settings or colorOverrides differ from the active preset baseline.
 */
export function isPresetModified(state: PosterDesignState): boolean {
  if (state.shared.colorOverrides) {
    const { background, cardBackground, accent, connector } = state.shared.colorOverrides;
    if (background || cardBackground || accent || connector) {
      return true;
    }
  }

  const preset = getPosterPresetDefinition(state.activePresetId);
  if (!preset) return true;

  const baseline: SharedPosterSettings = {
    ...DEFAULT_SHARED_POSTER_SETTINGS,
    ...preset.baselineSettings,
    colorOverrides: undefined,
  };
  for (const [key, value] of Object.entries(baseline)) {
    const currentVal = state.shared[key as keyof SharedPosterSettings];
    if (currentVal !== value) {
      return true;
    }
  }
  return false;
}

/**
 * Updates a shared setting.
 */
export function updateSharedSetting<K extends keyof SharedPosterSettings>(
  state: PosterDesignState,
  key: K,
  value: SharedPosterSettings[K]
): PosterDesignState {
  return {
    ...state,
    shared: {
      ...state.shared,
      [key]: value,
    },
  };
}

/**
 * Updates layout mode while strictly preserving each mode's previous bucket values
 * and atomically setting/restoring scopes between Focus, Tiered, and Radial.
 */
export function switchLayoutMode(
  state: PosterDesignState,
  newLayoutMode: PosterLayoutMode
): PosterDesignState {
  if (state.layoutMode === newLayoutMode) return state;

  if (newLayoutMode === 'focus-family') {
    const isFromTiered = state.layoutMode === 'tiered';
    const isFromRadial = state.layoutMode === 'radial-generations';

    const lastTieredScope: TieredTreeScope = isFromTiered && state.scope !== 'around-person'
      ? (state.scope as TieredTreeScope)
      : (state.tiered.lastTieredScope ?? 'ancestors');

    const lastRadialScope: PosterRadialTreeScope = isFromRadial && (state.scope === 'ancestors' || state.scope === 'descendants')
      ? state.scope
      : (state.radial.lastRadialScope ?? 'ancestors');

    return {
      ...state,
      layoutMode: newLayoutMode,
      scope: 'around-person',
      tiered: {
        ...state.tiered,
        lastTieredScope,
      },
      radial: {
        ...state.radial,
        lastRadialScope,
      },
    };
  }

  if (newLayoutMode === 'tiered') {
    const isFromRadial = state.layoutMode === 'radial-generations';
    const lastRadialScope: PosterRadialTreeScope = isFromRadial && (state.scope === 'ancestors' || state.scope === 'descendants')
      ? state.scope
      : (state.radial.lastRadialScope ?? 'ancestors');

    const restoredScope = state.tiered.lastTieredScope ?? 'ancestors';
    return {
      ...state,
      layoutMode: newLayoutMode,
      scope: restoredScope,
      radial: {
        ...state.radial,
        lastRadialScope,
      },
    };
  }

  if (newLayoutMode === 'radial-generations') {
    const isFromTiered = state.layoutMode === 'tiered';
    const lastTieredScope: TieredTreeScope = isFromTiered && state.scope !== 'around-person'
      ? (state.scope as TieredTreeScope)
      : (state.tiered.lastTieredScope ?? 'ancestors');

    const restoredScope = state.radial.lastRadialScope ?? 'ancestors';
    return {
      ...state,
      layoutMode: newLayoutMode,
      scope: restoredScope,
      tiered: {
        ...state.tiered,
        lastTieredScope,
      },
    };
  }

  return {
    ...state,
    layoutMode: newLayoutMode,
  };
}

export function updateTieredBucket(
  state: PosterDesignState,
  updates: Partial<TieredSettingsBucket>
): PosterDesignState {
  return {
    ...state,
    tiered: {
      ...state.tiered,
      ...updates,
    },
  };
}

export function updateFocusBucket(
  state: PosterDesignState,
  updates: Partial<FocusSettingsBucket>
): PosterDesignState {
  return {
    ...state,
    focus: {
      ...state.focus,
      ...updates,
    },
  };
}

export function updateRadialBucket(
  state: PosterDesignState,
  updates: Partial<RadialSettingsBucket>
): PosterDesignState {
  return {
    ...state,
    radial: {
      ...state.radial,
      ...updates,
    },
  };
}

export function updateProductBucket(
  state: PosterDesignState,
  updates: Partial<ProductModeSettingsBucket>
): PosterDesignState {
  return {
    ...state,
    productBucket: {
      ...state.productBucket,
      ...updates,
    },
  };
}

/**
 * Resets a specified UI section back to active preset baseline.
 * Section ownership alignment:
 * - Content: privacyMode, showYears, showRelationship, showBirthPlace, showOccupation, showDescription, footerText, showJozorAttribution, selectedPosterRootToken (Cards untouched!).
 * - Layout: direction, spacing, active layout bucket (Appearance untouched!).
 * - Cards: includePhotos, hideLivingPhotos, photoShape, cardScale, cardEffect, cardFrame, cardCorner, cardLayout.
 * - Appearance: connectorStyle, connectorPath, colorPalette, colorOverrides, decoration, ornament, typography, fontFamily, pageFrame, header.
 * - Print: size, orientation, marginPreset.
 */
export function resetSection(
  state: PosterDesignState,
  sectionId: 'content' | 'layout' | 'cards' | 'appearance' | 'print'
): PosterDesignState {
  const presetBaseline = getDefaultSharedSettingsForPreset(state.activePresetId);

  switch (sectionId) {
    case 'content':
      return {
        ...state,
        scope: 'ancestors',
        shared: {
          ...state.shared,
          privacyMode: DEFAULT_SHARED_POSTER_SETTINGS.privacyMode,
          showYears: DEFAULT_SHARED_POSTER_SETTINGS.showYears,
          showRelationship: DEFAULT_SHARED_POSTER_SETTINGS.showRelationship,
          showBirthPlace: DEFAULT_SHARED_POSTER_SETTINGS.showBirthPlace,
          showOccupation: DEFAULT_SHARED_POSTER_SETTINGS.showOccupation,
          showDescription: DEFAULT_SHARED_POSTER_SETTINGS.showDescription,
          headerText: DEFAULT_SHARED_POSTER_SETTINGS.headerText,
          subheaderText: DEFAULT_SHARED_POSTER_SETTINGS.subheaderText,
          footerText: DEFAULT_SHARED_POSTER_SETTINGS.footerText,
          showJozorAttribution: DEFAULT_SHARED_POSTER_SETTINGS.showJozorAttribution,
          selectedPosterRootToken: DEFAULT_SHARED_POSTER_SETTINGS.selectedPosterRootToken,
        },
      };

    case 'appearance':
      return {
        ...state,
        shared: {
          ...state.shared,
          colorPalette: presetBaseline.colorPalette ?? DEFAULT_SHARED_POSTER_SETTINGS.colorPalette,
          colorOverrides: undefined,
          typography: presetBaseline.typography ?? DEFAULT_SHARED_POSTER_SETTINGS.typography,
          fontFamily: presetBaseline.fontFamily ?? DEFAULT_SHARED_POSTER_SETTINGS.fontFamily,
          decoration: presetBaseline.decoration ?? DEFAULT_SHARED_POSTER_SETTINGS.decoration,
          ornament: presetBaseline.ornament ?? DEFAULT_SHARED_POSTER_SETTINGS.ornament,
          pageFrame: presetBaseline.pageFrame ?? DEFAULT_SHARED_POSTER_SETTINGS.pageFrame,
          header: presetBaseline.header ?? DEFAULT_SHARED_POSTER_SETTINGS.header,
          connectorStyle: presetBaseline.connectorStyle ?? DEFAULT_SHARED_POSTER_SETTINGS.connectorStyle,
          connectorPath: presetBaseline.connectorPath ?? DEFAULT_SHARED_POSTER_SETTINGS.connectorPath,
        },
      };

    case 'cards':
      return {
        ...state,
        shared: {
          ...state.shared,
          includePhotos: DEFAULT_SHARED_POSTER_SETTINGS.includePhotos,
          hideLivingPhotos: DEFAULT_SHARED_POSTER_SETTINGS.hideLivingPhotos,
          cardScale: presetBaseline.cardScale ?? DEFAULT_SHARED_POSTER_SETTINGS.cardScale,
          cardEffect: presetBaseline.cardEffect ?? DEFAULT_SHARED_POSTER_SETTINGS.cardEffect,
          cardFrame: presetBaseline.cardFrame ?? DEFAULT_SHARED_POSTER_SETTINGS.cardFrame,
          cardCorner: presetBaseline.cardCorner ?? DEFAULT_SHARED_POSTER_SETTINGS.cardCorner,
          cardLayout: presetBaseline.cardLayout ?? DEFAULT_SHARED_POSTER_SETTINGS.cardLayout,
          photoShape: presetBaseline.photoShape ?? DEFAULT_SHARED_POSTER_SETTINGS.photoShape,
        },
      };

    case 'layout': {
      const resetSharedLayout = {
        ...state.shared,
        direction: DEFAULT_SHARED_POSTER_SETTINGS.direction,
        spacing: presetBaseline.spacing ?? DEFAULT_SHARED_POSTER_SETTINGS.spacing,
      };

      // Reset ONLY the active layout bucket; preserve inactive layout buckets and Appearance settings!
      if (state.layoutMode === 'tiered') {
        return {
          ...state,
          shared: resetSharedLayout,
          tiered: { ...DEFAULT_TIERED_SETTINGS_BUCKET },
        };
      }
      if (state.layoutMode === 'focus-family') {
        return {
          ...state,
          shared: resetSharedLayout,
          focus: { ...DEFAULT_FOCUS_SETTINGS_BUCKET },
        };
      }
      if (state.layoutMode === 'radial-generations') {
        return {
          ...state,
          shared: resetSharedLayout,
          radial: { ...DEFAULT_RADIAL_SETTINGS_BUCKET },
        };
      }
      return {
        ...state,
        shared: resetSharedLayout,
      };
    }

    case 'print':
      return {
        ...state,
        shared: {
          ...state.shared,
          size: DEFAULT_SHARED_POSTER_SETTINGS.size,
          orientation: DEFAULT_SHARED_POSTER_SETTINGS.orientation,
          marginPreset: presetBaseline.marginPreset ?? DEFAULT_SHARED_POSTER_SETTINGS.marginPreset,
        },
      };

    default:
      return applyPreset(state, state.activePresetId);
  }
}

/**
 * Resets the entire poster design state back to initial preset defaults.
 */
export function resetPoster(state: PosterDesignState, presetId?: string): PosterDesignState {
  const targetPreset = normalizePresetId(presetId || state.activePresetId);
  return createInitialPosterDesignState(targetPreset);
}

/**
 * Bounded Undo/Redo History Manager (Max 20 snapshots).
 */
export class PosterHistoryManager {
  private past: PosterDesignState[] = [];
  private present: PosterDesignState;
  private future: PosterDesignState[] = [];
  private readonly maxLimit = 20;

  constructor(initialState?: PosterDesignState) {
    this.present = initialState || createInitialPosterDesignState();
  }

  public getPresentState(): PosterDesignState {
    return this.present;
  }

  public pushState(newState: PosterDesignState): void {
    if (this.present === newState) return;
    this.past.push(this.present);
    if (this.past.length > this.maxLimit) {
      this.past.shift();
    }
    this.present = newState;
    this.future = []; // Clear redo stack on new action
  }

  public canUndo(): boolean {
    return this.past.length > 0;
  }

  public canRedo(): boolean {
    return this.future.length > 0;
  }

  public undo(): PosterDesignState | undefined {
    if (!this.canUndo()) return undefined;
    const previous = this.past.pop()!;
    this.future.unshift(this.present);
    this.present = previous;
    return this.present;
  }

  public redo(): PosterDesignState | undefined {
    if (!this.canRedo()) return undefined;
    const next = this.future.shift()!;
    this.past.push(this.present);
    this.present = next;
    return this.present;
  }

  public getPastCount(): number {
    return this.past.length;
  }

  public getFutureCount(): number {
    return this.future.length;
  }
}
