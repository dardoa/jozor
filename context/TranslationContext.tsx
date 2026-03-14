import React, { createContext, useContext, useCallback } from 'react';
import { Language } from '../types';
import { getTranslation } from '../utils/translations';
import { useAppStore } from '../store/useAppStore';
import { ar } from 'date-fns/locale/ar';
import { enUS } from 'date-fns/locale/en-US';

interface TranslationContextType {
  t: any; // The translation object
  language: Language;
  setLanguage: (lang: Language) => void;
  dateLocale: any;
}

export const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const language = useAppStore(state => state.language);
  const setStoreLanguage = useAppStore(state => state.setLanguage);
  const t = getTranslation(language);
  const locales: Record<string, any> = { ar, en: enUS };
  const dateLocale = locales[language] || enUS;

  const memoizedSetLanguage = useCallback(
    (lang: Language) => {
      setStoreLanguage(lang);
    },
    [setStoreLanguage]
  );

  return (
    <TranslationContext.Provider value={{ t, language, setLanguage: memoizedSetLanguage, dateLocale }}>
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
