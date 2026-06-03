import { Person, Gender } from '../types';
import { DEFAULT_PERSON_TEMPLATE } from '../constants';
import { sanitizeExternalUrl } from './safeUrl';

/**
 * Creates a new Person object with default values.
 * @param gender The gender of the new person.
 * @returns A fully initialized Person object.
 */
export const createPerson = (gender: Gender = 'male'): Person => ({
  id: crypto.randomUUID(),
  ...DEFAULT_PERSON_TEMPLATE,
  gender,
  firstName: 'New',
  lastName: 'Person',
});

/**
 * Validates and sanitizes a partial Person object, ensuring all required arrays and fields exist.
 * Useful when importing data from external sources.
 * @param p Partial Person object.
 * @returns Validated Person object.
 */
export const validatePerson = (p: Partial<Person>): Person => {
  const defaults = createPerson(p.gender || 'male');
  const sources = Array.isArray(p.sources)
    ? p.sources.map((source) => ({
      ...source,
      url: sanitizeExternalUrl(source.url),
    }))
    : [];

  return {
    ...defaults,
    ...p,
    id: p.id || defaults.id,
    parents: Array.isArray(p.parents) ? p.parents : [],
    spouses: Array.isArray(p.spouses) ? p.spouses : [],
    children: Array.isArray(p.children) ? p.children : [],
    gallery: Array.isArray(p.gallery) ? p.gallery : [],
    voiceNotes: Array.isArray(p.voiceNotes) ? p.voiceNotes : [],
    sources,
    events: Array.isArray(p.events) ? p.events : [],
    partnerDetails: p.partnerDetails || {},
    // Ensure vital strings exist
    firstName: p.firstName ?? '',
    lastName: p.lastName ?? '',
    birthSource: p.birthSource ?? '',
    deathSource: p.deathSource ?? '',
  };
};

/**
 * Extracts the display year from a date string.
 * Supports ISO dates (YYYY-MM-DD) or simple year strings.
 * @param dateStr The date string to parse.
 * @returns The year as a string, or the original string if parsing fails.
 */
export const getDisplayDate = (dateStr: string): string => {
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

/**
 * Constructs the full name of a person.
 * @param p The person object.
 * @returns The full name string.
 */
export const getFullName = (p?: Person): string => {
  if (!p) return 'Unknown';
  const parts = [p.title, p.firstName, p.middleName, p.lastName, p.suffix].filter(Boolean);
  return parts.join(' ');
};

/**
 * Formats the birth and death years for display.
 * @param p The person object.
 * @param format The format to use for dates.
 * @returns A formatted string like "(b. 1990)" or "(1990 - 2020)".
 */
export const getYears = (p: Person, _format: 'iso' | 'eu' | 'us' | 'long' = 'iso'): string => {
  const b = getDisplayDate(p.birthDate);
  if (!b && !p.deathDate) return '';

  if (p.isDeceased) {
    const d = getDisplayDate(p.deathDate) || '?';
    return `(${b || '?'} - ${d})`;
  }
  return b ? `(b. ${b})` : '';
};

/**
 * Helper to get birth year for sorting, handling missing dates.
 * Missing dates are treated as "infinity" (sorted last).
 */
const getBirthYearForSort = (person: Person): number => {
  if (!person.birthDate) return Infinity;
  const year = parseInt(getDisplayDate(person.birthDate), 10);
  return isNaN(year) ? Infinity : year;
};

/**
 * Sorts a list of people by birth date (oldest first).
 * @param peopleList Array of Person objects.
 * @returns Sorted array of Person objects.
 */
export const sortPeopleByBirthDate = (peopleList: Person[]): Person[] => {
  return [...peopleList].sort((a, b) => {
    const yearA = getBirthYearForSort(a);
    const yearB = getBirthYearForSort(b);
    return yearA - yearB;
  });
};



/**
 * Formats a date string according to the specified format.
 * @param dateStr ISO date string or partial string.
 * @param format The desired format ('iso', 'eu', 'us', 'long').
 */
export const formatDate = (dateStr: string, format: 'iso' | 'eu' | 'us' | 'long' = 'iso'): string => {
  if (!dateStr) return '';

  // Try to parse as Date object first
  const date = new Date(dateStr);
  const isValid = !isNaN(date.getTime());

  if (!isValid) return dateStr; // Return as-is if not valid date

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  const pad = (n: number) => n.toString().padStart(2, '0');

  switch (format) {
    case 'eu': // DD/MM/YYYY
      return `${pad(day)}/${pad(month)}/${year}`;
    case 'us': // MM/DD/YYYY
      return `${pad(month)}/${pad(day)}/${year}`;
    case 'long': // DD MMM YYYY
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    case 'iso':
    default:
      return dateStr; // Already mostly ISO or close enough
  }
};
