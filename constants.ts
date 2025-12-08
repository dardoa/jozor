import { Person } from './types';

export const INITIAL_ROOT_ID = 'root-1';
export const SPOUSE_ID = 'spouse-1';
export const CHILD_ID = 'child-1';

// Google Client ID for OAuth authentication
// IMPORTANT: This should be set via environment variables (e.g., .env.local)
// and never hardcoded in production.
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

// Add this console log to check the value
console.log('GOOGLE_CLIENT_ID from constants.ts:', GOOGLE_CLIENT_ID);

// Default file name for Google Drive sync
export const FILE_NAME = 'MyFamilyTree.json'; // Updated to MyFamilyTree.json

// Template for a new person, without an ID
export const DEFAULT_PERSON_TEMPLATE: Omit<Person, 'id'> = {
  title: '',
  firstName: 'New', // Default first name for new person
  middleName: '',
  lastName: 'Person', // Default last name for new person
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male', // Default gender
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
  sources: [],
  events: [], // New: Initialize as empty array

  // Contact
  email: '',
  website: '',
  blog: '',
  address: '',
  
  // Relationships (stored as IDs)
  parents: [],
  spouses: [],
  children: [],
  
  // Metadata for relationships (Keyed by Spouse ID)
  partnerDetails: {}
};

// Initial root person, using the template
export const INITIAL_PERSON: Person = {
  id: INITIAL_ROOT_ID,
  ...DEFAULT_PERSON_TEMPLATE,
  firstName: 'Me',
  lastName: '',
  gender: "male"
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