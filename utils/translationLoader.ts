import type { Language } from '../types';
import type { EnglishTranslation } from './translations/en';

export type TranslationSchema = EnglishTranslation;

export const loadTranslation = async (language: Language): Promise<TranslationSchema> => {
  if (language === 'ar') {
    return (await import('./translations/ar')).ar;
  }

  return (await import('./translations/en')).en;
};
