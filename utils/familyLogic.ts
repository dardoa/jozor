import { Person } from '../types';
import { DEFAULT_PERSON_TEMPLATE } from '../constants'; // Import the new template

export const createPerson = (gender: 'male' | 'female' = 'male'): Person => ({
  id: crypto.randomUUID(),
  ...DEFAULT_PERSON_TEMPLATE, // Use the template for default values
  gender, // Override gender if provided
  firstName: 'New', // Default first name for new person
  lastName: 'Person', // Default last name for new person
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
    voiceNotes: Array.isArray(p.voiceNotes) ? p.voiceNotes : [], // Ensure voiceNotes is array
    sources: Array.isArray(p.sources) ? p.sources : [], // Ensure sources is array
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

// New helper to get birth year for sorting, handling missing dates
const getBirthYearForSort = (person: Person): number => {
  if (!person.birthDate) return Infinity; // Treat missing birth date as very "young" for sorting (put at end)
  const year = parseInt(getDisplayDate(person.birthDate));
  return isNaN(year) ? Infinity : year;
};

// New utility function to sort people by birth date (oldest first)
export const sortPeopleByBirthDate = (peopleList: Person[]): Person[] => {
  return [...peopleList].sort((a, b) => {
    const yearA = getBirthYearForSort(a);
    const yearB = getBirthYearForSort(b);
    return yearA - yearB;
  });
};