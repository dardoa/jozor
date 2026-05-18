import { Language } from './../types';

// Import all English translation modules
import { general as enGeneral } from './translations/en/general';
import { personFields as enPersonFields } from './translations/en/personFields';
import { relationships as enRelationships } from './translations/en/relationships';
import { personDetails as enPersonDetails } from './translations/en/personDetails';
import { header as enHeader } from './translations/en/header';
import { modals as enModals } from './translations/en/modals';
import { alerts as enAlerts } from './translations/en/alerts';
import { welcomeScreen as enWelcomeScreen } from './translations/en/welcomeScreen';
import { dateSelect as enDateSelect } from './translations/en/dateSelect';
import { smartInput as enSmartInput } from './translations/en/smartInput';
import { familyTree as enFamilyTree } from './translations/en/familyTree';
import { helpEn } from './translations/en/help';
import { notifications as enNotifications } from './translations/en/notifications';

// Import all Arabic translation modules
import { general as arGeneral } from './translations/ar/general';
import { personFields as arPersonFields } from './translations/ar/personFields';
import { relationships as arRelationships } from './translations/ar/relationships';
import { personDetails as arPersonDetails } from './translations/ar/personDetails';
import { header as arHeader } from './translations/ar/header';
import { modals as arModals } from './translations/ar/modals';
import { alerts as arAlerts } from './translations/ar/alerts';
import { welcomeScreen as arWelcomeScreen } from './translations/ar/welcomeScreen';
import { dateSelect as arDateSelect } from './translations/ar/dateSelect';
import { smartInput as arSmartInput } from './translations/ar/smartInput';
import { familyTree as arFamilyTree } from './translations/ar/familyTree';
import { helpAr } from './translations/ar/help';
import { notifications as arNotifications } from './translations/ar/notifications';

// Combine English translations
const en = {
  ...enGeneral,
  ...enPersonFields,
  ...enRelationships,
  ...enPersonDetails,
  ...enHeader,
  ...enModals,
  ...enAlerts,
  ...enWelcomeScreen,
  ...enDateSelect,
  ...enSmartInput,
  ...enFamilyTree,
  notifications: enNotifications,
  help: helpEn,
};

// Combine Arabic translations
const ar = {
  ...arGeneral,
  ...arPersonFields,
  ...arRelationships,
  ...arPersonDetails,
  ...arHeader,
  ...arModals,
  ...arAlerts,
  ...arWelcomeScreen,
  ...arDateSelect,
  ...arSmartInput,
  ...arFamilyTree,
  notifications: arNotifications,
  help: helpAr,
};

// Define the type based on the English translation object
export type TranslationSchema = typeof en;

const translations: Record<Language, TranslationSchema> = {
  en,
  ar,
};

/**
 * Retrieves the translation object for the specified language.
 * Falls back to English if the language is not found.
 */
export const getTranslation = (language: Language): TranslationSchema => {
  return translations[language] || en;
};
