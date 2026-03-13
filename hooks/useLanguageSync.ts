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

  // Persist language to localStorage and update document attributes whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', language);
      
      // Update HTML attributes for RTL/LTR support
      document.documentElement.lang = language;
      document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    }
  }, [language]);

  return { language, setLanguage };
};
