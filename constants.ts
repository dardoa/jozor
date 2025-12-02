
import { Person } from './types';

export const INITIAL_ROOT_ID = 'root-1';
export const SPOUSE_ID = 'spouse-1';
export const CHILD_ID = 'child-1';

// Google Client ID for OAuth authentication
export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "507220731712-kaiu4s8vsaf72bb7s11pgj9vs936rd01.apps.googleusercontent.com";

export const INITIAL_PERSON: Person = {
  id: INITIAL_ROOT_ID,
  title: '',
  firstName: 'Me',
  middleName: '',
  lastName: '',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '',
  birthPlace: '',
  birthSource: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  isDeceased: false,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  photoUrl: '',
  gallery: [],
  voiceNotes: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
  partnerDetails: {}
};

// Clean slate family (Just the root user)
export const SAMPLE_FAMILY: Record<string, Person> = {
  [INITIAL_ROOT_ID]: {
    ...INITIAL_PERSON,
    firstName: "Me",
    lastName: "",
    gender: "male"
  }
};

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' }
];
