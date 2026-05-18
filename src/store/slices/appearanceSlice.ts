import { StateCreator } from 'zustand';
import { 
    AppearanceState, 
    ThemePaletteId, 
    ThemeFontMode, 
    ThemeDensity, 
    ThemeRadiusMode, 
    ThemePresetId,
    ThemeStyle,
    DEFAULT_APPEARANCE_STATE,
    PRESETS,
    resolveThemeState,
    patchStateFromPreset,
    setValueAtPath,
    deepClone
} from '../../domain/appearance/appearanceEngine';

export interface AppearanceSlice {
    appearance: AppearanceState;
    setAppearancePalette: (paletteId: ThemePaletteId) => void;
    setAppearanceFontMode: (fontMode: ThemeFontMode) => void;
    setAppearanceDensity: (density: ThemeDensity) => void;
    setAppearanceRadiusMode: (radiusMode: ThemeRadiusMode) => void;
    applyAppearancePreset: (presetId: ThemePresetId) => void;
    updateAppearanceField: (path: string, value: unknown) => void;
    hydrateAppearanceState: (nextState: AppearanceState) => void;
    resetAppearanceToDefault: () => void;
}

const normalizeAppearanceState = (state: AppearanceState): AppearanceState => ({
    ...state,
    advanced: {
        ...state.advanced,
        nodeDetails: {
            ...state.advanced.nodeDetails,
            lineStyle: state.advanced.nodeDetails.lineStyle === 'curved' ? 'curved' : 'step',
        },
    },
});

/**
 * appearanceSlice
 * 
 * OWNERSHIP BOUNDARY: Primary Appearance State.
 * This slice acts as the Single Source of Truth (SSOT) for the UI appearance.
 */
export const createAppearanceSlice: StateCreator<
    AppearanceSlice,
    [],
    [],
    AppearanceSlice
> = (set) => ({
    appearance: deepClone(DEFAULT_APPEARANCE_STATE),

    setAppearancePalette: (paletteId) => set((state) => {
        if (state.appearance.paletteId === paletteId) return state;
        return {
            appearance: {
                ...state.appearance,
                presetId: 'custom', 
                theme: { themeStyle: 'custom' },
                meta: { ...state.appearance.meta, activePreset: 'custom' },
                ...resolveThemeState(paletteId, state.appearance.fontMode, state.appearance.density, state.appearance.radiusMode), 
                paletteId 
            }
        };
    }),

    setAppearanceFontMode: (fontMode) => set((state) => {
        if (state.appearance.fontMode === fontMode) return state;
        return {
            appearance: {
                ...state.appearance,
                presetId: 'custom', 
                theme: { themeStyle: 'custom' },
                meta: { ...state.appearance.meta, activePreset: 'custom' },
                ...resolveThemeState(state.appearance.paletteId, fontMode, state.appearance.density, state.appearance.radiusMode), 
                fontMode 
            }
        };
    }),

    setAppearanceDensity: (density) => set((state) => {
        if (state.appearance.density === density) return state;
        return {
            appearance: {
                ...state.appearance,
                presetId: 'custom', 
                theme: { themeStyle: 'custom' },
                meta: { ...state.appearance.meta, activePreset: 'custom' },
                ...resolveThemeState(state.appearance.paletteId, state.appearance.fontMode, density, state.appearance.radiusMode), 
                density 
            }
        };
    }),

    setAppearanceRadiusMode: (radiusMode) => set((state) => {
        if (state.appearance.radiusMode === radiusMode) return state;
        return {
            appearance: {
                ...state.appearance,
                presetId: 'custom', 
                theme: { themeStyle: 'custom' },
                meta: { ...state.appearance.meta, activePreset: 'custom' },
                ...resolveThemeState(state.appearance.paletteId, state.appearance.fontMode, state.appearance.density, radiusMode), 
                radiusMode 
            }
        };
    }),

    applyAppearancePreset: (presetId) => {
        const presetPatch = PRESETS[presetId] as Parameters<typeof patchStateFromPreset<AppearanceState>>[1];
        set((currentState) => {
            const nextState = patchStateFromPreset<AppearanceState>(currentState.appearance, presetPatch);
            const { paletteId, fontMode, density, radiusMode } = nextState;
            return {
                appearance: {
                    ...nextState,
                    ...resolveThemeState(paletteId, fontMode, density, radiusMode),
                    presetId,
                    theme: { themeStyle: presetId as ThemeStyle },
                    meta: { ...currentState.appearance.meta, activePreset: presetId as ThemeStyle },
                }
            };
        });
    },

    updateAppearanceField: (path, value) => {
        set((currentState) => {
            const nextValue = path === 'advanced.nodeDetails.lineStyle' && value !== 'curved' ? 'step' : value;
            const nextState = normalizeAppearanceState(setValueAtPath<AppearanceState>(currentState.appearance, path, nextValue));
            return {
                appearance: {
                    ...nextState, 
                    presetId: 'custom', 
                    theme: { themeStyle: 'custom' },
                    meta: { ...currentState.appearance.meta, activePreset: 'custom' as ThemeStyle } 
                }
            };
        });
    },

    hydrateAppearanceState: (nextState) => {
        set({ appearance: normalizeAppearanceState(deepClone(nextState)) });
    },

    resetAppearanceToDefault: () => set({ appearance: deepClone(DEFAULT_APPEARANCE_STATE) }),
});
