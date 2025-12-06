import { Language } from './../types';

// Import all English translation modules
import { general as enGeneral } from '../../utils/translations/en/general';
import { personFields as enPersonFields } from '../../utils/translations/en/personFields';
import { relationships as enRelationships } from '../../utils/translations/en/relationships';
import { sidebar as enSidebar } from '../../utils/translations/en/sidebar';
import { header as enHeader } from '../../utils/translations/en/header';
import { modals as enModals } from '../../utils/translations/en/modals';
import { alerts as enAlerts } from '../../utils/translations/en/alerts';
import { welcomeScreen as enWelcomeScreen } from '../../utils/translations/en/welcomeScreen';
import { dateSelect as enDateSelect } from '../../utils/translations/en/dateSelect';
import { smartInput as enSmartInput } from '../../utils/translations/en/smartInput';
import { familyTree as enFamilyTree } from '../../utils/translations/en/familyTree';

// Import all Arabic translation modules
import { general as arGeneral } from '../../utils/translations/ar/general';
import { personFields as arPersonFields } from '../../utils/translations/ar/personFields';
import { relationships as arRelationships } from '../../utils/translations/ar/relationships';
import { sidebar as arSidebar } from '../../utils/translations/ar/sidebar';
import { header as arHeader } from '../../utils/translations/ar/header';
import { modals as arModals } from '../../utils/translations/ar/modals';
import { alerts as arAlerts } from '../../utils/translations/ar/alerts';
import { welcomeScreen as arWelcomeScreen } from '../../utils/translations/ar/welcomeScreen';
import { dateSelect as arDateSelect } from '../../utils/translations/ar/dateSelect';
import { smartInput as arSmartInput } from '../../utils/translations/ar/smartInput';
import { familyTree as arFamilyTree } from '../../utils/translations/ar/familyTree';

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