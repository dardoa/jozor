/**
 * DEPRECATED: Use global store (state.language) and LanguageDomSync in index.tsx instead.
 * This hook is preserved as an empty shell during the Sovereign Store migration 
 * to prevent immediate build breakage, but it should not be used.
 */
export const useLanguageSync = () => {
  console.warn('useLanguageSync is deprecated. Use useAppStore((s) => s.language) instead.');
  return { language: 'ar', setLanguage: () => {} };
};
