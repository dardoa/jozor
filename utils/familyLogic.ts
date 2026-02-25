import { Person, Gender } from '../types';
import { DEFAULT_PERSON_TEMPLATE } from '../constants';

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
  return {
    ...defaults,
    ...p,
    id: p.id || defaults.id,
    parents: Array.isArray(p.parents) ? p.parents : [],
    spouses: Array.isArray(p.spouses) ? p.spouses : [],
    children: Array.isArray(p.children) ? p.children : [],
    gallery: Array.isArray(p.gallery) ? p.gallery : [],
    voiceNotes: Array.isArray(p.voiceNotes) ? p.voiceNotes : [],
    sources: Array.isArray(p.sources) ? p.sources : [],
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
export const getYears = (p: Person, format: 'iso' | 'eu' | 'us' | 'long' = 'iso'): string => {
  // If format is ISO, we just show year (old behavior) or full date?
  // Actually, usually nodes just show years (1990 - 2020).
  // If the user wants full dates on nodes, that's a different setting?
  // The user requirement says "Change date format -> verify all dates update".
  // Node cards usually show years only for space.
  // BUT if I change format, maybe they want full dates?
  // Let's assume on nodes we keep Years Only for standard view, but maybe "long" format implies full date?
  // Actually, standard genealogy nodes usually just show years.
  // Let's just use `formatDate` but extracting year if the format is not ISO?
  // Wait, `getDisplayDate` extracts YEAR.
  // If I want to support full dates on nodes, I should use `formatDate`.
  // But space is tight.
  // Let's stick to Years Only for getYears, BUT if format is provided, maybe we interpret it?
  // Actually, maybe `getYears` should just use `formatDate` if `showDates` is on?
  // Existing `getYears` implementation:
  // const b = getDisplayDate(p.birthDate); // returns YEAR

  // If I change this to full date, it might break layout.
  // Let's keep `getYears` returning YEARS, but maybe improve parsing?
  // Or maybe "Date Format" applies to "Birth Date: ..." details, not the node years?
  // "Change date format -> verify all dates update throughout app".
  // If I change it to DD/MM/YYYY, seeing 1990 is fine.
  // So `getYears` might remain YEAR ONLY.
  // Except if `p.birthDate` is `1990-01-01`, `getDisplayDate` returns `1990`.
  // This seems correct for nodes.

  // However, Sidebar InfoTab shows full dates.

  // So I will NOT change `getYears` to return full dates, because that would clutter the node.
  // I will leave `getYears` as is (returning years).
  // I will ONLY update places that show FULL dates.

  // Wait, if I do that, `getYears` doesn't need `format`.

  // BUT the user said "verify ALL dates update".
  // If the node shows "b. 1990", that's year, not date.
  // I think it's acceptable to keep nodes as years.

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
 * Recursively finds all direct ancestors of a person.
 * @param personId The ID of the person to find ancestors for.
 * @param people The record of all people.
 * @param visited Set of visited IDs to prevent infinite loops.
 * @returns A Set of ancestor IDs.
 */
export const getAncestors = (
  personId: string,
  people: Record<string, Person>,
  visited = new Set<string>()
): Set<string> => {
  if (visited.has(personId)) return visited;
  visited.add(personId);

  const person = people[personId];
  if (!person) return visited;

  // Safety check for parents array
  if (Array.isArray(person.parents)) {
    for (const parentId of person.parents) {
      getAncestors(parentId, people, visited);
    }
  }

  return visited;
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
