import { useEffect } from 'react';
import { Language } from '../types';

export const useLanguageSync = (language: Language, setLanguage: (l: Language) => void) => {
  useEffect(() => {
    const root = document.documentElement;
    const dir = language === 'ar' ? 'rtl' : 'ltr';
    root.setAttribute('dir', dir);
    root.setAttribute('lang', language);
    localStorage.setItem('language', language);
  }, [language]);

  // Initialize language from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = (localStorage.getItem('language') as Language);
      if (savedLanguage) {
        setLanguage(savedLanguage);
      } else {
        // Default to Arabic if no preference is found
        setLanguage('ar');
      }
    }
  }, [setLanguage]);
};