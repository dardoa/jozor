/// <reference types="vite/client" />
import { Person, Gender } from './types';

export const INITIAL_ROOT_ID = 'root-1';
export const SPOUSE_ID = 'spouse-1';
export const CHILD_ID = 'child-1';

// @ts-expect-error - Global defined by build tool
export const APP_VERSION = __APP_VERSION__;
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export const FILE_NAME = 'MyTreeData.json';

export const DEFAULT_PERSON_TEMPLATE: Omit<Person, 'id'> = {
  title: '',
  firstName: 'New',
  middleName: '',
  lastName: 'Person',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '',
  birthPlace: '',
  birthSource: '',
  marriageDate: '',
  marriagePlace: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: false,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  photoUrl: '',
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],

  // Contact
  email: '',
  website: '',
  blog: '',
  address: '',

  // Relationships (stored as IDs)
  parents: [],
  spouses: [],
  children: [],

  partnerDetails: {},
};

export const INITIAL_PERSON: Person = {
  id: INITIAL_ROOT_ID,
  ...DEFAULT_PERSON_TEMPLATE,
  firstName: 'Me',
  lastName: '',
  gender: 'male',
};

export const SAMPLE_FAMILY: Record<string, Person> = {
  [INITIAL_ROOT_ID]: {
    ...INITIAL_PERSON,
    firstName: 'Me',
    lastName: '',
    gender: 'male',
  },
};

export const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

export const DEFAULT_TREE_SETTINGS: import('./types').TreeSettings = {
  showPhotos: true,
  showFirstName: true,
  showDates: true,
  showBirthDate: true,
  showMarriageDate: false,
  showDeathDate: true,
  showBirthPlace: false,
  showMarriagePlace: false,
  showBurialPlace: false,
  showResidence: false,
  showMiddleName: false,
  showLastName: true,
  showNickname: false,
  showMinimap: true,
  layoutMode: 'vertical',
  isCompact: false,
  chartType: 'descendant',
  theme: 'modern',
  enableForcePhysics: false,
  enableTimeOffset: false,
  timeScaleFactor: 5,
  lineStyle: 'curved',
  lineThickness: 2,
  showDeceased: true,
  showGender: true,
  showOccupation: false,
  showSuffix: false,
  showPrefix: false,
  showMaidenName: false,
  highlightBranch: false,
  highlightedBranchRootId: null,
  nodeSpacingX: 100,
  nodeSpacingY: 320,
  nodeWidth: 160,
  textSize: 12,
  themeColor: '#E1AD01',
  boxColorLogic: 'gender',
  generationLimit: 6,
  isLowGraphicsMode: false,
};
