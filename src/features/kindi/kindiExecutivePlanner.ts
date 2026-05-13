import type { Person } from '../../types';
import { getFullName } from '../../utils/familyLogic';
import { normalizeArabic, stripArabicPrefixes } from '../../utils/search/arabicUtils';
import {
  ADD_VERBS,
  DELETE_VERBS,
  NAME_MARKERS,
  RELATION_TERMS,
  TARGET_PREPOSITIONS,
  UPDATE_VERBS,
  hasCommandTerm,
  normalizeKindiCommandText,
  resolveRelationTerm,
  stripKnownCommandTerms,
} from './kindiCommandLexicon';
import type { KindiAddPlan, KindiDeletePlan, KindiExecutivePlan, KindiRoutedIntent, KindiUpdatePlan } from './types';

interface CreatePlanOptions {
  allPeople?: Person[];
  selectedTarget?: Person;
}

export type KindiTargetResolution =
  | { status: 'no_target'; candidates: Person[] }
  | { status: 'exact'; candidates: [Person] }
  | { status: 'ambiguous'; candidates: Person[] }
  | { status: 'not_found'; candidates: Person[] };

export interface KindiParsedCommand {
  relation?: KindiAddPlan['relation'];
  gender?: KindiAddPlan['gender'];
  newPersonName?: KindiAddPlan['name'];
  targetMention?: string;
}

type KindiUpdateField =
  | 'firstName'
  | 'middleName'
  | 'lastName'
  | 'birthDate'
  | 'birthPlace'
  | 'deathPlace'
  | 'profession'
  | 'bio';

interface ParsedUpdateCommand {
  field?: KindiUpdateField;
  subjectText?: string;
  value?: string;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const includesAny = (value: string, terms: string[]) =>
  terms.some((term) => normalizeKindiCommandText(value).includes(normalizeKindiCommandText(term)));

const normalizeKindiText = (value: string | undefined): string =>
  stripArabicPrefixes(normalizeArabic(value || '')).replace(/\s+/g, ' ').trim();

const cleanNameText = (rawName: string | undefined): string | undefined => {
  const cleaned = rawName
    ?.replace(/[،,.;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || undefined;
};

const splitPersonName = (rawName: string | undefined): KindiAddPlan['name'] => {
  const normalized = cleanNameText(rawName);
  if (!normalized) return undefined;

  const parts = normalized.split(' ').filter(Boolean);
  if (parts.length === 0) return undefined;

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' ') || undefined,
  };
};

export const parseKindiProvidedName = (rawName: string | undefined): KindiAddPlan['name'] => {
  const stripped = rawName
    ?.replace(/^(?:اسمه|اسمها|اسمه هو|اسمها هي|الاسم|name is|named|called)\s+/iu, ' ')
    .trim();
  return splitPersonName(stripped);
};

const stripRelationWords = (value: string): string => value
  .replace(new RegExp(`^(?:${ADD_VERBS.map(escapeRegExp).join('|')})\\s+`, 'iu'), ' ')
  .replace(/\b(?:as|as a)\b/giu, ' ')
  .replace(new RegExp(`\\s*(?:${RELATION_TERMS.flatMap((term) => term.terms).map(escapeRegExp).join('|')})\\s*`, 'giu'), ' ')
  .replace(/\s+/g, ' ')
  .trim();

const stripCommandWords = (value: string): string => value
  .replace(new RegExp(`^(?:${DELETE_VERBS.map(escapeRegExp).join('|')})\\s+`, 'iu'), ' ')
  .replace(new RegExp(`^(?:${UPDATE_VERBS.map(escapeRegExp).join('|')})\\s+`, 'iu'), ' ')
  .replace(/\b(?:birth|born|date|place|profession|job|notes|bio|death)\b/gi, ' ')
  .replace(/\s*(?:تاريخ|ميلاد|مكان|الميلاد|الوفاة|وفاة|مهنة|المهنة|عمل|العمل|ملاحظات|ملاحظة|السيرة|نبذة|اسم|الاسم)\s*/giu, ' ')
  .replace(/\s+(?:to|into|as|الى|إلى)\s+.+$/iu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const cleanUpdateValue = (value: string | undefined): string | undefined => {
  const cleaned = cleanNameText(value);
  if (!cleaned) return undefined;

  const normalized = normalizeKindiText(cleaned);
  if (['فارغ', 'فاضي', 'خالي', 'بدون', 'empty', 'blank', 'none', 'null'].includes(normalized)) {
    return '';
  }

  return cleaned;
};

const detectUpdateField = (query: string): KindiUpdateField | undefined => {
  const normalized = normalizeKindiText(query);

  if (includesAny(normalized, ['الاسم الاوسط', 'الاسم الأوسط', 'اسم اوسط', 'اسم أوسط', 'middle name'])) return 'middleName';
  if (includesAny(normalized, ['الاسم الاول', 'الاسم الأول', 'اسم اول', 'اسم أول', 'first name'])) return 'firstName';
  if (includesAny(normalized, ['اسم العائله', 'اسم العائلة', 'اللقب', 'last name', 'family name'])) return 'lastName';
  if (includesAny(normalized, ['تاريخ ميلاد', 'تاريخ الميلاد', 'birth date', 'born'])) return 'birthDate';
  if (includesAny(normalized, ['مكان ميلاد', 'مكان الميلاد', 'birth place', 'place of birth'])) return 'birthPlace';
  if (includesAny(normalized, ['مكان وفاه', 'مكان الوفاه', 'مكان وفاة', 'مكان الوفاة', 'death place', 'place of death'])) return 'deathPlace';
  if (includesAny(normalized, ['المهنه', 'المهنة', 'مهنة', 'وظيفه', 'وظيفة', 'profession', 'job', 'work'])) return 'profession';
  if (includesAny(normalized, ['ملاحظات', 'ملاحظه', 'ملاحظة', 'السيره', 'السيرة', 'نبذه', 'نبذة', 'notes', 'bio', 'biography'])) return 'bio';
  if (includesAny(normalized, ['الاسم', 'اسم', 'name'])) return 'firstName';

  return undefined;
};

const stripUpdateCommandPrefix = (query: string): string =>
  query
    .replace(/^(?:update|edit|change|rename|modify|عدّل|عدل|غيّر|غير|حدّث|حدث)\s+/iu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const stripUpdateFieldPhrase = (query: string, field?: KindiUpdateField): string => {
  if (!field) return query;

  const fieldPatterns: Record<KindiUpdateField, RegExp> = {
    firstName: /^(?:الاسم\s+الاول|الاسم\s+الأول|اسم\s+اول|اسم\s+أول|first\s+name)\s*/iu,
    middleName: /^(?:الاسم\s+الاوسط|الاسم\s+الأوسط|اسم\s+اوسط|اسم\s+أوسط|middle\s+name)\s*/iu,
    lastName: /^(?:اسم\s+العائله|اسم\s+العائلة|اللقب|last\s+name|family\s+name)\s*/iu,
    birthDate: /^(?:تاريخ\s+ميلاد|تاريخ\s+الميلاد|birth\s+date|born)\s*/iu,
    birthPlace: /^(?:مكان\s+ميلاد|مكان\s+الميلاد|birth\s+place|place\s+of\s+birth)\s*/iu,
    deathPlace: /^(?:مكان\s+وفاه|مكان\s+الوفاه|مكان\s+وفاة|مكان\s+الوفاة|death\s+place|place\s+of\s+death)\s*/iu,
    profession: /^(?:المهنه|المهنة|مهنة|وظيفه|وظيفة|profession|job|work)\s*/iu,
    bio: /^(?:ملاحظات|ملاحظه|ملاحظة|السيره|السيرة|نبذه|نبذة|notes|note|bio|biography)\s*/iu,
  };

  return query.replace(fieldPatterns[field], ' ').replace(/\s+/g, ' ').trim();
};

const parseUpdateCommand = (query: string): ParsedUpdateCommand => {
  const field = detectUpdateField(query);
  const withoutCommand = stripUpdateCommandPrefix(query);
  const withoutField = stripUpdateFieldPhrase(withoutCommand, field);

  const valueMatch = withoutField.match(/\s+(?:to|into|as|الى|إلى|ليكون|لتكون|يكون|تكون|هي|هو)\s+(.+)$/iu);
  const beforeValue = valueMatch
    ? withoutField.slice(0, valueMatch.index).trim()
    : withoutField;
  const value = cleanUpdateValue(valueMatch?.[1]);

  const subjectText = cleanNameText(
    beforeValue
      .replace(/^(?:for|to|of|لـ|ل)\s*/iu, '')
      .replace(/\s+/g, ' ')
      .trim()
  );

  return {
    field,
    subjectText,
    value,
  };
};

const extractNameFromQuery = (query: string): KindiAddPlan['name'] => {
  const nameMarkers = NAME_MARKERS.map(escapeRegExp).join('|');
  const targetMarkers = TARGET_PREPOSITIONS.map(escapeRegExp).join('|');
  const explicitNameMatch = query.match(
    new RegExp(`(?:${nameMarkers})\\s+(.+?)(?=\\s+(?:${targetMarkers}|ل(?=\\p{Script=Arabic}))\\s*|$)`, 'iu')
  );

  const explicitName = splitPersonName(explicitNameMatch?.[1]);
  if (explicitName) return explicitName;

  const beforeTarget = query
    .replace(new RegExp(`\\s+(?:${targetMarkers}|ل(?=\\p{Script=Arabic}))\\s*.+$`, 'iu'), ' ');

  const stripped = stripRelationWords(beforeTarget);
  const normalizedStripped = stripKnownCommandTerms(stripped);
  return parseKindiProvidedName(normalizedStripped);
};

export const extractKindiTargetText = (query: string): string | undefined => {
  const nameMarkers = NAME_MARKERS.map(escapeRegExp).join('|');
  const stopBeforeNewPersonName = `(?=\\s+(?:${nameMarkers})\\s+|[,.;:!?،]|$)`;
  const patterns = [
    new RegExp(`\\b(?:to|for|under)\\s+(.+?)${stopBeforeNewPersonName}`, 'giu'),
    new RegExp(`(?:الى|إلى|لدى|عند|مع|حق|لـ)\\s*(.+?)${stopBeforeNewPersonName}`, 'giu'),
    new RegExp(`(?:^|\\s)ل\\s+(.+?)${stopBeforeNewPersonName}`, 'giu'),
    new RegExp(`(?:^|\\s)ل(?=\\p{Script=Arabic})(.+?)${stopBeforeNewPersonName}`, 'giu'),
  ];

  const matches = patterns.flatMap((pattern) => Array.from(query.matchAll(pattern)));
  const lastMatch = matches.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).at(-1);
  const targetText = cleanNameText(lastMatch?.[1]);
  const normalizedTarget = normalizeKindiText(targetText);
  if (['ه', 'ها', 'هم', 'him', 'her', 'them'].includes(normalizedTarget)) {
    return undefined;
  }
  return targetText;
};

export const extractKindiSubjectText = (query: string): string | undefined => {
  if (includesAny(normalizeKindiText(query), ['عدل', 'غير', 'حدث', 'update', 'edit', 'change', 'rename', 'modify'])) {
    const updateSubject = parseUpdateCommand(query).subjectText;
    if (updateSubject) return updateSubject;
  }

  const explicit = extractKindiTargetText(query);
  if (explicit) return explicit;
  return cleanNameText(stripCommandWords(query));
};

const resolveAddRelation = (query: string): Pick<KindiAddPlan, 'relation' | 'gender'> => resolveRelationTerm(query);

export const parseKindiCommand = (query: string): KindiParsedCommand => ({
  ...resolveAddRelation(query),
  newPersonName: extractNameFromQuery(query),
  targetMention: extractKindiTargetText(query),
});

const getKindiFullName = (person: Person): string => {
  const extended = person as Person & { fatherName?: string; familyName?: string };
  return [
    person.firstName,
    person.middleName || extended.fatherName,
    person.lastName || extended.familyName,
  ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
};

const personSearchText = (person: Person): string => normalizeKindiText(getKindiFullName(person));

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

const personStrictNameParts = (person: Person) => ({
  first: normalizeKindiText(person.firstName),
  middle: normalizeKindiText(person.middleName || (person as Person & { fatherName?: string }).fatherName || ''),
  last: normalizeKindiText(person.lastName || (person as Person & { familyName?: string }).familyName || ''),
  nick: normalizeKindiText(person.nickName || ''),
});

const levenshteinDistance = (a: string, b: string): number => {
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

const isNormalizedNameMatch = (query: string, candidate: string): boolean => {
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
      return parts.first === firstWord || parts.nick === firstWord;
    }));
    return results;
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

  return results;
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

const extractUpdateFields = (query: string): Partial<Person> => {
  const updates: Partial<Person> = {};
  const parsed = parseUpdateCommand(query);
  const parsedValue = parsed.value;

  if (parsed.field && parsedValue !== undefined) {
    if (parsed.field === 'firstName') updates.firstName = parsedValue;
    if (parsed.field === 'middleName') updates.middleName = parsedValue;
    if (parsed.field === 'lastName') updates.lastName = parsedValue;
    if (parsed.field === 'birthDate') updates.birthDate = parsedValue;
    if (parsed.field === 'birthPlace') updates.birthPlace = parsedValue;
    if (parsed.field === 'deathPlace') updates.deathPlace = parsedValue;
    if (parsed.field === 'profession') updates.profession = parsedValue;
    if (parsed.field === 'bio') updates.bio = parsedValue;
    return updates;
  }

  const fieldValue = (terms: string): string | undefined => {
    const match = query.match(new RegExp(`(?:${terms}).*?(?:to|الى|إلى|هي|هو|في)\\s+([^,.;:!?،]+)`, 'i'));
    return cleanNameText(match?.[1]);
  };

  const dateMatch = query.match(/\b(\d{4}(?:-\d{2}(?:-\d{2})?)?)\b/);
  if (dateMatch?.[1] && includesAny(query.toLowerCase(), ['birth', 'born', 'ميلاد', 'ولد', 'ولدت'])) {
    updates.birthDate = dateMatch[1];
  }

  const nameMatch = query.match(/(?:name to|rename to|اسمه|اسمها|الاسم(?:\s+(?:إلى|الى))?)\s+(.+?)(?:\s+(?:birth|born|ميلاد|ولد|ولدت)\s+|$)/i);
  const name = splitPersonName(nameMatch?.[1]);
  if (name?.firstName) updates.firstName = name.firstName;
  if (name?.lastName) updates.lastName = name.lastName;

  const birthPlace = fieldValue('birth place|place of birth|مكان الميلاد|ميلاده|ولادته');
  if (birthPlace) updates.birthPlace = birthPlace;

  const deathPlace = fieldValue('death place|place of death|مكان الوفاة|وفاته');
  if (deathPlace) updates.deathPlace = deathPlace;

  const profession = fieldValue('profession|job|work|المهنة|مهنة|عمله|وظيفته');
  if (profession) updates.profession = profession;

  const bio = fieldValue('notes|note|bio|biography|ملاحظات|ملاحظة|السيرة|نبذة');
  if (bio) updates.bio = bio;

  return updates;
};

export const createKindiExecutivePlan = (
  routed: KindiRoutedIntent,
  relatedPeople: Person[],
  fallbackFocusId: string | undefined,
  options: CreatePlanOptions | Person[] = {}
): KindiExecutivePlan | null => {
  const normalizedOptions = Array.isArray(options) ? { allPeople: options } : options;
  const allPeople = normalizedOptions.allPeople ?? relatedPeople;

  if (routed.kind === 'ACTION') {
    const parsed = parseKindiCommand(routed.query);
    const targetCandidates = findKindiTargetCandidates(parsed.targetMention, allPeople);
    const targetPerson = normalizedOptions.selectedTarget || targetCandidates[0];

    if (parsed.targetMention && !targetPerson) return null;

    return {
      type: 'ADD',
      relation: parsed.relation ?? 'child',
      gender: parsed.gender ?? 'male',
      targetPersonId: targetPerson?.id || fallbackFocusId,
      targetPersonName: targetPerson ? getFullName(targetPerson) : undefined,
      name: parsed.newPersonName,
    };
  }

  if (routed.kind === 'UPDATE') {
    const candidates = findKindiTargetCandidates(extractKindiSubjectText(routed.query), allPeople);
    const person = normalizedOptions.selectedTarget || candidates[0] || relatedPeople[0];
    if (!person) return null;

    const updates = extractUpdateFields(routed.query);
    if (Object.keys(updates).length === 0) return null;

    const plan: KindiUpdatePlan = {
      type: 'UPDATE',
      personId: person.id,
      updates,
    };
    return plan;
  }

  if (routed.kind === 'DELETE') {
    const candidates = findKindiTargetCandidates(extractKindiSubjectText(routed.query), allPeople);
    const person = normalizedOptions.selectedTarget || candidates[0] || relatedPeople[0];
    if (!person) return null;

    const plan: KindiDeletePlan = {
      type: 'DELETE',
      personId: person.id,
    };
    return plan;
  }

  return null;
};
