import { DEFAULT_TREE_SETTINGS } from '../../constants';
export const createSettingsSlice = (set) => ({
    // Initial State
    treeSettings: DEFAULT_TREE_SETTINGS,
    darkMode: false,
    language: 'en',
    exportStatus: { isExporting: false },
    isActivityLogOpen: false,
    // Actions
    setTreeSettings: (settings) => set((state) => ({
        treeSettings: typeof settings === 'function' ? settings(state.treeSettings) : settings
    })),
    setDarkMode: (dark) => set({ darkMode: dark }),
    setLanguage: (lang) => set(() => {
        if (typeof window !== 'undefined') {
            localStorage.setItem('language', lang);
            document.documentElement.lang = lang;
            document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
        }
        return { language: lang };
    }),
    importSettings: (settings) => set((state) => ({ ...state, ...settings })),
    setExportStatus: (status) => set({ exportStatus: status }),
    setActivityLogOpen: (open) => set({ isActivityLogOpen: open }),
});
