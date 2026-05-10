import { TreeSettings } from '../../../types';
import { ThemeDensity, ThemeFontMode, ThemePaletteId, ThemeRadiusMode } from '../../../store/useTreeAppearanceStore';
import { normalizeChartType } from '../../../domain/chartTypeAdapter';

export type VisualPresetId = 'heritage' | 'modernPure' | 'artistic';
export type VisualPresetMatch = VisualPresetId | 'custom';
export type AppearanceMode = 'light' | 'dark';

export type AppearanceState = {
    colors: ThemePaletteId;
    typography: ThemeFontMode;
    cornerRadius: ThemeRadiusMode;
    density: ThemeDensity;
};

export type VisualControlState = {
    coreEngine: {
        presetId: VisualPresetMatch;
        layoutMode: TreeSettings['layoutMode'];
    };
    appearance: AppearanceState;
    layout: {
        zoom: number;
        horizontalSpread: number;
        verticalSpread: number;
    };
    contentVisibility: {
        showPhotos: boolean;
        showDates: boolean;
        showNames: boolean;
    };
    advanced: {
        layoutEngine: {
            chartType: TreeSettings['chartType'];
            highlightBranch: boolean;
            highlightedBranchRootId: string | null;
        };
        nodeDetails: {
            textSize: number;
            generationLimit: number;
            lineStyle: NonNullable<TreeSettings['lineStyle']>;
            lineThickness: number;
            boxColorLogic: TreeSettings['boxColorLogic'];
            compactNodes: boolean;
        };
        performance: {
            isLowGraphicsMode: boolean;
        };
    };
};

export type VisualPresetDefinition = {
    id: VisualPresetId;
    theme: AppearanceState;
};

export const PRESET_DEFINITIONS: VisualPresetDefinition[] = [
    {
        id: 'heritage',
        theme: {
            colors: 'vault-classic',
            typography: 'classic',
            cornerRadius: 'soft',
            density: 'comfortable',
        },
    },
    {
        id: 'modernPure',
        theme: {
            colors: 'azure-ledger',
            typography: 'modern',
            cornerRadius: 'soft',
            density: 'compact',
        },
    },
    {
        id: 'artistic',
        theme: {
            colors: 'rose-ledger',
            typography: 'classic',
            cornerRadius: 'grand',
            density: 'airy',
        },
    },
];

const NAME_KEYS = ['showFirstName', 'showMiddleName', 'showLastName', 'showNickname', 'showMaidenName', 'showPrefix', 'showSuffix'] as const;

export const deriveShowNames = (treeSettings: TreeSettings) => NAME_KEYS.some((key) => Boolean(treeSettings[key]));

export const setNameVisibilityPatch = (showNames: boolean) => ({
    showFirstName: showNames,
    showMiddleName: false,
    showLastName: showNames,
    showNickname: false,
    showMaidenName: false,
    showPrefix: false,
    showSuffix: false,
});

export const buildVisualControlState = ({
    treeSettings,
    appearance,
}: {
    treeSettings: TreeSettings;
    appearance: AppearanceState;
}): VisualControlState => ({
    coreEngine: {
        presetId: 'custom',
        layoutMode: treeSettings.layoutMode,
    },
    appearance,
    layout: {
        zoom: treeSettings.nodeWidth,
        horizontalSpread: treeSettings.nodeSpacingX,
        verticalSpread: treeSettings.nodeSpacingY,
    },
    contentVisibility: {
        showPhotos: Boolean(treeSettings.showPhotos),
        showDates: Boolean(treeSettings.showDates),
        showNames: deriveShowNames(treeSettings),
    },
    advanced: {
        layoutEngine: {
            chartType: normalizeChartType(treeSettings.chartType),
            highlightBranch: Boolean(treeSettings.highlightBranch),
            highlightedBranchRootId: treeSettings.highlightedBranchRootId ?? null,
        },
        nodeDetails: {
            textSize: treeSettings.textSize,
            generationLimit: treeSettings.generationLimit,
            lineStyle: treeSettings.lineStyle ?? 'curved',
            lineThickness: treeSettings.lineThickness ?? 2,
            boxColorLogic: treeSettings.boxColorLogic,
            compactNodes: Boolean(treeSettings.isCompact),
        },
        performance: {
            isLowGraphicsMode: Boolean(treeSettings.isLowGraphicsMode),
        },
    },
});

export const detectMatchingPreset = (state: VisualControlState): VisualPresetMatch => {
    const match = PRESET_DEFINITIONS.find((preset) =>
        preset.theme.colors === state.appearance.colors
        && preset.theme.typography === state.appearance.typography
        && preset.theme.cornerRadius === state.appearance.cornerRadius
        && preset.theme.density === state.appearance.density
    );

    return match?.id ?? 'custom';
};
