/// <reference types="vite/client" />
import { Person, Gender } from './types';

export const INITIAL_ROOT_ID = '00000000-0000-0000-0000-000000000001';
export const SPOUSE_ID = '00000000-0000-0000-0000-000000000002';
export const CHILD_ID = '00000000-0000-0000-0000-000000000003';
 
export const Z_INDEX = {
  BASE: 0,
  STICKY: 20,
  NAV: 50,
  DRAWER: 100,
  MODAL: 200,
  OVERLAY: 400,
  TIPS: 1000,
  TOAST: 2000,
  MAX: 9999,
} as const;

declare const __APP_VERSION__: string | undefined;

const resolvedAppVersion =
  typeof __APP_VERSION__ !== 'undefined' && __APP_VERSION__
    ? __APP_VERSION__
    : 'dev';
const viteEnv = (typeof import.meta !== 'undefined' ? import.meta.env : undefined) as ImportMetaEnv | undefined;

export const APP_VERSION = resolvedAppVersion;
export const GOOGLE_CLIENT_ID = viteEnv?.VITE_GOOGLE_CLIENT_ID;
export const GOOGLE_API_KEY = viteEnv?.VITE_GOOGLE_API_KEY;

export const FILE_NAME = 'MyTreeData.json';

export const EMPTY_STRING = '';
export const DEFAULT_ROLE = 'viewer';
export const DEFAULT_LANGUAGE = 'en';
export const DEFAULT_DIR = 'ltr';
export const DEFAULT_GENDER: Gender = 'male';
export const DEFAULT_LAYOUT_MODE = 'vertical';

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
  chartType: 'focus',
  theme: 'modern',
  privacyMode: false,

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
  nodeSpacingX: 120,
  nodeSpacingY: 400,
  nodeWidth: 170,
  textSize: 12,
  themeColor: '#E1AD01',
  boxColorLogic: 'gender',
  generationLimit: 6,
  isLowGraphicsMode: false,
};
