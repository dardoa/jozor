import { StateCreator } from 'zustand';
import { TreeSettings } from '../../types';
import { DEFAULT_TREE_SETTINGS } from '../../constants';
import { normalizeChartType } from '../../domain/chartTypeAdapter';


export interface SettingsSlice {
    /**
     * Persistence target for cloud/Drive sync.
     * UI rendering reads from useAppStore().appearance (appearanceSlice).
     */
    treeSettings: TreeSettings;
    darkMode: boolean;
    language: 'en' | 'ar';
    exportStatus: { isExporting: boolean; progress?: number; format?: string };
    isActivityLogOpen: boolean;
    isLowGraphicsMode: boolean;

    // Actions
    setTreeSettings: (settings: TreeSettings | ((prev: TreeSettings) => TreeSettings)) => void;
    setDarkMode: (dark: boolean) => void;
    setLanguage: (lang: 'en' | 'ar') => void;
    importSettings: (settings: Partial<SettingsSlice>) => void;
    setExportStatus: (status: { isExporting: boolean; progress?: number; format?: string }) => void;
    setActivityLogOpen: (open: boolean) => void;
    setIsLowGraphicsMode: (isLow: boolean) => void;
}

export const createSettingsSlice: StateCreator<SettingsSlice> = (set) => ({
    // Initial State
    treeSettings: DEFAULT_TREE_SETTINGS,
    darkMode: typeof window !== 'undefined' ? localStorage.getItem('theme') === 'dark' : false,
    language: (typeof window !== 'undefined' && (localStorage.getItem('language') === 'en' || localStorage.getItem('language') === 'ar')) 
        ? localStorage.getItem('language') as 'en' | 'ar' 
        : 'ar',
    exportStatus: { isExporting: false },
    isActivityLogOpen: false,
    isLowGraphicsMode: (() => {
        if (typeof window === 'undefined') return false;
        try {
            const legacyStorage = localStorage.getItem('jozor-ui-storage');
            if (legacyStorage) {
                const parsed = JSON.parse(legacyStorage);
                return !!parsed?.state?.isLowGraphicsMode;
            }
        } catch { /* ignore */ }
        return false;
    })(),

    // Actions
    setTreeSettings: (settings) => set((state) => {
        const resolved = typeof settings === 'function' ? settings(state.treeSettings) : settings;
        if (resolved && resolved.chartType) {
            resolved.chartType = normalizeChartType(resolved.chartType);
        }
        return {
            treeSettings: {
                ...DEFAULT_TREE_SETTINGS,
                ...resolved,
            },
        };
    }),
    setDarkMode: (dark) => set({ darkMode: dark }),
    setLanguage: (lang) => set(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', lang);
        }
        return { language: lang };
    }),
    importSettings: (settings) => set((state) => {
        const nextSettings = { ...settings };
        if (nextSettings.treeSettings) {
            const chartType = nextSettings.treeSettings.chartType;
            nextSettings.treeSettings = {
                ...nextSettings.treeSettings,
                chartType: normalizeChartType(chartType),
            };
        }
        return { ...state, ...nextSettings };
    }),
    setExportStatus: (status) => set({ exportStatus: status }),
    setActivityLogOpen: (open) => set({ isActivityLogOpen: open }),
    setIsLowGraphicsMode: (isLow) => set(() => {
        if (typeof window !== 'undefined') {
            try {
                const existing = localStorage.getItem('jozor-ui-storage');
                const parsed = existing ? JSON.parse(existing) : { state: {} };
                parsed.state = { ...parsed.state, isLowGraphicsMode: isLow };
                localStorage.setItem('jozor-ui-storage', JSON.stringify(parsed));
            } catch { /* ignore */ }
        }
        return { isLowGraphicsMode: isLow };
    }),
});
