import { general as enGeneral } from './en/general';
import { personFields as enPersonFields } from './en/personFields';
import { relationships as enRelationships } from './en/relationships';
import { sidebar as enSidebar } from './en/sidebar';
import { header as enHeader } from './en/header';
import { modals as enModals } from './en/modals';
import { alerts as enAlerts } from './en/alerts';
import { welcomeScreen as enWelcomeScreen } from './en/welcomeScreen';
import { dateSelect as enDateSelect } from './en/dateSelect';
import { smartInput as enSmartInput } from './en/smartInput';
import { familyTree as enFamilyTree } from './en/familyTree';

export const translations = {
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