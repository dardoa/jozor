import React, { createContext, useContext, useCallback } from 'react';
import { Language } from '../types';
import { getTranslation } from '../utils/translations';
import { useLanguageSync } from '../hooks/useLanguageSync';

interface TranslationContextType {
  t: any; // The translation object
  language: Language;
  setLanguage: (lang: Language) => void;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { language, setLanguage } = useLanguageSync();
  const t = getTranslation(language);

  const memoizedSetLanguage = useCallback(
    (lang: Language) => {
      setLanguage(lang);
    },
    [setLanguage]
  );

  return (
    <TranslationContext.Provider value={{ t, language, setLanguage: memoizedSetLanguage }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
