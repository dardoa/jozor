import { AppearanceState, PRESETS } from './appearanceEngine';
import { TreeSettings } from '../../types';
import { normalizeChartType } from '../chartTypeAdapter';
import { useAppStore } from '../../store/useAppStore';
import { resolveThemeState, patchStateFromPreset } from './appearanceEngine';

const LEGACY_THEME_TO_TREE_PRESET = {
    modern: 'heritage',
    vintage: 'heritage',
    blueprint: 'modernPure',
} as const;

const normalizeAppearanceLineStyle = (lineStyle: unknown): AppearanceState['advanced']['nodeDetails']['lineStyle'] =>
    lineStyle === 'curved' ? 'curved' : 'step';

export const hydrateAppearanceLabFromLegacy = (
    treeSettings: Partial<TreeSettings>
) => {
    // READ: from the new appearanceSlice (parity migration complete)
    const currentStoreState = useAppStore.getState().appearance;
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
        ? (() => {
            // Apply the preset patch first to get the preset's palette/font/density/radius
            const presetPatch = PRESETS[mappedLegacyPreset as keyof typeof PRESETS];
            const patched = patchStateFromPreset<AppearanceState>(currentStoreState, presetPatch as any);
            const { paletteId, fontMode, density, radiusMode } = patched;
            // Recalculate full tokens so cssVariables/colors/fonts match the preset
            const resolvedTokens = resolveThemeState(paletteId, fontMode, density, radiusMode);
            return {
                theme: { themeStyle: mappedLegacyPreset },
                appearance: {
                    ...baseVisualState.appearance,
                    ...presetPatch?.appearance,
                },
                resolvedTokens,
                paletteId,
                fontMode,
                density,
                radiusMode,
            };
        })()
        : {
            theme: baseVisualState.theme,
            appearance: baseVisualState.appearance,
            resolvedTokens: null,
            paletteId: currentStoreState.paletteId,
            fontMode: currentStoreState.fontMode,
            density: currentStoreState.density,
            radiusMode: currentStoreState.radiusMode,
        };

    const activeTreeMode = normalizeChartType(treeSettings.chartType ?? currentStoreState.coreEngine.treeMode);
    const activeLayoutMode = treeSettings.layoutMode ?? currentStoreState.coreEngine.orientation;

    const nextState: AppearanceState = {
        ...currentStoreState,
        // Recalculated tokens if a legacy preset was mapped; otherwise keep current
        ...(resolvedVisualState.resolvedTokens ?? {}),
        paletteId: resolvedVisualState.paletteId,
        fontMode: resolvedVisualState.fontMode,
        density: resolvedVisualState.density,
        radiusMode: resolvedVisualState.radiusMode,
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
                showBaseName: Boolean(
                    (treeSettings.showFirstName ?? treeSettings.showLastName) ?? currentStoreState.contentVisibility.names.showBaseName
                ),
                showMiddleName: Boolean(treeSettings.showMiddleName ?? currentStoreState.contentVisibility.names.showMiddleName),
                showNickname: Boolean(treeSettings.showNickname ?? currentStoreState.contentVisibility.names.showNickname),
                showSuffix: Boolean(treeSettings.showSuffix ?? currentStoreState.contentVisibility.names.showSuffix),
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
            nodeDetails: { textSize: treeSettings.textSize ?? currentStoreState.advanced.nodeDetails.textSize, generationLimit: treeSettings.generationLimit ?? currentStoreState.advanced.nodeDetails.generationLimit, compactNodes: Boolean(treeSettings.isCompact ?? currentStoreState.advanced.nodeDetails.compactNodes), lineStyle: normalizeAppearanceLineStyle(treeSettings.lineStyle ?? currentStoreState.advanced.nodeDetails.lineStyle), lineThickness: treeSettings.lineThickness ?? currentStoreState.advanced.nodeDetails.lineThickness, boxColorLogic: (treeSettings.boxColorLogic ?? currentStoreState.advanced.nodeDetails.boxColorLogic) as any },
            layoutEngine: { highlightBranch: Boolean(treeSettings.highlightBranch ?? currentStoreState.advanced.layoutEngine.highlightBranch), highlightedBranchRootId: treeSettings.highlightedBranchRootId ?? currentStoreState.advanced.layoutEngine.highlightedBranchRootId },
        },
    };

    // WRITE: directly to the new appearanceSlice
    useAppStore.getState().hydrateAppearanceState(nextState);
};
