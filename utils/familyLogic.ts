
import { Person } from '../types';

export const createPerson = (gender: 'male' | 'female' = 'male'): Person => ({
  id: crypto.randomUUID(),
  title: '',
  firstName: 'New',
  middleName: '',
  lastName: 'Person',
  birthName: '',
  nickName: '',
  suffix: '',
  gender,
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
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
  partnerDetails: {}
});

// Ensures a person object has all required fields (useful for imported data)
export const validatePerson = (p: Partial<Person>): Person => {
  const defaults = createPerson(p.gender || 'male');
  return {
    ...defaults,
    ...p,
    id: p.id || defaults.id,
    parents: Array.isArray(p.parents) ? p.parents : [],
    spouses: Array.isArray(p.spouses) ? p.spouses : [],
    children: Array.isArray(p.children) ? p.children : [],
    gallery: Array.isArray(p.gallery) ? p.gallery : [],
    partnerDetails: p.partnerDetails || {},
    // Ensure vital strings exist
    firstName: p.firstName ?? '',
    lastName: p.lastName ?? '',
    birthSource: p.birthSource ?? '',
    deathSource: p.deathSource ?? '',
  };
};

// Helper to calculate age or return generic string
export const getDisplayDate = (dateStr: string) => {
  if (!dateStr) return '';
  
  // If we have a hyphen, extract the first part (Year)
  const parts = dateStr.split('-');
  if (parts.length > 0 && parts[0].length === 4) {
      return parts[0];
  }
  
  // Fallback for standard date parsing
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
      return d.getFullYear().toString();
  }
  
  return dateStr;
};

export const getFullName = (p?: Person) => {
  if (!p) return 'Unknown';
  const parts = [p.title, p.firstName, p.middleName, p.lastName, p.suffix].filter(Boolean);
  return parts.join(' ');
};

export const getYears = (p: Person) => {
  const b = getDisplayDate(p.birthDate);
  if (!b && !p.deathDate) return '';
  
  if (p.isDeceased) {
    const d = getDisplayDate(p.deathDate) || '?';
    return `(${b || '?'} - ${d})`;
  }
  return b ? `(b. ${b})` : '';
};
