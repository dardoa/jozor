import { StateCreator } from 'zustand';
import { TreeSettings } from '../../types';
import { DEFAULT_TREE_SETTINGS } from '../../constants';

export interface SettingsSlice {
    // State
    treeSettings: TreeSettings;
    darkMode: boolean;
    language: 'en' | 'ar';
    exportStatus: { isExporting: boolean; progress?: number; format?: string };
    isActivityLogOpen: boolean;

    // Actions
    setTreeSettings: (settings: TreeSettings | ((prev: TreeSettings) => TreeSettings)) => void;
    setDarkMode: (dark: boolean) => void;
    setLanguage: (lang: 'en' | 'ar') => void;
    importSettings: (settings: Partial<SettingsSlice>) => void;
    setExportStatus: (status: { isExporting: boolean; progress?: number; format?: string }) => void;
    setActivityLogOpen: (open: boolean) => void;
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

    // Actions
    setTreeSettings: (settings) => set((state) => ({
        // Always merge with defaults so Appearance Lab presets can update
        // partial groups safely without reviving stale legacy fields.
        treeSettings: {
            ...DEFAULT_TREE_SETTINGS,
            ...(typeof settings === 'function' ? settings(state.treeSettings) : settings),
        },
    })),
    setDarkMode: (dark) => set({ darkMode: dark }),
    setLanguage: (lang) => set(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', lang);
        }
        return { language: lang };
    }),
    importSettings: (settings) => set((state) => ({ ...state, ...settings })),
    setExportStatus: (status) => set({ exportStatus: status }),
    setActivityLogOpen: (open) => set({ isActivityLogOpen: open }),
});
