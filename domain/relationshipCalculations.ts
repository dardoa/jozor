import { parseISO, differenceInYears, isValid } from 'date-fns';

/**
 * Parses a date string safely. It can handle full ISO dates or just year strings like '1945'.
 * Returns a valid Date object or null if invalid or missing.
 *
 * @param dateStr - The date string from Person data
 * @returns Date object or null
 */
const parseSafeDate = (dateStr?: string | null): Date | null => {
  if (!dateStr) return null;
  
  // Handle just a year string e.g. "1945"
  let formattedMatch = dateStr.trim();
  if (/^\d{4}$/.test(formattedMatch)) {
    formattedMatch = `${formattedMatch}-01-01`;
  }
  
  const parsedDate = parseISO(formattedMatch);
  return isValid(parsedDate) ? parsedDate : null;
};

/**
 * Calculates the age difference in years between two birth dates.
 * Returns null if either date is invalid or missing.
 *
 * @param birthDate1 - The first birth date string
 * @param birthDate2 - The second birth date string
 * @returns Number of years difference or null
 */
export const calculateAgeDifference = (
  birthDate1?: string,
  birthDate2?: string
): number | null => {
  const d1 = parseSafeDate(birthDate1);
  const d2 = parseSafeDate(birthDate2);
  
  if (!d1 || !d2) return null;
  
  return Math.abs(differenceInYears(d1, d2));
};

/**
 * Calculates a person's age at a specific event date.
 * Useful for calculating age at marriage, or age at first child's birth.
 *
 * @param birthDate - The person's birth date string
 * @param eventDate - The event date string
 * @returns Number of years at the event or null
 */
export const calculateAgeAtEvent = (
  birthDate?: string,
  eventDate?: string
): number | null => {
  const bd = parseSafeDate(birthDate);
  const ed = parseSafeDate(eventDate);
  
  if (!bd || !ed) return null;
  
  const diff = differenceInYears(ed, bd);
  return diff >= 0 ? diff : null; // Prevent negative ages for events before birth
};
