import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Language } from '../types'; // Import Language type
import { getTranslation } from '../utils/translations'; // Import getTranslation

// Define the types for the context values
interface ThemeLanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  darkMode: boolean;
  setDarkMode: (isDark: boolean) => void;
}

interface TranslationContextType {
  t: any; // The translation object
  themeLanguage: ThemeLanguageContextType;
}

// Create the context
const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// TranslationProvider component
export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Initialize language from localStorage or default to 'en'
    return (localStorage.getItem('language') as Language) || 'en';
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
    console.log(`[TranslationContext] Language set to: ${language}, dir: ${document.documentElement.dir}`);
  }, [language]);

  // Effect to apply/remove 'dark' class to the HTML element
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
      console.log('[TranslationContext] Dark mode ON. HTML classList:', document.documentElement.classList.value);
    } else {
      document.documentElement.classList.remove('dark');
      console.log('[TranslationContext] Dark mode OFF. HTML classList:', document.documentElement.classList.value);
    }
  }, [darkMode]);

  // Memoize translations to avoid unnecessary re-renders
  const t = useMemo(() => {
    return getTranslation(language);
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