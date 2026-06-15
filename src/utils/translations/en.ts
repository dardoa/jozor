import { general } from './en/general';
import { personFields } from './en/personFields';
import { relationships } from './en/relationships';
import { personDetails } from './en/personDetails';
import { header } from './en/header';
import { modals } from './en/modals';
import { alerts } from './en/alerts';
import { welcomeScreen } from './en/welcomeScreen';
import { dateSelect } from './en/dateSelect';
import { smartInput } from './en/smartInput';
import { familyTree } from './en/familyTree';
import { helpEn } from './en/help';
import { notifications } from './en/notifications';
import { landingPageEn } from './en/landingPage';
import { landingPageEnInfo } from './en/infoPages';

export const en = {
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
  help: helpEn,
  landingPage: landingPageEn,
  infoPages: landingPageEnInfo,
};

export type EnglishTranslation = typeof en;
