import { general } from './general.ts';
import { personFields } from './personFields.ts';
import { relationships } from './relationships.ts';
import { sidebar } from './sidebar.ts';
import { header } from './header.ts';
import { modals } from './modals.ts';
import { alerts } from './alerts.ts';
import { welcomeScreen } from './welcomeScreen.ts';
import { dateSelect } from './dateSelect.ts';
import { smartInput } from './smartInput.ts';
import { familyTree } from './familyTree.ts';

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
};