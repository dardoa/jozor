import { general } from './ar/general';
import { personFields } from './ar/personFields';
import { relationships } from './ar/relationships';
import { sidebar } from './ar/sidebar';
import { header } from './ar/header';
import { modals } from './ar/modals';
import { alerts } from './ar/alerts';
import { welcomeScreen } from './ar/welcomeScreen';
import { dateSelect } from './ar/dateSelect';
import { smartInput } from './ar/smartInput';
import { familyTree } from './ar/familyTree';
import { helpAr } from './ar/help';
import { notifications } from './ar/notifications';

export const ar = {
  ...general,
  ...personFields,
  ...relationships,
  ...sidebar,
  ...header,
  ...modals,
  ...alerts,
  ...welcomeScreen,
  ...dateSelect,
  ...smartInput,
  ...familyTree,
  notifications,
  help: helpAr,
};
