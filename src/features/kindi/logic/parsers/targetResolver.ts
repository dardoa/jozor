import type { Person } from '../../../../types';
import { normalizeKindiText } from './nameParser';

export type KindiTargetResolution =
  | { status: 'no_target'; candidates: Person[] }
  | { status: 'exact'; candidates: [Person] }
  | { status: 'ambiguous'; candidates: Person[] }
  | { status: 'not_found'; candidates: Person[] };

const getKindiFullName = (person: Person): string => {
  const extended = person as Person & { fatherName?: string; familyName?: string };
  return [
    person.firstName,
    person.middleName || extended.fatherName,
    person.lastName || extended.familyName,
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
};

const personSearchText = (person: Person): string => normalizeKindiText(getKindiFullName(person));

const personStrictNameParts = (person: Person) => ({
  first: normalizeKindiText(person.firstName),
  middle: normalizeKindiText(person.middleName || (person as Person & { fatherName?: string }).fatherName || ''),
  last: normalizeKindiText(person.lastName || (person as Person & { familyName?: string }).familyName || ''),
  nick: normalizeKindiText(person.nickName || ''),
});

const getPersonNameVariants = (person: Person): string[] => {
  const full = personSearchText(person);
  const parts = personStrictNameParts(person);

  return Array.from(new Set([
    full,
    [parts.first, parts.last].filter(Boolean).join(' '),
    [parts.first, parts.middle].filter(Boolean).join(' '),
    parts.nick,
    [parts.nick, parts.last].filter(Boolean).join(' '),
  ].map(normalizeKindiText).filter(Boolean)));
};

export const levenshteinDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a) return b.length;
  if (!b) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
};

export const isNormalizedNameMatch = (query: string, candidate: string): boolean => {
  if (!query || !candidate) return false;
  if (candidate === query) return true;
  if (candidate.startsWith(`${query} `) || query.startsWith(`${candidate} `)) return true;
  if (` ${candidate} `.includes(` ${query} `)) return true;

  const queryWords = query.split(/\s+/).filter(Boolean);
  const candidateWords = candidate.split(/\s+/).filter(Boolean);
  if (queryWords.length >= 2 && queryWords.every((word) => candidateWords.includes(word))) {
    return true;
  }

  const maxDistance = query.length <= 6 ? 1 : query.length <= 14 ? 2 : 3;
  return levenshteinDistance(query, candidate) <= maxDistance;
};

export const findKindiTargetCandidates = (targetText: string | undefined, people: Person[]): Person[] => {
  if (!targetText) return [];

  const normalizedTarget = normalizeKindiText(targetText);
  if (!normalizedTarget) return [];

  const targetWords = normalizedTarget.split(/\s+/).filter(Boolean);
  if (targetWords.length === 0) return [];
  const personOrder = new Map(people.map((person, index) => [person.id, index]));
  const sortResults = () =>
    results.sort((left, right) => (personOrder.get(left.id) ?? 0) - (personOrder.get(right.id) ?? 0));

  const results: Person[] = [];
  const addMatches = (matches: Person[]) => {
    for (const person of matches) {
      if (!results.some((candidate) => candidate.id === person.id)) {
        results.push(person);
      }
    }
  };

  addMatches(people.filter((person) =>
    getPersonNameVariants(person).some((variant) => variant === normalizedTarget)
  ));

  if (targetWords.length === 1) {
    const [firstWord] = targetWords;
    addMatches(people.filter((person) => {
      const parts = personStrictNameParts(person);
      return parts.first === firstWord || parts.nick === firstWord || parts.last === firstWord;
    }));

    if (results.length > 0) return sortResults();

    addMatches(people.filter((person) => {
      const parts = personStrictNameParts(person);
      return [parts.first, parts.nick].filter(Boolean).some((variant) =>
        isNormalizedNameMatch(firstWord, variant)
      );
    }));

    return sortResults();
  }

  addMatches(people.filter((person) => {
    const parts = personStrictNameParts(person);
    if (targetWords.length >= 2 && parts.first !== targetWords[0] && parts.nick !== targetWords[0]) {
      return false;
    }

    return getPersonNameVariants(person).some((variant) =>
      isNormalizedNameMatch(normalizedTarget, variant)
    );
  }));

  return sortResults();
};

export const resolveKindiCommandTarget = (
  targetText: string | undefined,
  people: Person[]
): KindiTargetResolution => {
  const normalizedTarget = normalizeKindiText(targetText);
  if (!normalizedTarget) {
    return { status: 'no_target', candidates: [] };
  }

  const candidates = findKindiTargetCandidates(targetText, people);
  if (candidates.length === 0) {
    return { status: 'not_found', candidates: [] };
  }

  if (candidates.length === 1) {
    return { status: 'exact', candidates: [candidates[0]] };
  }

  return { status: 'ambiguous', candidates };
};
