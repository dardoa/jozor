import { general as arGeneral } from './ar/general';
import { personFields as arPersonFields } from './ar/personFields';
import { relationships as arRelationships } from './ar/relationships';
import { sidebar as arSidebar } from './ar/sidebar';
import { header as arHeader } from './ar/header';
import { modals as arModals } from './ar/modals';
import { alerts as arAlerts } from './ar/alerts';
import { welcomeScreen as arWelcomeScreen } from './ar/welcomeScreen';
import { dateSelect as arDateSelect } from './ar/dateSelect';
import { smartInput as arSmartInput } from './ar/smartInput';
import { familyTree as arFamilyTree } from './ar/familyTree';

export const translations = {
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