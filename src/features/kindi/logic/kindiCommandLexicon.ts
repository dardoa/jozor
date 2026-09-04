import { normalizeArabic, stripArabicPrefixes } from '../../../utils/search/arabicUtils';
import type { KindiAddPlan, KindiIntentKind } from '../types';

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
  'سجلي',
  'سجلوا',
  'سجللي',
  'سجلّي',
  'اربط',
  'وصل',
  'حط',
  'حطّ',
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
const SUPPORT_CAPABILITIES = [
  'what can you do',
  'what do you do',
  'your capabilities',
  'ماذا تستطيع',
  'ما الذي تستطيع',
  'ماذا تفعل',
  'ما الذي تفعله',
  'قدراتك',
  'ما هي قدراتك',
  'ماهي قدراتك',
];
export const KINDI_TREE_DIAGNOSTIC_TERMS = [
  'مشاكل الشجرة',
  'أخطاء الشجرة',
  'تعارضات الشجرة',
  'افحص الشجرة',
  'فحص الشجرة',
  'افحص بيانات',
  'فحص بيانات',
  'جودة البيانات',
  'اكتمال البيانات',
  'البيانات الناقصة',
  'بيانات ناقصة',
  'مشاكل هذا الشخص',
  'مشاكل الشخص المحدد',
  'افحص هذا الشخص',
  'فحص هذا الشخص',
  'ما ينقص هذا الشخص',
  'بيانات هذا الشخص الناقصة',
  'بياناته الناقصة',
  'tree issues',
  'tree errors',
  'tree conflicts',
  'check tree',
  'check the tree',
  'check data',
  'data quality',
  'data completeness',
  'missing data',
  'issues for this person',
  "this person's issues",
  'check this person',
  'missing data for this person',
  'what is missing for this person',
] as const;
export const KINDI_BIOGRAPHY_DRAFT_TERMS = [
  'اكتب مسودة سيرة',
  'أنشئ مسودة سيرة',
  'انشئ مسودة سيرة',
  'اكتب سيرة',
  'أنشئ سيرة',
  'انشئ سيرة',
  'اكتب نبذة',
  'أنشئ نبذة',
  'انشئ نبذة',
  'مسودة نبذة',
  'draft a biography',
  'write a biography',
  'create a biography',
  'biography draft',
  'draft a bio',
  'write a bio',
  'create a bio',
] as const;
export const KINDI_RECORD_REVIEW_TERMS = [
  'نظم ملاحظات ومصادر',
  'نظّم ملاحظات ومصادر',
  'رتب ملاحظات ومصادر',
  'رتّب ملاحظات ومصادر',
  'راجع ملاحظات ومصادر',
  'راجع مصادر هذا الشخص',
  'راجع ملاحظات هذا الشخص',
  'نظم سجل',
  'نظّم سجل',
  'نظم سجل هذا الشخص',
  'نظّم سجل هذا الشخص',
  'organize notes and sources',
  'organise notes and sources',
  'review notes and sources',
  'review sources for this person',
  'review notes for this person',
  "organize this person's record",
  "organise this person's record",
  'organize record',
  'organise record',
] as const;
const GREETING_INDICATOR_TERMS = [
  'hello',
  'hi',
  'hey',
  'welcome',
  'good morning',
  'good evening',
  'how are you',
  'مرحبا',
  'مرحباً',
  'اهلا',
  'أهلا',
  'أهلاً',
  'أهلاً بك',
  'هلا',
  'يا هلا',
  'يا مرحبا',
  'السلام عليكم',
  'تحية طيبة',
  'صباح الخير',
  'مساء الخير',
  'طاب يومك',
  'كيف حالك',
  'كيف حالك؟',
  'شلونك',
  'شلونك؟',
  'أخباركم',
  'اخباركم',
  'أخبارك',
  'اخبارك',
  'عساك بخير',
];

const FLOW_SEARCH_TERMS = [
  'search',
  'find',
  'look up',
  'ابحث',
  'نبحث',
  'لنبحث',
  'البحث',
  'للبحث',
  'تفتيش',
  'دور',
  'فتش',
];

const FLOW_ADD_TERMS = [
  'add',
  'create',
  'new branch',
  'اضف',
  'أضف',
  'نضيف',
  'اضافة',
  'إضافة',
  'غصن',
  'جديد',
  'فرع',
];

const OUT_OF_SCOPE_TERMS = [
  'weather',
  'sport',
  'sports',
  'cooking',
  'recipe',
  'news',
  'politics',
  'song',
  'joke',
  'fix my',
  'طقس',
  'رياضة',
  'طبخ',
  'وصفة',
  'أخبار',
  'اخبار',
  'سياسة',
  'أغنية',
  'اغنية',
  'نكتة',
  'من هو ملك',
  'من هي ملكة',
  'كيف أصلح',
  'كيف اصلح',
];

export const KINDI_LEXICON = {
  ACTION_VERBS: {
    ADD: ADD_ACTION_VERBS,
    DELETE: DELETE_ACTION_VERBS,
    UPDATE: UPDATE_ACTION_VERBS,
  },
  RELATIONS: {
    PARENT_MALE: ['father', 'dad', 'male parent', 'أب', 'اب', 'والد', 'أبوه', 'ابوه'],
    PARENT_FEMALE: ['mother', 'mom', 'mum', 'female parent', 'أم', 'ام', 'والدة', 'والده', 'أمه', 'امه', 'والدته'],
    SPOUSE_MALE: ['husband', 'spouse male', 'male spouse', 'man partner', 'زوج', 'زوجها', 'شريك', 'بعل'],
    SPOUSE_FEMALE: ['wife', 'spouse female', 'female spouse', 'woman partner', 'زوجة', 'زوجه', 'زوجته', 'شريكة', 'شريكه', 'حرم', 'امرأة', 'امراة', 'إمرأة', 'مرا', 'مرة', 'مره', 'مرته'],
    CHILD_MALE: ['son', 'boy', 'male child', 'ابن', 'إبن', 'ولد', 'ولده', 'ولدي', 'طفل', 'حفيد'],
    CHILD_FEMALE: ['daughter', 'girl child', 'female child', 'بنت', 'بنته', 'بنتها', 'ابنة', 'إبنة', 'انثى', 'أنثى', 'طفلة', 'حفيدة'],
  },
  SUPPORT_INDICATORS: {
    HOW: SUPPORT_HOW,
    WHERE: SUPPORT_WHERE,
    HELP: SUPPORT_HELP,
    CAPABILITIES: SUPPORT_CAPABILITIES,
    ALL: [...SUPPORT_HOW, ...SUPPORT_WHERE, ...SUPPORT_HELP, ...SUPPORT_CAPABILITIES],
  },
  GREETING_INDICATORS: GREETING_INDICATOR_TERMS,
  FLOW_KEYWORDS: {
    SEARCH: FLOW_SEARCH_TERMS,
    ADD: FLOW_ADD_TERMS,
  },
  OUT_OF_SCOPE_INDICATORS: OUT_OF_SCOPE_TERMS,
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
export const GREETING_INDICATORS = KINDI_LEXICON.GREETING_INDICATORS;
export const FLOW_SEARCH_KEYWORDS = KINDI_LEXICON.FLOW_KEYWORDS.SEARCH;
export const FLOW_ADD_KEYWORDS = KINDI_LEXICON.FLOW_KEYWORDS.ADD;
export const OUT_OF_SCOPE_INDICATORS = KINDI_LEXICON.OUT_OF_SCOPE_INDICATORS;

const AI_FALLBACK_INTENT_TERMS = [
  ...ADD_ACTION_VERBS,
  ...UPDATE_ACTION_VERBS,
  ...DELETE_ACTION_VERBS,
  ...FLOW_SEARCH_TERMS,
  ...Object.values(KINDI_LEXICON.RELATIONS).flat(),
  'ابناء',
  'أبناء',
  'اولاد',
  'أولاد',
  'ذرية',
  'عائلة',
  'العائلة',
  'نسب',
  'النسب',
  'قرابة',
  'صلة',
  'كنية',
  'كنيته',
  'لقب',
  'يسكن',
  'تسكن',
  'family',
  'relation',
  'relationship',
  'relative',
  'relatives',
  'ancestry',
  'ancestor',
  'ancestors',
  'descendant',
  'descendants',
  'kinship',
  'lineage',
  'surname',
];

export const hasKindiAIFallbackIntentSignal = (text: string): boolean =>
  hasCommandTerm(text, AI_FALLBACK_INTENT_TERMS);

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
export const hasGreetingTerm = (query: string): boolean => hasCommandTerm(query, GREETING_INDICATORS);
export const getConversationFlowIntent = (query: string): 'search' | 'add' | undefined => {
  if (hasCommandTerm(query, FLOW_ADD_KEYWORDS)) return 'add';
  if (hasCommandTerm(query, FLOW_SEARCH_KEYWORDS)) return 'search';
  return undefined;
};
export const hasOutOfScopeTerm = (query: string): boolean => hasCommandTerm(query, OUT_OF_SCOPE_INDICATORS);

export const detectKindiIntentKind = (query: string): KindiIntentKind => {
  const hasExplicitAction = hasCommandTerm(query, [
    ...DELETE_VERBS,
    ...UPDATE_VERBS,
    ...ADD_VERBS,
  ]);

  if (hasOutOfScopeTerm(query)) return 'UNKNOWN';
  if (hasGreetingTerm(query) && !hasExplicitAction) return 'GREETING';
  if (hasCommandTerm(query, KINDI_TREE_DIAGNOSTIC_TERMS)) return 'QUERY';
  if (hasCommandTerm(query, KINDI_BIOGRAPHY_DRAFT_TERMS)) return 'QUERY';
  if (hasCommandTerm(query, KINDI_RECORD_REVIEW_TERMS)) return 'QUERY';
  if (hasSupportTerm(query)) return 'SUPPORT';
  if (hasCommandTerm(query, DELETE_VERBS)) return 'DELETE';
  if (hasCommandTerm(query, UPDATE_VERBS)) return 'UPDATE';
  if (hasCommandTerm(query, ADD_VERBS)) return 'ACTION';
  if (hasGreetingTerm(query)) return 'GREETING';
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

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const COMMAND_STRIP_PATTERN = new RegExp(
  `(^|\\s)(?:${[
    ...ADD_VERBS,
    ...UPDATE_VERBS,
    ...DELETE_VERBS,
    ...GREETING_INDICATORS,
    ...SUPPORT_INDICATORS,
    ...OUT_OF_SCOPE_INDICATORS,
    ...TARGET_PREPOSITIONS,
    ...NAME_MARKERS,
    ...RELATION_TERMS.flatMap((term) => term.terms),
  ]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)
    .join('|')})(?=\\s|$)`,
  'giu'
);

export const stripKnownCommandTerms = (value: string): string => {
  let output = ` ${value} `;
  output = output.replace(COMMAND_STRIP_PATTERN, ' ');
  return output.replace(/\s+/g, ' ').trim();
};
