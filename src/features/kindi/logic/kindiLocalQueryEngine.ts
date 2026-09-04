import type { Language } from '../../../types/common';
import type { Person } from '../../../types/person';
import { getFullName } from '../../../utils/familyLogic';
import { findKindiRelationshipPath, type KindiRelationshipPathStep } from './kindiRelationshipPathEngine';

export type KindiLocalRelationship = 'parents' | 'children' | 'spouses' | 'siblings' | 'path';
type KindiDirectRelationship = Exclude<KindiLocalRelationship, 'path'>;

export interface KindiLocalRelationshipQueryResult {
  kind: 'answer' | 'needs-context';
  relationship: KindiLocalRelationship;
  text: string;
  people: Person[];
  contextPerson?: Person;
  targetPerson?: Person;
}

interface ResolveKindiLocalRelationshipQueryArgs {
  query: string;
  people: readonly Person[];
  contextPersonId?: string | null;
  language: Language;
}

const normalize = (value: string): string => value
  .normalize('NFKD')
  .replace(/[\u064B-\u065F\u0670]/g, '')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ؤ/g, 'و')
  .replace(/ئ/g, 'ي')
  .replace(/ى/g, 'ي')
  .replace(/ة/g, 'ه')
  .toLocaleLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ')
  .trim();

const RELATION_PATTERNS: Record<KindiDirectRelationship, RegExp> = {
  parents: /(?:\bparents?\b|\bfather\b|\bmother\b|والد|الاب|الام|ابوه|ابوها|امها|امه)/,
  children: /(?:\bchildren\b|\bsons?\b|\bdaughters?\b|ابناء|ابناو|اولاد|اطفال|ذريه|ابنه|ابنها)/,
  spouses: /(?:\bspouses?\b|\bwives\b|\bhusbands?\b|ازواج|زوجات|زوجته|زوجها|زوجه)/,
  siblings: /(?:\bsiblings?\b|\bbrothers?\b|\bsisters?\b|اخو|اخوه|اخوات|اشقاء|شقيق)/,
};

const CONTEXT_MARKER = /(?:\bthis person\b|\bselected person\b|\bfocused person\b|\bhis\b|\bher\b|\btheir\b|هذا الشخص|هذه الشخص|المحدد|المحدده|له|لها|ابوه|ابوها|امه|امها|ابنه|ابنها|زوجته|زوجها|اخوته|اخواته)/;
const QUESTION_MARKER = /(?:\bwho\b|\bwhat\b|\bshow\b|\blist\b|من|ما|اعرض|اظهر)/;
const PATH_QUESTION_MARKER = /(?:\brelationship between\b|\brelated to\b|\bkinship\b|صله القرابه|مسار القرابه|مسار النسب|العلاقه بين|كيف يرتبط|كيف ترتبط|ما القرابه)/;

const detectRelationship = (query: string): KindiDirectRelationship | null => {
  const detectionOrder: readonly KindiDirectRelationship[] = ['siblings', 'spouses', 'children', 'parents'];
  for (const relationship of detectionOrder) {
    if (RELATION_PATTERNS[relationship].test(query)) return relationship;
  }
  return null;
};

const findExplicitPersonMentions = (query: string, people: readonly Person[]): Person[] =>
  people.filter((person) => {
    const fullName = normalize(getFullName(person));
    if (!fullName || fullName.split(' ').length < 2) return false;
    return query.includes(fullName);
  });

interface KindiPathMention {
  start: number;
  end: number;
  text: string;
  people: Person[];
}

const getPersonMentionVariants = (person: Person): string[] => Array.from(new Set([
  normalize(getFullName(person)),
  normalize([person.firstName, person.lastName].filter(Boolean).join(' ')),
  normalize(person.nickName ?? ''),
  normalize(person.firstName),
].filter(Boolean))).sort((left, right) => right.length - left.length);

const findPathMentions = (query: string, people: readonly Person[]): KindiPathMention[] => {
  const grouped = new Map<string, KindiPathMention>();
  const paddedQuery = ` ${query} `;

  for (const person of people) {
    const matched = getPersonMentionVariants(person).map((variant) => {
      const directStart = paddedQuery.indexOf(` ${variant} `);
      const coordinatedStart = paddedQuery.indexOf(` و${variant} `);
      const start = directStart >= 0
        ? directStart
        : coordinatedStart >= 0
          ? coordinatedStart + 2
          : -1;
      return { variant, start };
    }).find(({ start }) => start >= 0);
    if (!matched) continue;
    const { variant: matchedVariant, start } = matched;
    const end = start + matchedVariant.length;
    const key = `${start}:${end}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.people.push(person);
    } else {
      grouped.set(key, { start, end, text: matchedVariant, people: [person] });
    }
  }

  const mentions = Array.from(grouped.values());
  return mentions
    .filter((mention) => !mentions.some((other) =>
      other !== mention
      && other.start <= mention.start
      && other.end >= mention.end
      && (other.start < mention.start || other.end > mention.end)
    ))
    .sort((left, right) => left.start - right.start);
};

const getRelatedPeople = (
  relationship: KindiDirectRelationship,
  contextPerson: Person,
  people: readonly Person[]
): Person[] => {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const relatedIds = new Set<string>();

  if (relationship === 'parents') {
    contextPerson.parents.forEach((id) => relatedIds.add(id));
    people.forEach((person) => {
      if (person.children.includes(contextPerson.id)) relatedIds.add(person.id);
    });
  }

  if (relationship === 'children') {
    contextPerson.children.forEach((id) => relatedIds.add(id));
    people.forEach((person) => {
      if (person.parents.includes(contextPerson.id)) relatedIds.add(person.id);
    });
  }

  if (relationship === 'spouses') {
    contextPerson.spouses.forEach((id) => relatedIds.add(id));
    people.forEach((person) => {
      if (person.spouses.includes(contextPerson.id)) relatedIds.add(person.id);
    });
  }

  if (relationship === 'siblings') {
    const parentIds = new Set(contextPerson.parents);
    people.forEach((person) => {
      if (person.id === contextPerson.id) return;
      if (person.parents.some((parentId) => parentIds.has(parentId))) relatedIds.add(person.id);
    });
  }

  relatedIds.delete(contextPerson.id);
  return Array.from(relatedIds)
    .map((id) => peopleById.get(id))
    .filter((person): person is Person => Boolean(person))
    .sort((left, right) => getFullName(left).localeCompare(getFullName(right)));
};

const PATH_STEP_LABELS: Record<Language, Record<KindiRelationshipPathStep, string>> = {
  ar: { parent: 'والد/والدة', child: 'ابن/ابنة', spouse: 'زوج/زوجة' },
  en: { parent: 'parent', child: 'child', spouse: 'spouse' },
};

const uniquePeople = (people: Person[]): Person[] => Array.from(
  new Map(people.map((person) => [person.id, person])).values()
);

const resolveKindiRelationshipPathQuery = (
  query: string,
  people: readonly Person[],
  contextPersonId: string | null | undefined,
  language: Language
): KindiLocalRelationshipQueryResult => {
  const mentions = findPathMentions(query, people);
  const ambiguousMention = mentions.find((mention) => mention.people.length > 1);
  if (ambiguousMention) {
    return {
      kind: 'needs-context',
      relationship: 'path',
      people: ambiguousMention.people,
      text: language === 'ar'
        ? `وجدت أكثر من سجل يطابق ${ambiguousMention.text}. اختر الشخص المقصود ثم أعد سؤال القرابة.`
        : `I found more than one record matching ${ambiguousMention.text}. Select the intended person, then ask the relationship question again.`,
    };
  }

  if (mentions.length > 2) {
    return {
      kind: 'needs-context',
      relationship: 'path',
      people: uniquePeople(mentions.flatMap((mention) => mention.people)),
      text: language === 'ar'
        ? 'اذكر شخصين فقط في سؤال القرابة كي أحدد المسار الصحيح.'
        : 'Mention exactly two people in the relationship question so I can identify the correct path.',
    };
  }

  const contextPerson = contextPersonId
    ? people.find((person) => person.id === contextPersonId)
    : undefined;
  const explicitPeople = mentions.map((mention) => mention.people[0]).filter(Boolean);
  const fromPerson = explicitPeople.length >= 2 ? explicitPeople[0] : contextPerson;
  const toPerson = explicitPeople.length >= 2
    ? explicitPeople[1]
    : explicitPeople.find((person) => person.id !== contextPerson?.id);

  if (!fromPerson || !toPerson) {
    return {
      kind: 'needs-context',
      relationship: 'path',
      people: explicitPeople,
      ...(contextPerson ? { contextPerson } : {}),
      text: language === 'ar'
        ? 'اذكر اسمَي شخصين، أو حدّد شخصًا في الشجرة ثم اذكر اسم الشخص الآخر.'
        : 'Mention two people, or select one person in the tree and name the other person.',
    };
  }

  const path = findKindiRelationshipPath({
    fromPersonId: fromPerson.id,
    toPersonId: toPerson.id,
    people,
    language,
  });
  const fromName = getFullName(fromPerson);
  const toName = getFullName(toPerson);
  if (!path) {
    return {
      kind: 'answer',
      relationship: 'path',
      contextPerson: fromPerson,
      targetPerson: toPerson,
      people: [fromPerson, toPerson],
      text: language === 'ar'
        ? `لا يوجد مسار عائلي مسجل بين ${fromName} و${toName} في الشجرة الحالية.`
        : `No recorded family path connects ${fromName} and ${toName} in the current tree.`,
    };
  }

  const pathDescription = path.people.map((person, index) => {
    if (index === 0) return getFullName(person);
    const step = path.steps[index - 1];
    return `${PATH_STEP_LABELS[language][step]}: ${getFullName(person)}`;
  }).join(language === 'ar' ? '، ثم ' : ', then ');
  const noDirectRelationship = language === 'ar'
    ? path.relationshipText === 'لا توجد قرابة مباشرة'
    : path.relationshipText === 'No direct relationship found';
  const relationshipSummary = noDirectRelationship
    ? language === 'ar'
      ? `وجدت مسارًا عائليًا مسجلًا بين ${fromName} و${toName}.`
      : `I found a recorded family path between ${fromName} and ${toName}.`
    : language === 'ar'
      ? `صلة القرابة بين ${fromName} و${toName}: ${path.relationshipText}.`
      : `The relationship between ${fromName} and ${toName} is ${path.relationshipText}.`;

  return {
    kind: 'answer',
    relationship: 'path',
    contextPerson: fromPerson,
    targetPerson: toPerson,
    people: path.people,
    text: language === 'ar'
      ? `${relationshipSummary} أقصر مسار مسجل: ${pathDescription}.`
      : `${relationshipSummary} Shortest recorded path: ${pathDescription}.`,
  };
};

const RELATION_LABELS: Record<Language, Record<KindiLocalRelationship, string>> = {
  ar: { parents: 'الوالدين', children: 'الأبناء', spouses: 'الأزواج', siblings: 'الإخوة والأخوات', path: 'مسار القرابة' },
  en: { parents: 'parents', children: 'children', spouses: 'spouses', siblings: 'siblings', path: 'relationship path' },
};

export const resolveKindiLocalRelationshipQuery = ({
  query,
  people,
  contextPersonId,
  language,
}: ResolveKindiLocalRelationshipQueryArgs): KindiLocalRelationshipQueryResult | null => {
  const normalizedQuery = normalize(query);
  if (PATH_QUESTION_MARKER.test(normalizedQuery)) {
    return resolveKindiRelationshipPathQuery(normalizedQuery, people, contextPersonId, language);
  }

  const relationship = detectRelationship(normalizedQuery);
  if (!relationship || !QUESTION_MARKER.test(normalizedQuery)) return null;

  const explicitPeople = findExplicitPersonMentions(normalizedQuery, people);
  const tokenCount = normalizedQuery.split(' ').filter(Boolean).length;
  const isContextual = CONTEXT_MARKER.test(normalizedQuery) || tokenCount <= 5;
  if (!isContextual && explicitPeople.length === 0) return null;

  const relationLabel = RELATION_LABELS[language][relationship];
  if (explicitPeople.length > 1) {
    return {
      kind: 'needs-context',
      relationship,
      people: explicitPeople,
      text: language === 'ar'
        ? `وجدت أكثر من شخص بهذا الاسم. اختر الشخص المقصود، ثم اسألني عن ${relationLabel}.`
        : `I found more than one person with that name. Select the intended person, then ask about their ${relationLabel}.`,
    };
  }

  const contextPerson = explicitPeople[0] ?? (contextPersonId
    ? people.find((person) => person.id === contextPersonId)
    : undefined);

  if (!contextPerson) {
    return {
      kind: 'needs-context',
      relationship,
      people: [],
      text: language === 'ar'
        ? `حدد شخصًا في الشجرة أولًا، ثم اسألني عن ${relationLabel}.`
        : `Select a person in the tree first, then ask me about their ${relationLabel}.`,
    };
  }

  const relatedPeople = getRelatedPeople(relationship, contextPerson, people);
  const contextName = getFullName(contextPerson);
  return {
    kind: 'answer',
    relationship,
    contextPerson,
    people: relatedPeople,
    text: relatedPeople.length > 0
      ? language === 'ar'
        ? `وجدت ${relatedPeople.length} من ${relationLabel} المرتبطين بـ ${contextName}.`
        : `I found ${relatedPeople.length} ${relationLabel} connected to ${contextName}.`
      : language === 'ar'
        ? `لا تظهر سجلات ${relationLabel} مرتبطة بـ ${contextName} في الشجرة الحالية.`
        : `No ${relationLabel} are recorded for ${contextName} in the current tree.`,
  };
};
