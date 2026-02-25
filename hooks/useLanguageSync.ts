import { useState, useEffect } from 'react';
import { Language } from '../types';

/**
 * Hook to manage language preference.
 * Persists preference to localStorage.
 */
export const useLanguageSync = () => {
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = localStorage.getItem('language') as Language;
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) {
        return savedLanguage;
      }
    }
    return 'ar';
  });

  // Persist language to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', language);
    }
  }, [language]);

  return { language, setLanguage };
};
