import type { Person } from '../../../../types/person';
import { normalizeKindiText } from './nameParser';

export type KindiTargetResolution =
  | { status: 'no_target'; candidates: Person[] }
  | { status: 'exact'; candidates: [Person] }
  | { status: 'ambiguous'; candidates: Person[] }
  | { status: 'not_found'; candidates: Person[] };

const CONTEXT_TARGET_REFERENCES = new Set([
  'this person',
  'the selected person',
  'selected person',
  'the focused person',
  'focused person',
  'هذا الشخص',
  'هذه الشخص',
  'الشخص المحدد',
  'الشخص المحدده',
  'المحدد',
  'المحدده',
].map((reference) => normalizeKindiText(reference)));

export const isKindiContextTargetReference = (targetText: string | undefined): boolean =>
  Boolean(targetText && CONTEXT_TARGET_REFERENCES.has(normalizeKindiText(targetText)));

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

interface IndexedKindiPerson {
  person: Person;
  order: number;
  parts: ReturnType<typeof personStrictNameParts>;
  variants: string[];
}

interface KindiTargetIndex {
  indexedPeople: IndexedKindiPerson[];
  exactVariantMatches: Map<string, Person[]>;
  singleWordMatches: Map<string, Person[]>;
  leadingWordMatches: Map<string, IndexedKindiPerson[]>;
  orderById: Map<string, number>;
}

const targetIndexCache = new WeakMap<Person[], KindiTargetIndex>();

const pushUnique = (map: Map<string, Person[]>, key: string, person: Person) => {
  if (!key) return;
  const existing = map.get(key);
  if (existing) {
    existing.push(person);
    return;
  }

  map.set(key, [person]);
};

const pushIndexed = (map: Map<string, IndexedKindiPerson[]>, key: string, indexedPerson: IndexedKindiPerson) => {
  if (!key) return;
  const existing = map.get(key);
  if (existing) {
    existing.push(indexedPerson);
    return;
  }

  map.set(key, [indexedPerson]);
};

const getKindiTargetIndex = (people: Person[]): KindiTargetIndex => {
  const cached = targetIndexCache.get(people);
  if (cached) return cached;

  const exactVariantMatches = new Map<string, Person[]>();
  const singleWordMatches = new Map<string, Person[]>();
  const leadingWordMatches = new Map<string, IndexedKindiPerson[]>();
  const orderById = new Map<string, number>();
  const indexedPeople = people.map<IndexedKindiPerson>((person, order) => {
    const parts = personStrictNameParts(person);
    const variants = getPersonNameVariants(person);
    const indexedPerson = {
      person,
      order,
      parts,
      variants,
    };

    orderById.set(person.id, order);
    for (const variant of variants) {
      pushUnique(exactVariantMatches, variant, person);
    }
    pushUnique(singleWordMatches, parts.first, person);
    pushUnique(singleWordMatches, parts.nick, person);
    pushUnique(singleWordMatches, parts.last, person);
    pushIndexed(leadingWordMatches, parts.first, indexedPerson);
    pushIndexed(leadingWordMatches, parts.nick, indexedPerson);

    return indexedPerson;
  });

  const index = {
    indexedPeople,
    exactVariantMatches,
    singleWordMatches,
    leadingWordMatches,
    orderById,
  };
  targetIndexCache.set(people, index);
  return index;
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
  const candidateWordSet = new Set(candidateWords);
  if (queryWords.length >= 2 && queryWords.every((word) => candidateWordSet.has(word))) {
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
  const index = getKindiTargetIndex(people);
  const sortResults = () =>
    results.sort((left, right) => (index.orderById.get(left.id) ?? 0) - (index.orderById.get(right.id) ?? 0));

  const results: Person[] = [];
  const addMatches = (matches: Person[]) => {
    for (const person of matches) {
      if (!results.some((candidate) => candidate.id === person.id)) {
        results.push(person);
      }
    }
  };

  addMatches(index.exactVariantMatches.get(normalizedTarget) ?? []);

  if (targetWords.length === 1) {
    const [firstWord] = targetWords;
    addMatches(index.singleWordMatches.get(firstWord) ?? []);

    if (results.length > 0) return sortResults();

    addMatches(index.indexedPeople
      .filter(({ parts }) =>
        [parts.first, parts.nick].filter(Boolean).some((variant) =>
        isNormalizedNameMatch(firstWord, variant)
        )
      )
      .map(({ person }) => person));

    return sortResults();
  }

  addMatches((index.leadingWordMatches.get(targetWords[0]) ?? []).filter(({ variants }) =>
    variants.some((variant) =>
      isNormalizedNameMatch(normalizedTarget, variant)
    )
  ).map(({ person }) => person));

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
