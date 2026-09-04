import type { Language } from '../../../types/common';
import type { Person } from '../../../types/person';
import { getDisplayDate, getFullName } from '../../../utils/familyLogic';
import type { KindiBiographyDraft, KindiPersonContextSummary } from '../types';
import {
  hasCommandTerm,
  KINDI_BIOGRAPHY_DRAFT_TERMS,
} from './kindiCommandLexicon';
import { getKindiPersonContextLabel } from './kindiPersonContext';
import { findKindiMentionedPeople } from './kindiPersonMentionResolver';

export interface KindiBiographyDraftResult {
  kind: 'answer' | 'needs-context' | 'insufficient-data';
  text: string;
  people: Person[];
  personContexts?: KindiPersonContextSummary[];
  draft?: KindiBiographyDraft;
}

interface ResolveKindiBiographyDraftArgs {
  query: string;
  people: readonly Person[];
  contextPersonId?: string | null;
  language: Language;
}

const compact = (value: string | undefined): string => value?.replace(/\s+/g, ' ').trim() ?? '';

const getBiographyValues = (person: Person) => ({
  name: compact(getFullName(person)),
  birthDate: compact(getDisplayDate(person.birthDate)),
  birthPlace: compact(person.birthPlace),
  profession: compact(person.occupation) || compact(person.profession),
  residence: compact(person.currentResidence) || compact(person.residence),
  deathDate: person.isDeceased ? compact(getDisplayDate(person.deathDate)) : '',
  deathPlace: person.isDeceased ? compact(person.deathPlace) : '',
});

const buildArabicDraft = (values: ReturnType<typeof getBiographyValues>): string => {
  const sentences: string[] = [];
  if (values.birthDate || values.birthPlace) {
    sentences.push(`وُلد${values.birthPlace ? ` في ${values.birthPlace}` : ''}${values.birthDate ? ` عام ${values.birthDate}` : ''}`);
  }
  if (values.profession) sentences.push(`عمل بوصفه ${values.profession}`);
  if (values.residence) sentences.push(`أقام في ${values.residence}`);
  if (values.deathDate || values.deathPlace) {
    sentences.push(`توفي${values.deathPlace ? ` في ${values.deathPlace}` : ''}${values.deathDate ? ` عام ${values.deathDate}` : ''}`);
  }

  return `${values.name}. ${sentences.join('. ')}.`;
};

const buildEnglishDraft = (values: ReturnType<typeof getBiographyValues>): string => {
  const sentences: string[] = [];
  if (values.birthDate || values.birthPlace) {
    sentences.push(`was born${values.birthPlace ? ` in ${values.birthPlace}` : ''}${values.birthDate ? ` in ${values.birthDate}` : ''}`);
  }
  if (values.profession) sentences.push(`worked as ${values.profession}`);
  if (values.residence) sentences.push(`lived in ${values.residence}`);
  if (values.deathDate || values.deathPlace) {
    sentences.push(`died${values.deathPlace ? ` in ${values.deathPlace}` : ''}${values.deathDate ? ` in ${values.deathDate}` : ''}`);
  }

  if (sentences.length === 0) return values.name;
  const [first, ...rest] = sentences;
  return `${values.name} ${first}. ${rest.map((sentence) => `${values.name} ${sentence}.`).join(' ')}`.trim();
};

const buildDraft = (person: Person, language: Language): KindiBiographyDraft | undefined => {
  const values = getBiographyValues(person);
  const details = [
    values.birthDate,
    values.birthPlace,
    values.profession,
    values.residence,
    values.deathDate,
    values.deathPlace,
  ];
  if (!values.name || !details.some(Boolean)) return undefined;

  const labels = language === 'ar'
    ? {
      name: 'الاسم المسجل',
      birthDate: 'سنة الميلاد',
      birthPlace: 'مكان الميلاد',
      profession: 'المهنة',
      residence: 'الإقامة',
      deathDate: 'سنة الوفاة',
      deathPlace: 'مكان الوفاة',
    }
    : {
      name: 'Recorded name',
      birthDate: 'Birth year',
      birthPlace: 'Birth place',
      profession: 'Occupation',
      residence: 'Residence',
      deathDate: 'Death year',
      deathPlace: 'Death place',
    };

  const facts = (Object.keys(labels) as Array<keyof typeof labels>)
    .filter((key) => Boolean(values[key]))
    .map((key) => ({ label: labels[key], value: values[key] }));

  return {
    facts,
    text: language === 'ar' ? buildArabicDraft(values) : buildEnglishDraft(values),
    isSaved: false,
  };
};

export const resolveKindiBiographyDraft = ({
  query,
  people,
  contextPersonId,
  language,
}: ResolveKindiBiographyDraftArgs): KindiBiographyDraftResult | null => {
  if (!hasCommandTerm(query, KINDI_BIOGRAPHY_DRAFT_TERMS)) return null;

  const mentionedPeople = findKindiMentionedPeople(query, people);
  const peopleById = Object.fromEntries(people.map((person) => [person.id, person]));

  if (mentionedPeople.length > 1) {
    return {
      kind: 'needs-context',
      people: mentionedPeople,
      personContexts: mentionedPeople.map((person) => ({
        personId: person.id,
        summary: getKindiPersonContextLabel(person, peopleById, language),
      })),
      text: language === 'ar'
        ? 'وجدت أكثر من سجل يطابق الاسم. اختر الشخص المقصود، ثم اطلب مسودة السيرة مرة أخرى.'
        : 'More than one record matches that name. Select the intended person, then request the biography draft again.',
    };
  }

  const person = mentionedPeople[0] ?? (contextPersonId
    ? people.find((candidate) => candidate.id === contextPersonId)
    : undefined);
  if (!person) {
    return {
      kind: 'needs-context',
      people: [],
      text: language === 'ar'
        ? 'حدد شخصًا في الشجرة أو اذكر اسمه كاملًا، ثم اطلب مسودة السيرة.'
        : 'Select a person in the tree or provide their full name, then request a biography draft.',
    };
  }

  const draft = buildDraft(person, language);
  if (!draft) {
    return {
      kind: 'insufficient-data',
      people: [],
      text: language === 'ar'
        ? `لا يحتوي سجل ${compact(getFullName(person)) || 'الشخص المحدد'} على حقائق كافية لصياغة سيرة دون تخمين. أضف تاريخًا أو مكانًا أو مهنة أولًا.`
        : `${compact(getFullName(person)) || 'The selected record'} does not contain enough facts to draft a biography without guessing. Add a date, place, or occupation first.`,
    };
  }

  return {
    kind: 'answer',
    people: [],
    draft,
    text: language === 'ar'
      ? 'أعددت مسودة محلية من الحقائق المسجلة فقط. راجعها قبل استخدامها.'
      : 'I prepared a local draft using recorded facts only. Review it before use.',
  };
};
