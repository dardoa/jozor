import { addMonths, differenceInYears, isBefore, isValid, parseISO } from 'date-fns';
import type { Language, Person } from '../types';

export type SmartCheckSeverity = 'error' | 'warning' | 'info';

export type SmartCheckCode =
  | 'death_before_birth'
  | 'self_parent'
  | 'mother_under_13'
  | 'marriage_child_gap_under_5_months'
  | 'missing_birth_date'
  | 'missing_photo';

export interface SmartCheckIssue {
  code: SmartCheckCode;
  severity: SmartCheckSeverity;
  personId?: string;
}

const YEAR_ONLY_PATTERN = /^\d{4}$/;
const FULL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const parseLooseDate = (value?: string): Date | null => {
  if (!value) return null;

  const normalized = YEAR_ONLY_PATTERN.test(value.trim()) ? `${value.trim()}-01-01` : value.trim();
  const parsed = parseISO(normalized);
  return isValid(parsed) ? parsed : null;
};

const parseFullDate = (value?: string): Date | null => {
  if (!value || !FULL_DATE_PATTERN.test(value.trim())) {
    return null;
  }

  const parsed = parseISO(value.trim());
  return isValid(parsed) ? parsed : null;
};

const getMarriageDateForParents = (child: Person, people: Record<string, Person>): Date | null => {
  const parentIds = child.parents.filter(parentId => Boolean(people[parentId]));

  for (const parentId of parentIds) {
    const parent = people[parentId];

    for (const otherParentId of parentIds) {
      if (parentId === otherParentId) continue;

      const startDate =
        parent.partnerDetails?.[otherParentId]?.startDate ??
        people[otherParentId]?.partnerDetails?.[parentId]?.startDate;

      const parsed = parseFullDate(startDate);
      if (parsed) {
        return parsed;
      }
    }
  }

  return null;
};

const getMotherForChild = (child: Person, people: Record<string, Person>): Person | null => {
  for (const parentId of child.parents) {
    const parent = people[parentId];
    if (parent?.gender === 'female') {
      return parent;
    }
  }

  return null;
};

export const checkVitalDateConsistency = (person: Person): SmartCheckIssue[] => {
  const birthDate = parseLooseDate(person.birthDate);
  const deathDate = parseLooseDate(person.deathDate);

  if (!birthDate || !deathDate) {
    return [];
  }

  if (isBefore(deathDate, birthDate)) {
    return [{ code: 'death_before_birth', severity: 'error', personId: person.id }];
  }

  return [];
};

export const checkRelationshipAction = (params: {
  currentPersonId: string;
  existingId: string;
  relationType: 'parent' | 'spouse' | 'child' | null;
}): SmartCheckIssue[] => {
  const { currentPersonId, existingId, relationType } = params;

  if (relationType === 'parent' && currentPersonId === existingId) {
    return [{ code: 'self_parent', severity: 'error', personId: currentPersonId }];
  }

  return [];
};

export const checkRelationshipContext = (
  person: Person,
  people: Record<string, Person>
): SmartCheckIssue[] => {
  const issues: SmartCheckIssue[] = [];
  const personBirthDate = parseFullDate(person.birthDate);

  const mother = getMotherForChild(person, people);
  const motherBirthDate = mother ? parseLooseDate(mother.birthDate) : null;
  if (personBirthDate && motherBirthDate) {
    const motherAgeAtBirth = differenceInYears(personBirthDate, motherBirthDate);
    if (motherAgeAtBirth >= 0 && motherAgeAtBirth < 13) {
      issues.push({ code: 'mother_under_13', severity: 'warning', personId: person.id });
    }
  }

  const marriageDate = getMarriageDateForParents(person, people);
  if (personBirthDate && marriageDate && !isBefore(personBirthDate, marriageDate)) {
    if (isBefore(personBirthDate, addMonths(marriageDate, 5))) {
      issues.push({
        code: 'marriage_child_gap_under_5_months',
        severity: 'warning',
        personId: person.id,
      });
    }
  }

  return issues;
};

export const checkPersonSuggestions = (person: Person): SmartCheckIssue[] => {
  const issues: SmartCheckIssue[] = [];

  if (!person.birthDate?.trim()) {
    issues.push({ code: 'missing_birth_date', severity: 'info', personId: person.id });
  }

  if (!person.photoUrl?.trim()) {
    issues.push({ code: 'missing_photo', severity: 'info', personId: person.id });
  }

  return issues;
};

export const describeSmartCheckIssue = (
  issue: SmartCheckIssue,
  language: Language,
  personName?: string
): string => {
  const name = personName?.trim() || (language === 'ar' ? 'هذا الشخص' : 'this person');

  const messages = {
    ar: {
      death_before_birth: 'لا يمكن حفظ تاريخ وفاة يسبق تاريخ الميلاد.',
      self_parent: 'لا يمكن ربط الشخص كأب أو أم لنفسه.',
      mother_under_13: `تحذير: عُمر الأم عند ولادة ${name} يبدو أقل من 13 سنة.`,
      marriage_child_gap_under_5_months: `تحذير: الفارق بين الزواج وولادة ${name} أقل من 5 أشهر.`,
      missing_birth_date: `اقتراح: أضف تاريخ ميلاد لـ ${name}.`,
      missing_photo: `اقتراح: أضف صورة لـ ${name}.`,
    },
    en: {
      death_before_birth: 'Cannot save a death date earlier than the birth date.',
      self_parent: 'A person cannot be added as their own parent.',
      mother_under_13: `Warning: the mother appears to be younger than 13 at ${name}'s birth.`,
      marriage_child_gap_under_5_months: `Warning: the gap between marriage and ${name}'s birth is under 5 months.`,
      missing_birth_date: `Suggestion: add a birth date for ${name}.`,
      missing_photo: `Suggestion: add a photo for ${name}.`,
    },
  } as const;

  return messages[language][issue.code];
};
