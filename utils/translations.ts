import { Language } from './../types';

// Import all English translation modules
import { general as enGeneral } from './translations/en/general';
import { personFields as enPersonFields } from './translations/en/personFields';
import { relationships as enRelationships } from './translations/en/relationships';
import { sidebar as enSidebar } from './translations/en/sidebar';
import { header as enHeader } from './translations/en/header';
import { modals as enModals } from './translations/en/modals';
import { alerts as enAlerts } from './translations/en/alerts';
import { welcomeScreen as enWelcomeScreen } from './translations/en/welcomeScreen';
import { dateSelect as enDateSelect } from './translations/en/dateSelect';
import { smartInput as enSmartInput } from './translations/en/smartInput';
import { familyTree as enFamilyTree } from './translations/en/familyTree';

// Import all Arabic translation modules
import { general as arGeneral } from './translations/ar/general';
import { personFields as arPersonFields } from './translations/ar/personFields';
import { relationships as arRelationships } from './translations/ar/relationships';
import { sidebar as arSidebar } from './translations/ar/sidebar';
import { header as arHeader } from './translations/ar/header';
import { modals as arModals } from './translations/ar/modals';
import { alerts as arAlerts } from './translations/ar/alerts';
import { welcomeScreen as arWelcomeScreen } from './translations/ar/welcomeScreen';
import { dateSelect as arDateSelect } from './translations/ar/dateSelect';
import { smartInput as arSmartInput } from './translations/ar/smartInput';
import { familyTree as arFamilyTree } from './translations/ar/familyTree';

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
  console.log('getTranslation: Called with language:', language);
  return translations[language] || en; // Fallback to English if language not found
};