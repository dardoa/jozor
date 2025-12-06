import { useState, useEffect } from 'react';
import { Language } from '../types';

export const useLanguageSync = () => {
  const [language, setLanguage] = useState<Language>('ar'); // Default to Arabic as per existing logic

  // Initialize language from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedLanguage = (localStorage.getItem('language') as Language);
      if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'ar')) { // Validate saved language
        setLanguage(savedLanguage);
        console.log('useLanguageSync: Initial language from localStorage:', savedLanguage);
      } else {
        // Default to Arabic if no preference is found or saved language is invalid
        setLanguage('ar'); 
        console.log('useLanguageSync: Defaulting to Arabic.');
      }
    }
  }, []); // Empty dependency array for initialization

  // Persist language to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', language);
      console.log('useLanguageSync: Language changed and saved to localStorage:', language);
    }
  }, [language]);

  return { language, setLanguage };
};