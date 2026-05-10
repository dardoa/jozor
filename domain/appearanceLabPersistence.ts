import { AppearanceState, PRESETS, useTreeAppearanceStore } from '../store/useTreeAppearanceStore';
import { TreeSettings } from '../types';
import { normalizeChartType } from './chartTypeAdapter';
import { mapAppearanceLabStateToTreeSettings } from './appearanceLabTreeSettings';

const LEGACY_THEME_TO_TREE_PRESET = {
    modern: 'heritage',
    vintage: 'heritage',
    blueprint: 'modernPure',
} as const;

/**
 * NORMALIZATION LAYER: Appearance Lab State -> Persisted TreeSettings Segment
 * 
 * Defines the strict, persisted shape of Appearance Lab-owned settings.
 */
export const normalizeAppearanceLabForPersistence = (
    appearanceState: AppearanceState
): Partial<TreeSettings> => {
    return mapAppearanceLabStateToTreeSettings(appearanceState);
};

/**
 * Constructs the accurate `TreeSettings` object for saving.
 */
export const buildPersistedTreeSettings = (legacySettings: TreeSettings): TreeSettings => {
    const appearanceState = useTreeAppearanceStore.getState();
    const normalizedLabSettings = normalizeAppearanceLabForPersistence(appearanceState);
    
    return {
        ...legacySettings,
        ...normalizedLabSettings,
    };
};

/**
 * Hydrates the `useTreeAppearanceStore` explicitly from a given `TreeSettings` structure.
 */
export const hydrateAppearanceLabFromLegacy = (
    treeSettings: Partial<TreeSettings>
) => {
    const currentStoreState = useTreeAppearanceStore.getState();
    const baseVisualState = {
        theme: currentStoreState.theme,
        appearance: currentStoreState.appearance,
        meta: currentStoreState.meta,
    };
    const mappedLegacyPreset =
        treeSettings.theme && treeSettings.theme in LEGACY_THEME_TO_TREE_PRESET
            ? LEGACY_THEME_TO_TREE_PRESET[treeSettings.theme as keyof typeof LEGACY_THEME_TO_TREE_PRESET]
            : null;
    const resolvedVisualState = mappedLegacyPreset
        ? {
            theme: {
                themeStyle: mappedLegacyPreset,
            },
            appearance: {
                ...baseVisualState.appearance,
                ...PRESETS[mappedLegacyPreset as keyof typeof PRESETS]?.appearance,
            },
        }
        : {
            theme: baseVisualState.theme,
            appearance: baseVisualState.appearance,
        };

    const activeTreeMode = normalizeChartType(treeSettings.chartType ?? currentStoreState.coreEngine.treeMode);
    const activeLayoutMode = treeSettings.layoutMode ?? 'vertical';

    const nextState: AppearanceState = {
        ...currentStoreState, // Keep current tokens
        coreEngine: {
            treeMode: activeTreeMode,
            orientation: activeTreeMode === 'focus' ? (activeLayoutMode === 'horizontal' ? 'horizontal' : 'vertical') : currentStoreState.coreEngine.orientation,
        },
        theme: resolvedVisualState.theme as any,
        meta: { activePreset: (mappedLegacyPreset ?? currentStoreState.meta.activePreset) as any },
        appearance: resolvedVisualState.appearance as any,
        layout: { zoom: treeSettings.nodeWidth ?? currentStoreState.layout.zoom, horizontalSpread: treeSettings.nodeSpacingX ?? currentStoreState.layout.horizontalSpread, verticalSpread: treeSettings.nodeSpacingY ?? currentStoreState.layout.verticalSpread },
        contentVisibility: {
            photos: Boolean(treeSettings.showPhotos ?? currentStoreState.contentVisibility.photos),
            names: {
                showBaseName: Boolean((treeSettings.showFirstName ?? false) || (treeSettings.showLastName ?? false)),
                showMiddleName: Boolean(treeSettings.showMiddleName ?? false),
                showNickname: Boolean(treeSettings.showNickname ?? false),
                showSuffix: Boolean(treeSettings.showSuffix ?? false),
            },
            dates: {
                enabled: Boolean(treeSettings.showDates ?? currentStoreState.contentVisibility.dates.enabled),
                birth: Boolean(treeSettings.showBirthDate ?? currentStoreState.contentVisibility.dates.birth),
                death: Boolean(treeSettings.showDeathDate ?? currentStoreState.contentVisibility.dates.death),
                marriage: Boolean(treeSettings.showMarriageDate ?? currentStoreState.contentVisibility.dates.marriage),
            },
            places: {
                enabled: Boolean(
                    (treeSettings.showBirthPlace ?? currentStoreState.contentVisibility.places.birthPlace)
                    || (treeSettings.showMarriagePlace ?? currentStoreState.contentVisibility.places.marriagePlace)
                    || (treeSettings.showBurialPlace ?? currentStoreState.contentVisibility.places.burialPlace)
                ),
                birthPlace: Boolean(treeSettings.showBirthPlace ?? currentStoreState.contentVisibility.places.birthPlace),
                marriagePlace: Boolean(treeSettings.showMarriagePlace ?? currentStoreState.contentVisibility.places.marriagePlace),
                burialPlace: Boolean(treeSettings.showBurialPlace ?? currentStoreState.contentVisibility.places.burialPlace),
            },
        },
        advanced: {
            nodeDetails: { textSize: treeSettings.textSize ?? currentStoreState.advanced.nodeDetails.textSize, generationLimit: treeSettings.generationLimit ?? currentStoreState.advanced.nodeDetails.generationLimit, compactNodes: Boolean(treeSettings.isCompact ?? currentStoreState.advanced.nodeDetails.compactNodes), lineStyle: (treeSettings.lineStyle ?? currentStoreState.advanced.nodeDetails.lineStyle) as any, lineThickness: treeSettings.lineThickness ?? currentStoreState.advanced.nodeDetails.lineThickness, boxColorLogic: (treeSettings.boxColorLogic ?? currentStoreState.advanced.nodeDetails.boxColorLogic) as any },
            layoutEngine: { highlightBranch: Boolean(treeSettings.highlightBranch ?? currentStoreState.advanced.layoutEngine.highlightBranch), highlightedBranchRootId: treeSettings.highlightedBranchRootId ?? currentStoreState.advanced.layoutEngine.highlightedBranchRootId },
        },
    };
    
    // We don't need getActivePresetForState anymore as it's handled by updateField/applyPreset or kept as custom
    currentStoreState.hydrateState(nextState);
};
