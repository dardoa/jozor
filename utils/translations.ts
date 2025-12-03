import { Language } from './../types';
import { en } from './translations/en/index.ts';
import { ar } from './translations/ar/index.ts';

const translations: Record<Language, any> = {
  en,
  ar,
};

export const getTranslation = (language: Language) => {
  return translations[language] || en; // Fallback to English if language not found
};