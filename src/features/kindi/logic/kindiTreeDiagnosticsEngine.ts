import {
  evaluateDataIntegrity,
  type DataIntegrityReport,
  type DataIntegrityIssue,
  type DataIntegrityIssueCode,
  type IntegrityCategory,
  type IntegritySeverity,
} from '../../../domain/dataIntegrity';
import type { Language } from '../../../types/common';
import type { Person } from '../../../types/person';
import { getFullName } from '../../../utils/familyLogic';
import type {
  KindiDiagnosticSuggestion,
  KindiDiagnosticSuggestionKey,
  KindiDiagnosticTargetField,
  KindiDiagnosticTargetSection,
  KindiDiagnosticTargetTab,
} from '../types';
import {
  hasCommandTerm,
  KINDI_TREE_DIAGNOSTIC_TERMS,
  normalizeKindiCommandText,
} from './kindiCommandLexicon';
import { findKindiMentionedPeople } from './kindiPersonMentionResolver';

export interface KindiTreeDiagnosticsMetrics {
  healthScore: number;
  completenessScore: number;
  citationCoverage: number | null;
  counts: Record<IntegritySeverity, number>;
  countsByCategory: Record<IntegrityCategory, number>;
}

export interface KindiTreeDiagnosticsResult {
  kind: 'answer' | 'needs-context';
  scope: 'tree' | 'person';
  text: string;
  people: Person[];
  contextPerson?: Person;
  metrics?: KindiTreeDiagnosticsMetrics;
  personContexts?: Array<{ personId: string; summary: string }>;
  suggestions?: KindiDiagnosticSuggestion[];
}

interface ResolveKindiTreeDiagnosticsQueryArgs {
  query: string;
  people: readonly Person[];
  contextPersonId?: string | null;
  language: Language;
}

const MAX_AFFECTED_PEOPLE = 8;
const MAX_PERSON_SUGGESTIONS = 4;

const PERSON_SCOPE_TERMS = [
  'مشاكل هذا الشخص',
  'مشاكل الشخص المحدد',
  'افحص هذا الشخص',
  'فحص هذا الشخص',
  'ما ينقص هذا الشخص',
  'بيانات هذا الشخص الناقصة',
  'بياناته الناقصة',
  'issues for this person',
  "this person's issues",
  'check this person',
  'missing data for this person',
  'what is missing for this person',
] as const;

const CATEGORY_LABELS: Record<Language, Record<IntegrityCategory, string>> = {
  ar: {
    RELATIONSHIP: 'العلاقات',
    TIMELINE: 'التسلسل الزمني',
    DUPLICATE: 'السجلات المحتملة التكرار',
    CITATION: 'المصادر',
    COMPLETENESS: 'اكتمال البيانات',
  },
  en: {
    RELATIONSHIP: 'relationships',
    TIMELINE: 'timeline',
    DUPLICATE: 'possible duplicates',
    CITATION: 'sources',
    COMPLETENESS: 'data completeness',
  },
};

const getSafePersonName = (person: Person, language: Language): string =>
  getFullName(person).trim() || (language === 'ar' ? 'الشخص المحدد' : 'the selected person');

const hasCitableClaims = (people: readonly Person[]): boolean => people.some((person) =>
  Boolean(person.birthDate.trim() || person.birthPlace.trim())
  || (person.isDeceased && Boolean(person.deathDate.trim() || person.deathPlace.trim()))
  || person.sources.some((source) => Boolean(source.title.trim() || source.url?.trim()))
);

const toMetrics = (
  report: DataIntegrityReport,
  people: readonly Person[]
): KindiTreeDiagnosticsMetrics => ({
  healthScore: report.healthScore,
  completenessScore: report.completenessScore,
  citationCoverage: hasCitableClaims(people) ? report.citationCoverage : null,
  counts: { ...report.counts },
  countsByCategory: { ...report.countsByCategory },
});

const getLeadingCategories = (
  countsByCategory: Record<IntegrityCategory, number>,
  language: Language
): string => Object.entries(countsByCategory)
  .filter((entry): entry is [IntegrityCategory, number] => entry[1] > 0)
  .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
  .slice(0, 3)
  .map(([category, count]) => `${CATEGORY_LABELS[language][category]} (${count})`)
  .join(language === 'ar' ? '، ' : ', ');

const getLeadingCategory = (issues: readonly DataIntegrityIssue[]): IntegrityCategory | null => {
  const counts = issues.reduce<Partial<Record<IntegrityCategory, number>>>((result, issue) => {
    result[issue.category] = (result[issue.category] ?? 0) + 1;
    return result;
  }, {});

  return (Object.entries(counts) as Array<[IntegrityCategory, number]>)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0] ?? null;
};

const getPersonIssueSummary = (
  issues: readonly DataIntegrityIssue[],
  language: Language
): string => {
  const category = getLeadingCategory(issues);
  const countLabel = language === 'ar'
    ? `${issues.length} ${issues.length === 1 ? 'ملاحظة' : 'ملاحظات'}`
    : `${issues.length} ${issues.length === 1 ? 'note' : 'notes'}`;
  return category ? `${countLabel} · ${CATEGORY_LABELS[language][category]}` : countLabel;
};

const SUGGESTION_LABELS: Record<Language, Record<KindiDiagnosticSuggestionKey, string>> = {
  ar: {
    'relationship-structure': 'صحح بنية علاقات هذا السجل قبل إضافة تفاصيل جديدة.',
    'relationship-reciprocity': 'راجع روابط القرابة وتأكد من ظهور العلاقة في السجلين.',
    timeline: 'راجع تواريخ الميلاد والوفاة المتعارضة مع أفراد العائلة.',
    'possible-duplicate': 'قارن السجلات المحتملة التكرار قبل دمج أي معلومات.',
    'birth-date': 'أضف تاريخ الميلاد إذا كان معروفًا وموثقًا.',
    'death-date': 'أضف تاريخ الوفاة إذا كان معروفًا وموثقًا.',
    residence: 'أكمل مكان الإقامة عند توفر معلومة موثوقة.',
    occupation: 'أكمل المهنة عند توفر معلومة موثوقة.',
    parents: 'أضف الوالدين المعروفين أو اترك الحقل دون تخمين.',
    'birth-source': 'أضف مصدرًا لمعلومات الميلاد المسجلة.',
    'death-source': 'أضف مصدرًا لمعلومات الوفاة المسجلة.',
    'profile-source': 'أضف مصدرًا عامًا يدعم معلومات السجل.',
  },
  en: {
    'relationship-structure': 'Correct this record’s relationship structure before adding more details.',
    'relationship-reciprocity': 'Review the family links and make sure the relationship appears in both records.',
    timeline: 'Review birth and death dates that conflict with relatives.',
    'possible-duplicate': 'Compare possible duplicate records before merging any information.',
    'birth-date': 'Add the birth date if it is known and documented.',
    'death-date': 'Add the death date if it is known and documented.',
    residence: 'Complete the residence when documented information is available.',
    occupation: 'Complete the occupation when documented information is available.',
    parents: 'Add known parents, or leave the field empty rather than guessing.',
    'birth-source': 'Add a source for the recorded birth information.',
    'death-source': 'Add a source for the recorded death information.',
    'profile-source': 'Add a general source that supports the person record.',
  },
};

const getSuggestionKey = (code: DataIntegrityIssueCode): KindiDiagnosticSuggestionKey => {
  if (code === 'death_before_birth' || code === 'child_before_parent_birth' || code === 'mother_under_13') {
    return 'timeline';
  }
  if (code === 'possible_duplicate_person') return 'possible-duplicate';
  if (code === 'missing_birth_date') return 'birth-date';
  if (code === 'missing_death_date') return 'death-date';
  if (code === 'missing_residence') return 'residence';
  if (code === 'missing_occupation') return 'occupation';
  if (code === 'missing_parents') return 'parents';
  if (code === 'missing_birth_citation') return 'birth-source';
  if (code === 'missing_death_citation') return 'death-source';
  if (code === 'missing_profile_source') return 'profile-source';
  if (code.startsWith('asymmetric_') || code.startsWith('broken_') || code.startsWith('duplicate_')) {
    return 'relationship-reciprocity';
  }
  return 'relationship-structure';
};

const getSuggestionTargetTab = (
  key: KindiDiagnosticSuggestionKey
): KindiDiagnosticTargetTab => (
  key === 'relationship-structure'
  || key === 'relationship-reciprocity'
  || key === 'parents'
    ? 'links'
    : 'about'
);

const getSuggestionTargetSection = (
  key: KindiDiagnosticSuggestionKey
): KindiDiagnosticTargetSection => {
  if (
    key === 'relationship-structure'
    || key === 'relationship-reciprocity'
    || key === 'parents'
  ) {
    return 'relationships';
  }
  if (
    key === 'occupation'
    || key === 'birth-source'
    || key === 'death-source'
    || key === 'profile-source'
  ) {
    return 'workBio';
  }
  return 'overview';
};

const SUGGESTION_TARGET_FIELDS: Partial<
  Record<KindiDiagnosticSuggestionKey, KindiDiagnosticTargetField>
> = {
  timeline: 'vitalDates',
  'possible-duplicate': 'identity',
  'birth-date': 'birthDate',
  'death-date': 'deathDate',
  residence: 'residence',
  occupation: 'profession',
  parents: 'parents',
  'birth-source': 'birthSource',
  'death-source': 'deathSource',
  'profile-source': 'sources',
};

const getPersonSuggestions = (
  issues: readonly DataIntegrityIssue[],
  language: Language,
  targetPersonId: string
): KindiDiagnosticSuggestion[] => {
  const severityWeight: Record<IntegritySeverity, number> = { ERROR: 3, WARNING: 2, INFO: 1 };
  const orderedKeys = [...issues]
    .sort((left, right) => severityWeight[right.severity] - severityWeight[left.severity]
      || left.code.localeCompare(right.code))
    .map((issue) => getSuggestionKey(issue.code));

  return Array.from(new Set(orderedKeys))
    .slice(0, MAX_PERSON_SUGGESTIONS)
    .map((key) => ({
      key,
      text: SUGGESTION_LABELS[language][key],
      targetPersonId,
      targetTab: getSuggestionTargetTab(key),
      targetSection: getSuggestionTargetSection(key),
      targetField: SUGGESTION_TARGET_FIELDS[key],
    }));
};

interface AffectedPeopleResult {
  people: Person[];
  personContexts: Array<{ personId: string; summary: string }>;
}

const getAffectedPeople = (
  report: DataIntegrityReport,
  people: readonly Person[],
  language: Language
): AffectedPeopleResult => {
  const peopleById = new Map(people.map((person) => [person.id, person]));
  const issuesByPerson = new Map<string, DataIntegrityIssue[]>();

  report.issues.forEach((issue) => {
    const ids = new Set(issue.personIds ?? [issue.personId, issue.relatedId].filter(Boolean) as string[]);
    ids.forEach((id) => {
      if (!peopleById.has(id)) return;
      issuesByPerson.set(id, [...(issuesByPerson.get(id) ?? []), issue]);
    });
  });

  const ranked = Array.from(issuesByPerson.entries())
    .sort((left, right) => {
      const severityWeight = (issues: readonly DataIntegrityIssue[]) => issues.reduce(
        (total, issue) => total + (issue.severity === 'ERROR' ? 3 : issue.severity === 'WARNING' ? 2 : 1),
        0
      );
      const weightDifference = severityWeight(right[1]) - severityWeight(left[1]);
      if (weightDifference !== 0) {
        return weightDifference;
      }
      if (right[1].length !== left[1].length) return right[1].length - left[1].length;
      return getFullName(peopleById.get(left[0])).localeCompare(getFullName(peopleById.get(right[0])));
    })
    .slice(0, MAX_AFFECTED_PEOPLE);

  return {
    people: ranked
      .map(([id]) => peopleById.get(id))
      .filter((person): person is Person => Boolean(person)),
    personContexts: ranked.map(([personId, issues]) => ({
      personId,
      summary: getPersonIssueSummary(issues, language),
    })),
  };
};

const buildTreeAnswer = (
  report: DataIntegrityReport,
  people: readonly Person[],
  language: Language
): KindiTreeDiagnosticsResult => {
  const metrics = toMetrics(report, people);
  if (people.length === 0) {
    return {
      kind: 'answer',
      scope: 'tree',
      people: [],
      metrics,
      text: language === 'ar'
        ? 'لا تحتوي الشجرة الحالية على أشخاص يمكن فحص بياناتهم بعد.'
        : 'The current tree does not contain any people to inspect yet.',
    };
  }

  const categorySummary = getLeadingCategories(report.countsByCategory, language);
  const totalIssues = report.issues.length;
  const affectedPeople = getAffectedPeople(report, people, language);
  const structuralStatus = report.counts.ERROR === 0 && report.counts.WARNING === 0
    ? language === 'ar'
      ? 'لا توجد أخطاء أو تنبيهات بنيوية.'
      : 'No structural errors or warnings were found.'
    : language === 'ar'
      ? `وجدت ${report.counts.ERROR} أخطاء و${report.counts.WARNING} تنبيهات.`
      : `I found ${report.counts.ERROR} errors and ${report.counts.WARNING} warnings.`;

  return {
    kind: 'answer',
    scope: 'tree',
    text: language === 'ar'
      ? `اكتمل فحص بيانات الشجرة. ${structuralStatus} إجمالي ملاحظات المراجعة ${totalIssues}${categorySummary ? `، وأبرزها: ${categorySummary}` : ''}.`
      : `The tree data check is complete. ${structuralStatus} There are ${totalIssues} review notes in total${categorySummary ? `, led by: ${categorySummary}` : ''}.`,
    people: affectedPeople.people,
    personContexts: affectedPeople.personContexts,
    metrics,
  };
};

const buildPersonAnswer = (
  report: DataIntegrityReport,
  person: Person,
  language: Language
): KindiTreeDiagnosticsResult => {
  const personIssues = report.issues.filter((issue) =>
    issue.personId === person.id
    || issue.relatedId === person.id
    || issue.personIds?.includes(person.id)
  );
  const counts = personIssues.reduce<Record<IntegritySeverity, number>>(
    (result, issue) => ({ ...result, [issue.severity]: result[issue.severity] + 1 }),
    { ERROR: 0, WARNING: 0, INFO: 0 }
  );
  const countsByCategory = personIssues.reduce<Record<IntegrityCategory, number>>(
    (result, issue) => ({ ...result, [issue.category]: result[issue.category] + 1 }),
    { RELATIONSHIP: 0, TIMELINE: 0, DUPLICATE: 0, CITATION: 0, COMPLETENESS: 0 }
  );
  const name = getSafePersonName(person, language);
  const categorySummary = getLeadingCategories(countsByCategory, language);

  return {
    kind: 'answer',
    scope: 'person',
    contextPerson: person,
    people: [person],
    personContexts: [{ personId: person.id, summary: getPersonIssueSummary(personIssues, language) }],
    suggestions: getPersonSuggestions(personIssues, language, person.id),
    text: personIssues.length === 0
      ? language === 'ar'
        ? `راجعت سجل ${name} ولم أجد ملاحظات جودة مرتبطة به.`
        : `I checked ${name}'s record and found no data-quality notes linked to it.`
      : language === 'ar'
        ? `راجعت سجل ${name}. وجدت ${personIssues.length} ملاحظات: ${counts.ERROR} أخطاء، ${counts.WARNING} تنبيهات، و${counts.INFO} ملاحظات تحسين${categorySummary ? `. أبرز الجوانب: ${categorySummary}` : ''}.`
        : `I checked ${name}'s record and found ${personIssues.length} notes: ${counts.ERROR} errors, ${counts.WARNING} warnings, and ${counts.INFO} improvement notes${categorySummary ? `. Leading areas: ${categorySummary}` : ''}.`,
  };
};

export const resolveKindiTreeDiagnosticsQuery = ({
  query,
  people,
  contextPersonId,
  language,
}: ResolveKindiTreeDiagnosticsQueryArgs): KindiTreeDiagnosticsResult | null => {
  if (!hasCommandTerm(query, KINDI_TREE_DIAGNOSTIC_TERMS)) return null;

  const normalizedQuery = normalizeKindiCommandText(query);
  const mentionedPeople = findKindiMentionedPeople(normalizedQuery, people);
  const requestsPersonScope = hasCommandTerm(normalizedQuery, PERSON_SCOPE_TERMS) || mentionedPeople.length > 0;

  if (mentionedPeople.length > 1) {
    return {
      kind: 'needs-context',
      scope: 'person',
      people: mentionedPeople,
      text: language === 'ar'
        ? 'يطابق السؤال أكثر من سجل. اختر الشخص الذي تريد فحص بياناته.'
        : 'The question matches more than one record. Select the person whose data you want to inspect.',
    };
  }

  const contextPerson = mentionedPeople[0] ?? (requestsPersonScope && contextPersonId
    ? people.find((person) => person.id === contextPersonId)
    : undefined);
  if (requestsPersonScope && !contextPerson) {
    return {
      kind: 'needs-context',
      scope: 'person',
      people: [],
      text: language === 'ar'
        ? 'حدد شخصًا في الشجرة أولًا، ثم اطلب فحص بيانات هذا الشخص.'
        : 'Select a person in the tree first, then ask me to inspect this person\'s data.',
    };
  }

  const report = evaluateDataIntegrity(Object.fromEntries(people.map((person) => [person.id, person])));
  return contextPerson
    ? buildPersonAnswer(report, contextPerson, language)
    : buildTreeAnswer(report, people, language);
};
