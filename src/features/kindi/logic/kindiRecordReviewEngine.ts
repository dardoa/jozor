import type { Language } from '../../../types/common';
import type { Person } from '../../../types/person';
import { getDisplayDate, getFullName } from '../../../utils/familyLogic';
import type {
  KindiPersonContextSummary,
  KindiRecordItem,
  KindiRecordReview,
  KindiRecordSection,
} from '../types';
import {
  hasCommandTerm,
  KINDI_RECORD_REVIEW_TERMS,
} from './kindiCommandLexicon';
import { getKindiPersonContextLabel } from './kindiPersonContext';
import { findKindiMentionedPeople } from './kindiPersonMentionResolver';

export interface KindiRecordReviewResult {
  kind: 'answer' | 'needs-context';
  text: string;
  people: Person[];
  personContexts?: KindiPersonContextSummary[];
  review?: KindiRecordReview;
  targetPersonId?: string;
}

interface ResolveKindiRecordReviewArgs {
  query: string;
  people: readonly Person[];
  contextPersonId?: string | null;
  language: Language;
}

const MAX_NOTES = 6;
const MAX_SOURCES = 8;
const MAX_NOTE_LENGTH = 500;
const UNSAFE_DISPLAY_PATTERN = /(?:https?:\/\/|file:\/\/|s3:\/\/|blob:|data:|bearer\s+\S+|eyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]+\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b|\bperson[_-][a-z0-9_-]+\b|(?:^|\s)(?:private|storage|bucket|uploads?|avatars?|photos?)[\\/][^\s]+)/i;

const compact = (value: string | undefined): string => value?.replace(/\s+/g, ' ').trim() ?? '';
const safeDisplayValue = (value: string | undefined): string => {
  const normalized = compact(value);
  return normalized && !UNSAFE_DISPLAY_PATTERN.test(normalized) ? normalized : '';
};

const getFacts = (person: Person, language: Language): KindiRecordItem[] => {
  const values = {
    name: safeDisplayValue(getFullName(person)),
    birthDate: safeDisplayValue(getDisplayDate(person.birthDate)),
    birthPlace: safeDisplayValue(person.birthPlace),
    profession: safeDisplayValue(person.occupation) || safeDisplayValue(person.profession),
    residence: safeDisplayValue(person.currentResidence) || safeDisplayValue(person.residence),
    deathDate: person.isDeceased ? safeDisplayValue(getDisplayDate(person.deathDate)) : '',
    deathPlace: person.isDeceased ? safeDisplayValue(person.deathPlace) : '',
  };
  const labels = language === 'ar'
    ? {
      name: 'الاسم المسجل',
      birthDate: 'تاريخ الميلاد',
      birthPlace: 'مكان الميلاد',
      profession: 'المهنة',
      residence: 'الإقامة',
      deathDate: 'تاريخ الوفاة',
      deathPlace: 'مكان الوفاة',
    }
    : {
      name: 'Recorded name',
      birthDate: 'Birth date',
      birthPlace: 'Birth place',
      profession: 'Occupation',
      residence: 'Residence',
      deathDate: 'Death date',
      deathPlace: 'Death place',
    };

  return (Object.keys(labels) as Array<keyof typeof labels>)
    .filter((key) => Boolean(values[key]))
    .map((key) => ({ label: labels[key], value: values[key] }));
};

const getNotes = (person: Person, language: Language) => {
  const rawNotes = person.bio
    .split(/\r?\n/)
    .map((value) => compact(value))
    .filter(Boolean);
  let hiddenCount = 0;
  let excerptCount = 0;
  const safeNotes = rawNotes.flatMap((value) => {
    if (UNSAFE_DISPLAY_PATTERN.test(value)) {
      hiddenCount += 1;
      return [];
    }
    if (value.length > MAX_NOTE_LENGTH) {
      excerptCount += 1;
      return [`${value.slice(0, MAX_NOTE_LENGTH - 1).trimEnd()}…`];
    }
    return [value];
  });

  return {
    items: safeNotes.slice(0, MAX_NOTES).map((value, index) => ({
      label: language === 'ar' ? `ملاحظة مسجلة ${index + 1}` : `Recorded note ${index + 1}`,
      value,
    })),
    hiddenCount,
    excerptCount,
    omittedCount: Math.max(0, safeNotes.length - MAX_NOTES),
    rawCount: rawNotes.length,
  };
};

const getSources = (person: Person, language: Language) => {
  const hasBirthSource = Boolean(compact(person.birthSource));
  const hasDeathSource = person.isDeceased && Boolean(compact(person.deathSource));
  const fallbackTitle = language === 'ar' ? 'مصدر مسجل بلا عنوان' : 'Untitled recorded source';
  const linkedLabel = language === 'ar' ? 'يوجد مصدر مرتبط' : 'A linked source is recorded';
  const seen = new Set<string>();
  let hiddenCount = 0;
  const generalItems = person.sources.flatMap((source) => {
    const safeTitle = safeDisplayValue(source.title);
    const hadUnsafeTitle = Boolean(compact(source.title)) && !safeTitle;
    const title = safeTitle || fallbackTitle;
    const date = safeDisplayValue(source.date);
    const type = safeDisplayValue(source.type);
    const key = [title, date, type].join('|').toLocaleLowerCase();
    if (seen.has(key)) return [];
    seen.add(key);
    if (hadUnsafeTitle) hiddenCount += 1;
    const details = [type, date].filter(Boolean).join(language === 'ar' ? ' · ' : ' · ');
    return [{ label: title, value: details || (language === 'ar' ? 'مرجع مسجل' : 'Recorded reference') }];
  });
  const linkedItems: KindiRecordItem[] = [
    ...(hasBirthSource ? [{
      label: language === 'ar' ? 'مصدر بيانات الميلاد' : 'Birth evidence',
      value: linkedLabel,
    }] : []),
    ...(hasDeathSource ? [{
      label: language === 'ar' ? 'مصدر بيانات الوفاة' : 'Death evidence',
      value: linkedLabel,
    }] : []),
  ];
  const displayedGeneralItems = generalItems.slice(0, MAX_SOURCES);

  return {
    items: [...linkedItems, ...displayedGeneralItems],
    recordedCount: person.sources.length + Number(hasBirthSource) + Number(hasDeathSource),
    displayedCount: linkedItems.length + displayedGeneralItems.length,
    hasBirthSource,
    hasDeathSource,
    hiddenCount,
    omittedCount: Math.max(0, generalItems.length - MAX_SOURCES),
  };
};

const buildReview = (person: Person, language: Language): KindiRecordReview => {
  const facts = getFacts(person, language);
  const notes = getNotes(person, language);
  const sources = getSources(person, language);
  const reviewNotes: string[] = [];
  const hasBirthClaim = Boolean(compact(person.birthDate) || compact(person.birthPlace));
  const hasDeathClaim = person.isDeceased
    && Boolean(compact(person.deathDate) || compact(person.deathPlace));

  if (notes.rawCount === 0) {
    reviewNotes.push(language === 'ar'
      ? 'أضف ملاحظة سردية إذا كانت لديك معلومة موثقة لا تمثلها الحقول.'
      : 'Add a narrative note when documented information is not represented by the fields.');
  }
  if (sources.recordedCount === 0) {
    reviewNotes.push(language === 'ar'
      ? 'لا توجد مصادر مسجلة لهذا الشخص؛ اربط مرجعًا عند توفره.'
      : 'No sources are recorded for this person; link a reference when one is available.');
  }
  if (hasBirthClaim && !sources.hasBirthSource) {
    reviewNotes.push(language === 'ar'
      ? 'بيانات الميلاد موجودة بلا مصدر ميلاد مرتبط.'
      : 'Birth information is present without a linked birth source.');
  }
  if (hasDeathClaim && !sources.hasDeathSource) {
    reviewNotes.push(language === 'ar'
      ? 'بيانات الوفاة موجودة بلا مصدر وفاة مرتبط.'
      : 'Death information is present without a linked death source.');
  }
  if (notes.hiddenCount + sources.hiddenCount > 0) {
    reviewNotes.push(language === 'ar'
      ? 'أُخفي محتوى يشبه رابطًا أو بريدًا أو رمز وصول من هذه المعاينة.'
      : 'Content resembling a URL, email, or access token was hidden from this preview.');
  }
  if (notes.excerptCount > 0) {
    reviewNotes.push(language === 'ar'
      ? 'تظهر الملاحظات الطويلة كمقتطفات للمراجعة.'
      : 'Long notes are shown as review excerpts.');
  }
  const omittedCount = notes.omittedCount + sources.omittedCount;
  if (omittedCount > 0) {
    reviewNotes.push(language === 'ar'
      ? `لم تُوسّع ${omittedCount} عناصر إضافية في هذه المعاينة المختصرة.`
      : `${omittedCount} additional items were not expanded in this concise preview.`);
  }
  if (reviewNotes.length === 0) {
    reviewNotes.push(language === 'ar'
      ? 'السجل منظم للمراجعة؛ تحقق من المعلومات مقابل أصول المصادر.'
      : 'The record is organized for review; verify the information against the original sources.');
  }

  const allSections: KindiRecordSection[] = [
    { id: 'facts', title: language === 'ar' ? 'الحقائق المسجلة' : 'Recorded facts', items: facts },
    { id: 'notes', title: language === 'ar' ? 'الملاحظات' : 'Notes', items: notes.items },
    { id: 'sources', title: language === 'ar' ? 'المصادر' : 'Sources', items: sources.items },
  ];
  const sections = allSections.filter((section) => section.items.length > 0);

  return {
    sections,
    sourceSummary: {
      recordedCount: sources.recordedCount,
      displayedCount: sources.displayedCount,
      hasBirthSource: sources.hasBirthSource,
      hasDeathSource: sources.hasDeathSource,
    },
    reviewNotes,
    isSaved: false,
  };
};

export const resolveKindiRecordReview = ({
  query,
  people,
  contextPersonId,
  language,
}: ResolveKindiRecordReviewArgs): KindiRecordReviewResult | null => {
  if (!hasCommandTerm(query, KINDI_RECORD_REVIEW_TERMS)) return null;

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
        ? 'وجدت أكثر من سجل يطابق الاسم. اختر الشخص المقصود، ثم اطلب تنظيم سجله مرة أخرى.'
        : 'More than one record matches that name. Select the intended person, then request the record review again.',
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
        ? 'حدد شخصًا في الشجرة أو اذكر اسمه كاملًا، ثم اطلب تنظيم ملاحظاته ومصادره.'
        : 'Select a person in the tree or provide their full name, then request a notes and sources review.',
    };
  }

  return {
    kind: 'answer',
    people: [],
    review: buildReview(person, language),
    targetPersonId: person.id,
    text: language === 'ar'
      ? 'نظّمت سجل الشخص محليًا للمراجعة فقط، ولم أغيّر أي بيانات.'
      : 'I organized the person record locally for review only. No data was changed.',
  };
};
