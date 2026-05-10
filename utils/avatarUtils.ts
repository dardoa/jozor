import { Baby, User, UserCircle2, UserRound } from 'lucide-react';
import type { Gender, Person } from '../types';

export type AgeGroup = 'child' | 'youth' | 'adult' | 'senior';

interface PrivacyPlaceholderDescriptor {
  ageGroup: AgeGroup;
  Icon: typeof User;
  ariaLabel: string;
}

const AGE_GROUP_ICON_MAP: Record<Gender, Record<AgeGroup, typeof User>> = {
  male: {
    child: Baby,
    youth: UserCircle2,
    adult: User,
    senior: UserRound,
  },
  female: {
    child: Baby,
    youth: UserRound,
    adult: UserCircle2,
    senior: User,
  },
};

const FALLBACK_AGE_GROUP: AgeGroup = 'adult';

const parseYear = (dateValue?: string): number | null => {
  if (!dateValue) return null;

  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.getUTCFullYear();
};

/**
 * Derives a lightweight privacy age bucket from persisted person dates.
 * We intentionally keep this coarse so privacy mode avoids exposing exact ages
 * while still producing placeholders that feel context-aware in the tree.
 */
export const getAgeGroup = (
  birthDate: string,
  deathDate?: string,
  referenceDate: Date = new Date()
): AgeGroup => {
  const birthYear = parseYear(birthDate);
  if (!birthYear) return FALLBACK_AGE_GROUP;

  const endYear = parseYear(deathDate) ?? referenceDate.getUTCFullYear();
  const derivedAge = Math.max(0, endYear - birthYear);

  if (derivedAge <= 12) return 'child';
  if (derivedAge <= 20) return 'youth';
  if (derivedAge <= 60) return 'adult';
  return 'senior';
};

/**
 * Centralizes privacy placeholder selection so renderers stay presentation-only.
 * This keeps focus and radial nodes visually consistent without duplicating age
 * and gender derivation logic in every tree component.
 */
export const getPrivacyPlaceholderDescriptor = (
  person: Pick<Person, 'gender' | 'birthDate' | 'deathDate'>
): PrivacyPlaceholderDescriptor => {
  const ageGroup = getAgeGroup(person.birthDate, person.deathDate);
  const Icon = AGE_GROUP_ICON_MAP[person.gender]?.[ageGroup] ?? AGE_GROUP_ICON_MAP.male[FALLBACK_AGE_GROUP];

  return {
    ageGroup,
    Icon,
    ariaLabel: `Privacy placeholder: ${person.gender} ${ageGroup}`,
  };
};
