import type { Person } from '../../../types/person';
import { getFullName } from '../../../utils/familyLogic';
import { normalizeKindiCommandText } from './kindiCommandLexicon';

export const normalizeKindiPersonMentionText = (value: string): string =>
  normalizeKindiCommandText(value)
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .toLocaleLowerCase();

const getMentionVariants = (person: Person): string[] => {
  const fullName = normalizeKindiPersonMentionText(getFullName(person));
  const firstAndLast = normalizeKindiPersonMentionText(
    [person.firstName, person.lastName].filter(Boolean).join(' ')
  );
  const nickname = normalizeKindiPersonMentionText(person.nickName ?? '');

  return Array.from(new Set([fullName, firstAndLast, nickname].filter((value) =>
    Boolean(value) && (value === nickname || value.split(' ').length >= 2)
  )));
};

const containsPhrase = (query: string, phrase: string): boolean =>
  ` ${query} `.includes(` ${phrase} `);

export const findKindiMentionedPeople = (
  query: string,
  people: readonly Person[]
): Person[] => {
  const normalizedQuery = normalizeKindiPersonMentionText(query);
  return people
    .filter((person) => getMentionVariants(person)
      .some((variant) => containsPhrase(normalizedQuery, variant)))
    .sort((left, right) => getFullName(left).localeCompare(getFullName(right)));
};
