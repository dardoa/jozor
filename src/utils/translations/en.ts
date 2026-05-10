import { general } from './en/general';
import { personFields } from './en/personFields';
import { relationships } from './en/relationships';
import { sidebar } from './en/sidebar';
import { header } from './en/header';
import { modals } from './en/modals';
import { alerts } from './en/alerts';
import { welcomeScreen } from './en/welcomeScreen';
import { dateSelect } from './en/dateSelect';
import { smartInput } from './en/smartInput';
import { familyTree } from './en/familyTree';
import { helpEn } from './en/help';
import { notifications } from './en/notifications';

export const en = {
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
  help: helpEn,
};

export type EnglishTranslation = typeof en;
