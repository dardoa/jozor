/**
 * DEPRECATED: Use global store (state.darkMode) and ThemeDomSync in index.tsx instead.
 * This hook is preserved as an empty shell during the Sovereign Store migration 
 * to prevent immediate build breakage, but it should not be used.
 */
export const useThemeSync = () => {
  console.warn('useThemeSync is deprecated. Use useAppStore((s) => s.darkMode) instead.');
  return { darkMode: false, setDarkMode: () => {} };
};
