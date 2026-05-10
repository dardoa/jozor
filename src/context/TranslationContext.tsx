import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import type { Locale } from 'date-fns';
import { Language } from '../types';
import { loadTranslation, type TranslationSchema } from '../utils/translationLoader';
import { useAppStore } from '../store/useAppStore';

interface TranslationContextType {
  t: TranslationSchema;
  language: Language;
  setLanguage: (lang: Language) => void;
  dateLocale?: Locale;
}

export const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const language = useAppStore(state => state.language);
  const setStoreLanguage = useAppStore(state => state.setLanguage);
  const [t, setTranslation] = useState<TranslationSchema | undefined>();
  const [dateLocale, setDateLocale] = useState<Locale | undefined>();


  useEffect(() => {
    let isActive = true;

    const loadLanguageAssets = async () => {
      const [translation, locale] = await Promise.all([
        loadTranslation(language).catch(() => loadTranslation('en')),
        language === 'ar'
          ? import('date-fns/locale/ar').then((module) => module.ar)
          : import('date-fns/locale/en-US').then((module) => module.enUS),
      ]);

      if (isActive) {
        setTranslation(translation);
        setDateLocale(locale);
      }
    };

    setTranslation(undefined);
    setDateLocale(undefined);
    void loadLanguageAssets();

    return () => {
      isActive = false;
    };
  }, [language]);

  const memoizedSetLanguage = useCallback(
    (lang: Language) => {
      setStoreLanguage(lang);
    },
    [setStoreLanguage]
  );

  if (!t) {
    // Native splash in index.html covers this state
    return null;
  }

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
