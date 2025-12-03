import { Language } from './../types';

// Import all English translation modules
import { general as enGeneral } from './translations/en/general.ts';
import { personFields as enPersonFields } from './translations/en/personFields.ts';
import { relationships as enRelationships } from './translations/en/relationships.ts';
import { sidebar as enSidebar } from './translations/en/sidebar.ts';
import { header as enHeader } from './translations/en/header.ts';
import { modals as enModals } from './translations/en/modals.ts';
import { alerts as enAlerts } from './translations/en/alerts.ts';
import { welcomeScreen as enWelcomeScreen } from './translations/en/welcomeScreen.ts';
import { dateSelect as enDateSelect } from './translations/en/dateSelect.ts';
import { smartInput as enSmartInput } from './translations/en/smartInput.ts';
import { familyTree as enFamilyTree } from './translations/en/familyTree.ts';

// Import all Arabic translation modules
import { general as arGeneral } from './translations/ar/general.ts';
import { personFields as arPersonFields } from './translations/ar/personFields.ts';
import { relationships as arRelationships } from './translations/ar/relationships.ts';
import { sidebar as arSidebar } from './translations/ar/sidebar.ts';
import { header as arHeader } from './translations/ar/header.ts';
import { modals as arModals } from './translations/ar/modals.ts';
import { alerts as arAlerts } from './translations/ar/alerts.ts';
import { welcomeScreen as arWelcomeScreen } from './translations/ar/welcomeScreen.ts';
import { dateSelect as arDateSelect } from './translations/ar/dateSelect.ts';
import { smartInput as arSmartInput } from './translations/ar/smartInput.ts';
import { familyTree as arFamilyTree } from './translations/ar/familyTree.ts';

// Combine English translations
const en = {
  ...enGeneral,
  ...enPersonFields,
  ...enRelationships,
  ...enSidebar,
  ...enHeader,
  ...enModals,
  ...enAlerts,
  ...enWelcomeScreen,
  ...enDateSelect,
  ...enSmartInput,
  ...enFamilyTree,
};

// Combine Arabic translations
const ar = {
  ...arGeneral,
  ...arPersonFields,
  ...arRelationships,
  ...arSidebar,
  ...arHeader,
  ...arModals,
  ...arAlerts,
  ...arWelcomeScreen,
  ...arDateSelect,
  ...arSmartInput,
  ...arFamilyTree,
};

const translations: Record<Language, any> = {
  en,
  ar,
};

export const getTranslation = (language: Language) => {
  return translations[language] || en; // Fallback to English if language not found
};