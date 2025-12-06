import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { translations as enTranslations } from '../utils/translations/en'; // Corrected path
import { translations as arTranslations } from '../utils/translations/ar'; // Corrected path

// Define the types for the context values
interface ThemeLanguageContextType {
  language: 'en' | 'ar';
  setLanguage: (lang: 'en' | 'ar') => void;
  darkMode: boolean;
  setDarkMode: (isDark: boolean) => void;
}

interface TranslationContextType {
  t: typeof enTranslations; // Assuming enTranslations has the full structure
  themeLanguage: ThemeLanguageContextType;
}

// Create the context
const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// TranslationProvider component
export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<'en' | 'ar'>(() => {
    // Initialize language from localStorage or default to 'en'
    return (localStorage.getItem('language') as 'en' | 'ar') || 'en';
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Initialize dark mode from localStorage or system preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return JSON.parse(savedMode);
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Effect to update language and direction on HTML element
  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  // Effect to apply/remove 'dark' class to the HTML element
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Memoize translations to avoid unnecessary re-renders
  const t = useMemo(() => {
    return language === 'en' ? enTranslations : arTranslations;
  }, [language]);

  // Memoize theme and language settings
  const themeLanguage = useMemo(() => ({
    language,
    setLanguage,
    darkMode,
    setDarkMode,
  }), [language, setLanguage, darkMode, setDarkMode]);

  return (
    <TranslationContext.Provider value={{ t, themeLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
};

// Custom hook to use the TranslationContext
export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};