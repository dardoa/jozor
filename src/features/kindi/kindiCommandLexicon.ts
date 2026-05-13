import { normalizeArabic, stripArabicPrefixes } from '../../utils/search/arabicUtils';
import type { KindiAddPlan, KindiIntentKind } from './types';

export const normalizeKindiCommandText = (value: string | undefined): string =>
  stripArabicPrefixes(normalizeArabic(value || ''))
    .replace(/[،,.;:!?()[\]{}"“”'’`]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const ADD_ACTION_VERBS = [
  'add',
  'create',
  'insert',
  'append',
  'attach',
  'link',
  'connect',
  'include',
  'أضف',
  'اضف',
  'أضيف',
  'اضيف',
  'إضافة',
  'اضافة',
  'أضافة',
  'إضافه',
  'اضافه',
  'ضيف',
  'زد',
  'زود',
  'أنشئ',
  'انشئ',
  'إنشاء',
  'انشاء',
  'إنشا',
  'انشا',
  'سجل',
  'اربط',
  'وصل',
];

const UPDATE_ACTION_VERBS = [
  'update',
  'edit',
  'change',
  'rename',
  'modify',
  'set',
  'clear',
  'عدل',
  'عدّل',
  'تعديل',
  'غير',
  'غيّر',
  'تغيير',
  'حدث',
  'حدّث',
  'تحديث',
  'صحح',
  'صحّح',
  'تصحيح',
  'اجعل',
  'ضع',
  'امسح قيمة',
  'افرغ',
];

const DELETE_ACTION_VERBS = [
  'delete',
  'remove',
  'erase',
  'drop',
  'حذف',
  'احذف',
  'إحذف',
  'امسح',
  'أزل',
  'ازل',
  'إزالة',
  'ازالة',
  'شيل',
  'احذفوا',
];

const TARGET_PREP_MARKERS = [
  'to',
  'for',
  'under',
  'with',
  'of',
  'الى',
  'إلى',
  'لدى',
  'عند',
  'مع',
  'حق',
  'لـ',
  'ل',
];

const NAME_INDICATOR_MARKERS = [
  'named',
  'called',
  'name is',
  'اسمه',
  'اسمها',
  'يدعى',
  'تدعى',
  'باسم',
  'بإسم',
  'اسم',
];

const SUPPORT_HOW = ['how', 'كيف', 'شلون', 'طريقة', 'كيفية'];
const SUPPORT_WHERE = ['where', 'اين', 'أين', 'وين'];
const SUPPORT_HELP = ['help', 'guide', 'instructions', 'مساعدة', 'تعليمات', 'دليل'];

export const KINDI_LEXICON = {
  ACTION_VERBS: {
    ADD: ADD_ACTION_VERBS,
    DELETE: DELETE_ACTION_VERBS,
    UPDATE: UPDATE_ACTION_VERBS,
  },
  RELATIONS: {
    PARENT_MALE: ['father', 'dad', 'male parent', 'أب', 'اب', 'والد'],
    PARENT_FEMALE: ['mother', 'mom', 'mum', 'female parent', 'أم', 'ام', 'والدة', 'والده'],
    SPOUSE_MALE: ['husband', 'spouse male', 'male spouse', 'man partner', 'زوج', 'زوجها', 'شريك', 'بعل'],
    SPOUSE_FEMALE: ['wife', 'spouse female', 'female spouse', 'woman partner', 'زوجة', 'زوجه', 'زوجته', 'شريكة', 'شريكه', 'حرم', 'امرأة', 'امراة', 'إمرأة'],
    CHILD_MALE: ['son', 'boy', 'male child', 'ابن', 'إبن', 'ولد', 'طفل', 'حفيد'],
    CHILD_FEMALE: ['daughter', 'girl child', 'female child', 'بنت', 'ابنة', 'إبنة', 'انثى', 'أنثى', 'طفلة', 'حفيدة'],
  },
  SUPPORT_INDICATORS: {
    HOW: SUPPORT_HOW,
    WHERE: SUPPORT_WHERE,
    HELP: SUPPORT_HELP,
    ALL: [...SUPPORT_HOW, ...SUPPORT_WHERE, ...SUPPORT_HELP],
  },
  MARKERS: {
    TARGET_PREP: TARGET_PREP_MARKERS,
    NAME_INDICATOR: NAME_INDICATOR_MARKERS,
  },
} as const;

export const ADD_VERBS = KINDI_LEXICON.ACTION_VERBS.ADD;
export const UPDATE_VERBS = KINDI_LEXICON.ACTION_VERBS.UPDATE;
export const DELETE_VERBS = KINDI_LEXICON.ACTION_VERBS.DELETE;
export const TARGET_PREPOSITIONS = KINDI_LEXICON.MARKERS.TARGET_PREP;
export const NAME_MARKERS = KINDI_LEXICON.MARKERS.NAME_INDICATOR;
export const SUPPORT_INDICATORS = KINDI_LEXICON.SUPPORT_INDICATORS.ALL;

export interface KindiRelationTerm {
  relation: KindiAddPlan['relation'];
  gender: KindiAddPlan['gender'];
  terms: readonly string[];
}

export const RELATION_TERMS: KindiRelationTerm[] = [
  {
    relation: 'spouse',
    gender: 'female',
    terms: KINDI_LEXICON.RELATIONS.SPOUSE_FEMALE,
  },
  {
    relation: 'spouse',
    gender: 'male',
    terms: KINDI_LEXICON.RELATIONS.SPOUSE_MALE,
  },
  {
    relation: 'child',
    gender: 'female',
    terms: KINDI_LEXICON.RELATIONS.CHILD_FEMALE,
  },
  {
    relation: 'child',
    gender: 'male',
    terms: KINDI_LEXICON.RELATIONS.CHILD_MALE,
  },
  {
    relation: 'parent',
    gender: 'female',
    terms: KINDI_LEXICON.RELATIONS.PARENT_FEMALE,
  },
  {
    relation: 'parent',
    gender: 'male',
    terms: KINDI_LEXICON.RELATIONS.PARENT_MALE,
  },
];

const normalizedTerms = (terms: readonly string[]) => terms.map(normalizeKindiCommandText).filter(Boolean);

export const isArabicLetter = (char: string | undefined): boolean => Boolean(char && /\p{Script=Arabic}/u.test(char));
export const isLatinLetterOrDigit = (char: string | undefined): boolean => Boolean(char && /[a-z0-9]/i.test(char));
export const isWordChar = (char: string | undefined): boolean => isArabicLetter(char) || isLatinLetterOrDigit(char);

export const hasCommandTerm = (value: string, terms: readonly string[]): boolean => {
  const normalized = normalizeKindiCommandText(value);
  if (!normalized) return false;

  return normalizedTerms(terms).some((term) => {
    if (!term) return false;
    const index = normalized.indexOf(term);
    if (index < 0) return false;

    const before = normalized[index - 1];
    const after = normalized[index + term.length];
    return !isWordChar(before) && !isWordChar(after);
  });
};

export const hasSupportTerm = (query: string): boolean => hasCommandTerm(query, SUPPORT_INDICATORS);

export const detectKindiIntentKind = (query: string): KindiIntentKind => {
  if (hasCommandTerm(query, DELETE_VERBS)) return 'DELETE';
  if (hasCommandTerm(query, UPDATE_VERBS)) return 'UPDATE';
  if (hasCommandTerm(query, ADD_VERBS)) return 'ACTION';
  if (hasSupportTerm(query)) return 'SUPPORT';
  return 'QUERY';
};

export const resolveRelationTerm = (query: string): Pick<KindiAddPlan, 'relation' | 'gender'> => {
  for (const relationTerm of RELATION_TERMS) {
    if (hasCommandTerm(query, relationTerm.terms)) {
      return {
        relation: relationTerm.relation,
        gender: relationTerm.gender,
      };
    }
  }

  return { relation: 'child', gender: 'male' };
};

export const stripKnownCommandTerms = (value: string): string => {
  let output = ` ${value} `;
  const allTerms = [
    ...ADD_VERBS,
    ...UPDATE_VERBS,
    ...DELETE_VERBS,
    ...SUPPORT_INDICATORS,
    ...TARGET_PREPOSITIONS,
    ...NAME_MARKERS,
    ...RELATION_TERMS.flatMap((term) => term.terms),
  ].sort((a, b) => b.length - a.length);

  for (const rawTerm of allTerms) {
    const term = rawTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    output = output.replace(new RegExp(`(^|\\s)${term}(?=\\s|$)`, 'giu'), ' ');
  }

  return output.replace(/\s+/g, ' ').trim();
};
