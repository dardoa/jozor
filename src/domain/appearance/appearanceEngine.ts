// ---------------------------------------------------------
// APPEARANCE TYPE DEFINITIONS (canonical location)
// Previously in useTreeAppearanceStore — moved here in Phase 5 cleanup.
// ---------------------------------------------------------

// Appearance Lab / Tree Settings Types
export type TreeMode = 'focus' | 'radial';
export type Orientation = 'vertical' | 'horizontal';
export type ThemeStyle = 'heritage' | 'modernPure' | 'artistic' | 'custom';
export type TypographyMode = 'classic' | 'modern';
export type DensityMode = 'comfortable' | 'compact' | 'airy';

// CSS Theme Token Types
export type ThemePresetId = 'heritage' | 'modernPure' | 'artistic';
export type ThemePaletteId = 'vault-classic' | 'archive-sage' | 'azure-ledger' | 'rose-ledger';
export type ThemeFontMode = 'modern' | 'classic';
export type ThemeDensity = 'compact' | 'comfortable' | 'airy';
export type ThemeRadiusMode = 'soft' | 'grand';

export interface ThemeColorTokens {
    surfaceApp: string;
    surfaceElevated: string;
    surfacePanel: string;
    surfacePanelSubtle: string;
    surfaceSubtle: string;
    surfaceHover: string;
    borderSoft: string;
    borderStrong: string;
    textStrong: string;
    textDefault: string;
    textSecondary: string;
    textTertiary: string;
    primary400: string;
    primary500: string;
    primary600: string;
    primary700: string;
    primary600Rgb: string;
    primaryContrast: string;
    support500: string;
    info500: string;
    accent500: string;
}

export interface ThemeFontTokens {
    fontFamilySans: string;
    fontFamilySerif: string;
    fontFamilyBody: string;
    fontFamilyHeading: string;
}

export interface ThemeSpacingTokens {
    space3: string;
    space4: string;
    space6: string;
    space8: string;
}

export interface ThemeRadiusTokens {
    radiusLg: string;
    radiusXl: string;
}

export interface ThemePaletteOption {
    id: ThemePaletteId;
    label: string;
    description: string;
    swatches: string[];
    colors: ThemeColorTokens;
}

/** The complete visual state of the appearance lab. SSOT: useAppStore().appearance */
export interface AppearanceState {
    // 1. CSS Theme Engine
    presetId: ThemePresetId | 'custom';
    paletteId: ThemePaletteId;
    fontMode: ThemeFontMode;
    density: ThemeDensity;
    radiusMode: ThemeRadiusMode;
    colors: ThemeColorTokens;
    fonts: ThemeFontTokens;
    spacing: ThemeSpacingTokens;
    radius: ThemeRadiusTokens;
    cssVariables: Record<string, string>;

    // 2. Visual Settings
    coreEngine: {
        treeMode: TreeMode;
        orientation: Orientation;
    };
    theme: {
        themeStyle: ThemeStyle;
    };
    meta: {
        activePreset: ThemeStyle;
    };
    appearance: {
        typography: TypographyMode;
        cornerRadius: number;
        density: DensityMode;
    };
    layout: {
        zoom: number;
        horizontalSpread: number;
        verticalSpread: number;
    };
    contentVisibility: {
        photos: boolean;
        names: {
            showBaseName: boolean;
            showMiddleName: boolean;
            showNickname: boolean;
            showSuffix: boolean;
        };
        dates: {
            enabled: boolean;
            birth: boolean;
            death: boolean;
            marriage: boolean;
        };
        places: {
            enabled: boolean;
            birthPlace: boolean;
            marriagePlace: boolean;
            burialPlace: boolean;
        };
    };
    advanced: {
        nodeDetails: {
            textSize: number;
            generationLimit: number;
            compactNodes: boolean;
            lineStyle: 'curved' | 'step';
            lineThickness: number;
            boxColorLogic: 'gender' | 'lineage' | 'none';
        };
        layoutEngine: {
            highlightBranch: boolean;
            highlightedBranchRootId: string | null;
        };
    };
}


// ---------------------------------------------------------
// TOKENS & CONSTANTS
// ---------------------------------------------------------

export const MODERN_SANS = '"Inter", "IBM Plex Sans Arabic", "Segoe UI", sans-serif';
export const CLASSIC_SERIF = '"Fraunces", "Noto Naskh Arabic", "Amiri", serif';

export const VAULT_CLASSIC_COLORS: ThemeColorTokens = {
    surfaceApp: '#fdfcf5',
    surfaceElevated: '#f8f4ea',
    surfacePanel: 'rgba(250, 248, 240, 0.94)',
    surfacePanelSubtle: 'rgba(250, 248, 240, 0.78)',
    surfaceSubtle: '#faf8f0',
    surfaceHover: '#f2ecdf',
    borderSoft: 'rgba(139, 115, 85, 0.18)',
    borderStrong: 'rgba(139, 115, 85, 0.28)',
    textStrong: '#424242',
    textDefault: '#424242',
    textSecondary: '#5d5d5d',
    textTertiary: '#746a60',
    primary400: '#6f8a67',
    primary500: '#5f7a61',
    primary600: '#4a6741',
    primary700: '#3f5a38',
    primary600Rgb: '74, 103, 65',
    primaryContrast: '#fdfcf5',
    support500: '#8b7355',
    info500: '#5b86b7',
    accent500: '#a67c37',
};

export const THEME_PALETTE_OPTIONS: ThemePaletteOption[] = [
    {
        id: 'vault-classic',
        label: 'Vault Classic',
        description: 'The premium cream-and-copper system.',
        swatches: ['#fdfcf5', '#f8f4ea', '#a67c37', '#4a6741'],
        colors: VAULT_CLASSIC_COLORS,
    },
    {
        id: 'archive-sage',
        label: 'Archive Sage',
        description: 'A softer olive archival palette.',
        swatches: ['#fbfaf3', '#f3efe4', '#8e7a4d', '#5f7a61'],
        colors: {
            ...VAULT_CLASSIC_COLORS,
            surfaceApp: '#fbfaf3',
            surfaceElevated: '#f3efe4',
            surfacePanel: 'rgba(248, 245, 236, 0.94)',
            surfacePanelSubtle: 'rgba(248, 245, 236, 0.78)',
            surfaceSubtle: '#f7f3ea',
            surfaceHover: '#ece6d9',
            primary400: '#7a9272',
            primary500: '#6a8463',
            primary600: '#5f7a61',
            primary700: '#4d684f',
            primary600Rgb: '95, 122, 97',
            support500: '#8f7e5e',
            accent500: '#9f8248',
        },
    },
    {
        id: 'azure-ledger',
        label: 'Azure Ledger',
        description: 'Cream surfaces with editorial blue.',
        swatches: ['#fcfbf6', '#f4f1e8', '#5b86b7', '#506a80'],
        colors: {
            ...VAULT_CLASSIC_COLORS,
            borderSoft: 'rgba(91, 134, 183, 0.16)',
            borderStrong: 'rgba(91, 134, 183, 0.24)',
            textTertiary: '#6a7280',
            primary400: '#7892a8',
            primary500: '#68839a',
            primary600: '#506a80',
            primary700: '#42586d',
            primary600Rgb: '80, 106, 128',
            support500: '#6f7d8c',
            info500: '#5b86b7',
            accent500: '#8e7a4d',
        },
    },
    {
        id: 'rose-ledger',
        label: 'Rose Ledger',
        description: 'Muted rose details for softer presentation.',
        swatches: ['#fdfaf7', '#f7efe9', '#b6827d', '#7a645d'],
        colors: {
            ...VAULT_CLASSIC_COLORS,
            surfaceApp: '#fdfaf7',
            surfaceElevated: '#f7efe9',
            surfacePanel: 'rgba(251, 245, 240, 0.94)',
            surfacePanelSubtle: 'rgba(251, 245, 240, 0.78)',
            surfaceSubtle: '#faf2ec',
            surfaceHover: '#f1e6de',
            borderSoft: 'rgba(182, 130, 125, 0.16)',
            borderStrong: 'rgba(182, 130, 125, 0.24)',
            primary400: '#a98078',
            primary500: '#97726a',
            primary600: '#7a645d',
            primary700: '#66514b',
            primary600Rgb: '122, 100, 93',
            support500: '#9b7d74',
            accent500: '#b6827d',
        },
    },
];

export const FONT_TOKENS: Record<ThemeFontMode, ThemeFontTokens> = {
    classic: {
        fontFamilySans: MODERN_SANS,
        fontFamilySerif: CLASSIC_SERIF,
        fontFamilyBody: MODERN_SANS,
        fontFamilyHeading: CLASSIC_SERIF,
    },
    modern: {
        fontFamilySans: MODERN_SANS,
        fontFamilySerif: MODERN_SANS,
        fontFamilyBody: MODERN_SANS,
        fontFamilyHeading: MODERN_SANS,
    },
};

export const DENSITY_TOKENS: Record<ThemeDensity, ThemeSpacingTokens> = {
    compact: { space3: '0.625rem', space4: '0.875rem', space6: '1.25rem', space8: '1.75rem' },
    comfortable: { space3: '0.75rem', space4: '1rem', space6: '1.5rem', space8: '2rem' },
    airy: { space3: '0.875rem', space4: '1.125rem', space6: '1.75rem', space8: '2.25rem' },
};

export const RADIUS_TOKENS: Record<ThemeRadiusMode, ThemeRadiusTokens> = {
    soft: { radiusLg: '1rem', radiusXl: '1.25rem' },
    grand: { radiusLg: '1.125rem', radiusXl: '1.5rem' },
};

export const PALETTE_LOOKUP = Object.fromEntries(THEME_PALETTE_OPTIONS.map((p) => [p.id, p])) as Record<ThemePaletteId, ThemePaletteOption>;

// ---------------------------------------------------------
// CSS VAR BUILDERS & RESOLVERS
// ---------------------------------------------------------

export const THEME_COLOR_VARIABLE_KEYS = [
    '--surface-app', '--surface-elevated', '--surface-panel', '--surface-panel-subtle',
    '--surface-subtle', '--surface-hover', '--border-soft', '--border-strong',
    '--text-strong', '--text-default', '--text-secondary', '--text-tertiary',
    '--color-primary-400', '--color-primary-500', '--color-primary-600', '--color-primary-700',
    '--color-primary-600-rgb', '--color-primary-contrast', '--color-support-500',
    '--color-info-500', '--color-accent-500',
] as const;

export const buildCssVariables = (colors: ThemeColorTokens, fonts: ThemeFontTokens, spacing: ThemeSpacingTokens, radius: ThemeRadiusTokens): Record<string, string> => ({
    '--font-family-sans': fonts.fontFamilySans,
    '--font-family-serif': fonts.fontFamilySerif,
    '--font-family-body': fonts.fontFamilyBody,
    '--font-family-heading': fonts.fontFamilyHeading,
    '--space-3': spacing.space3,
    '--space-4': spacing.space4,
    '--space-6': spacing.space6,
    '--space-8': spacing.space8,
    '--radius-lg': radius.radiusLg,
    '--radius-xl': radius.radiusXl,
    '--surface-app': colors.surfaceApp,
    '--surface-elevated': colors.surfaceElevated,
    '--surface-panel': colors.surfacePanel,
    '--surface-panel-subtle': colors.surfacePanelSubtle,
    '--surface-subtle': colors.surfaceSubtle,
    '--surface-hover': colors.surfaceHover,
    '--border-soft': colors.borderSoft,
    '--border-strong': colors.borderStrong,
    '--text-strong': colors.textStrong,
    '--text-default': colors.textDefault,
    '--text-secondary': colors.textSecondary,
    '--text-tertiary': colors.textTertiary,
    '--color-primary-400': colors.primary400,
    '--color-primary-500': colors.primary500,
    '--color-primary-600': colors.primary600,
    '--color-primary-700': colors.primary700,
    '--color-primary-600-rgb': colors.primary600Rgb,
    '--color-primary-contrast': colors.primaryContrast,
    '--color-support-500': colors.support500,
    '--color-info-500': colors.info500,
    '--color-accent-500': colors.accent500,
});

export const resolveThemeState = (paletteId: ThemePaletteId, fontMode: ThemeFontMode, density: ThemeDensity, radiusMode: ThemeRadiusMode) => {
    const palette = PALETTE_LOOKUP[paletteId];
    const colors = palette.colors;
    const fonts = FONT_TOKENS[fontMode];
    const spacing = DENSITY_TOKENS[density];
    const radius = RADIUS_TOKENS[radiusMode];

    return { colors, fonts, spacing, radius, cssVariables: buildCssVariables(colors, fonts, spacing, radius) };
};

// ---------------------------------------------------------
// APPEARANCE PRESETS & UTILS
// ---------------------------------------------------------

export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

export type AppearancePresetDefinition = DeepPartial<Pick<AppearanceState, 'fontMode' | 'density' | 'radiusMode' | 'appearance' | 'paletteId' | 'theme'>>;

export const PRESETS: Record<ThemePresetId, AppearancePresetDefinition> = {
    heritage: {
        paletteId: 'vault-classic',
        fontMode: 'classic',
        density: 'comfortable',
        radiusMode: 'soft',
        theme: { themeStyle: 'heritage' },
        appearance: {
            typography: 'classic',
            cornerRadius: 16,
            density: 'comfortable',
        },
    },
    modernPure: {
        paletteId: 'azure-ledger',
        fontMode: 'modern',
        density: 'compact',
        radiusMode: 'soft',
        theme: { themeStyle: 'modernPure' },
        appearance: {
            typography: 'modern',
            cornerRadius: 14,
            density: 'compact',
        },
    },
    artistic: {
        paletteId: 'archive-sage',
        fontMode: 'classic',
        density: 'airy',
        radiusMode: 'grand',
        theme: { themeStyle: 'artistic' },
        appearance: {
            typography: 'classic',
            cornerRadius: 20,
            density: 'airy',
        },
    },
};

export const DEFAULT_APPEARANCE_STATE: AppearanceState = {
    // Theme Engine Defaults
    presetId: 'heritage',
    paletteId: 'vault-classic',
    fontMode: 'classic',
    density: 'comfortable',
    radiusMode: 'soft',
    ...resolveThemeState('vault-classic', 'classic', 'comfortable', 'soft'),

    // Visual Settings Defaults
    coreEngine: {
        treeMode: 'focus',
        orientation: 'vertical',
    },
    theme: {
        themeStyle: 'heritage',
    },
    meta: {
        activePreset: 'heritage',
    },
    appearance: {
        typography: 'classic',
        cornerRadius: 16,
        density: 'comfortable',
    },
    layout: {
        zoom: 170,
        horizontalSpread: 120,
        verticalSpread: 400,
    },
    contentVisibility: {
        photos: true,
        names: { showBaseName: true, showMiddleName: false, showNickname: false, showSuffix: false },
        dates: { enabled: true, birth: true, death: true, marriage: false },
        places: { enabled: false, birthPlace: false, marriagePlace: false, burialPlace: false },
    },
    advanced: {
        nodeDetails: { textSize: 12, generationLimit: 5, compactNodes: false, lineStyle: 'step', lineThickness: 2, boxColorLogic: 'gender' },
        layoutEngine: { highlightBranch: false, highlightedBranchRootId: null },
    },
};

export const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

export const deepClone = <T>(value: T): T => {
    if (Array.isArray(value)) return value.map((item) => deepClone(item)) as T;
    if (isRecord(value)) return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, deepClone(nested)])) as T;
    return value;
};

export const patchStateFromPreset = <T extends object>(currentState: T, presetPatch: DeepPartial<T>): T => {
    const nextState = deepClone(currentState);
    const nextRecord = nextState as Record<string, unknown>;
    for (const [key, patchValue] of Object.entries(presetPatch as Record<string, unknown>)) {
        if (patchValue === undefined) continue;
        if (isRecord(patchValue) && isRecord(nextRecord[key])) {
            nextRecord[key] = patchStateFromPreset(nextRecord[key], patchValue);
            continue;
        }
        nextRecord[key] = deepClone(patchValue);
    }
    return nextState;
};

export const setValueAtPath = <T extends object>(state: T, path: string, value: unknown): T => {
    const segments = path.split('.');
    const nextState = deepClone(state);
    let cursor = nextState as Record<string, unknown>;
    for (let index = 0; index < segments.length - 1; index += 1) {
        const segment = segments[index];
        const current = cursor[segment];
        cursor[segment] = isRecord(current) ? { ...current } : {};
        cursor = cursor[segment] as Record<string, unknown>;
    }
    cursor[segments[segments.length - 1]] = value;
    return nextState;
};
