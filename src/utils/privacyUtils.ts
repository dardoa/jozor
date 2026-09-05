import type { Person, RelationshipInfo } from '../types';

/**
 * Calculates the age of a person given their birth date string.
 * Supports formats: "YYYY", "YYYY-MM", "YYYY-MM-DD", or other standard parseable strings.
 * Returns -1 if the date cannot be parsed.
 */
export function calculateAge(birthDateStr: string | null | undefined): number {
  if (!birthDateStr) return -1;
  const trimmed = birthDateStr.trim();
  if (!trimmed) return -1;

  let date: Date;
  if (/^\d{4}$/.test(trimmed)) {
    date = new Date(`${trimmed}-01-01`);
  } else if (/^\d{4}-\d{2}$/.test(trimmed)) {
    date = new Date(`${trimmed}-01`);
  } else {
    date = new Date(trimmed);
  }

  if (Number.isNaN(date.getTime())) return -1;

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();
  const hasHadBirthday =
    now.getMonth() > date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() >= date.getDate());

  if (!hasHadBirthday) age -= 1;
  return age;
}

/**
 * Classifies a person as living/alive by default unless:
 * 1. They are explicitly marked as deceased (isDeceased is true).
 * 2. They have a non-empty deathDate.
 * 3. Their age calculated from birthDate exceeds 110 years.
 */
export function isPersonLiving(person: {
  isDeceased?: boolean;
  deathDate?: string | null;
  birthDate?: string | null;
}): boolean {
  if (person.isDeceased === true) return false;
  if (person.deathDate && person.deathDate.trim() !== '') return false;
  if (person.birthDate && person.birthDate.trim() !== '') {
    const age = calculateAge(person.birthDate);
    if (age > 110) return false;
  }
  return true;
}

/**
 * Returns true if a person should have their details masked.
 * Masking applies to living relatives or members explicitly marked as private.
 */
export function shouldMaskPerson(person: Person): boolean {
  return person.isPrivate === true || isPersonLiving(person);
}

/**
 * Scrubs a person's sensitive information (names replaced with 'Private',
 * dates/places/media/contacts cleared) if they should be masked.
 * Preserves structural identifiers, gender, relationships, and metadata.
 */
export function maskPerson(person: Person): Person {
  if (!shouldMaskPerson(person)) return person;

  // Safely scrub partnerDetails but keep relationship types and keys intact
  const maskedPartnerDetails: Record<string, RelationshipInfo> = {};
  if (person.partnerDetails) {
    for (const [spouseId, relInfo] of Object.entries(person.partnerDetails)) {
      maskedPartnerDetails[spouseId] = {
        type: relInfo.type,
        startDate: '',
        startPlace: '',
        endDate: '',
        endPlace: '',
      };
    }
  }

  return {
    ...person,
    // Mask name
    firstName: 'Private',
    middleName: '',
    lastName: '',
    birthName: '',
    nickName: '',
    title: '',
    suffix: '',

    // Clear dates, places, sources, bio
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
    currentResidence: '',
    occupation: '',
    workplace: '',
    profession: '',
    company: '',
    interests: '',
    bio: '',
    photoUrl: undefined,
    photoPath: undefined,
    photoAsset: undefined,
    photoVersion: undefined,
    gallery: [],
    voiceNotes: [],
    sources: [],
    events: [],
    email: '',
    website: '',
    blog: '',
    address: '',
    partnerDetails: maskedPartnerDetails,
    // Note: id, gender, parents, children, spouses, isDeceased, isPrivate, and metadata are preserved!
  };
}

/**
 * Masks all eligible people in a record.
 */
export function maskPeopleMap(people: Record<string, Person>): Record<string, Person> {
  const result: Record<string, Person> = {};
  for (const [id, person] of Object.entries(people)) {
    result[id] = maskPerson(person);
  }
  return result;
}
