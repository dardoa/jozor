import { useState, useEffect } from 'react';
import { Language } from '../types';

export const useLanguageSync = () => {
  const [language, setLanguage] = useState<Language>('ar'); // Default to Arabic as per existing logic

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
  }, []); // Empty dependency array for initialization

  // Persist language to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', language);
    }
  }, [language]);

  return { language, setLanguage };
};