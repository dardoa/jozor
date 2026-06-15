import { general } from './ar/general';
import { personFields } from './ar/personFields';
import { relationships } from './ar/relationships';
import { personDetails } from './ar/personDetails';
import { header } from './ar/header';
import { modals } from './ar/modals';
import { alerts } from './ar/alerts';
import { welcomeScreen } from './ar/welcomeScreen';
import { dateSelect } from './ar/dateSelect';
import { smartInput } from './ar/smartInput';
import { familyTree } from './ar/familyTree';
import { helpAr } from './ar/help';
import { notifications } from './ar/notifications';
import { landingPageAr } from './ar/landingPage';
import { landingPageArInfo } from './ar/infoPages';

export const ar = {
  ...general,
  ...personFields,
  ...relationships,
  ...personDetails,
  ...header,
  ...modals,
  ...alerts,
  ...welcomeScreen,
  ...dateSelect,
  ...smartInput,
  ...familyTree,
  notifications,
  help: helpAr,
  landingPage: landingPageAr,
  infoPages: landingPageArInfo,
};
