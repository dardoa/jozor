import type { Person } from '../../../../types';
import type { KindiAddPlan, KindiParsedCommand } from '../../types';
import {
  ADD_VERBS,
  NAME_MARKERS,
  RELATION_TERMS,
  TARGET_PREPOSITIONS,
  resolveRelationTerm,
  stripKnownCommandTerms,
} from '../kindiCommandLexicon';
import {
  cleanNameText,
  cleanUpdateValue,
  normalizeKindiText,
  parseKindiProvidedName,
  splitPersonName,
} from './nameParser';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stripRelationWords = (value: string): string => value
  .replace(new RegExp(`^(?:${ADD_VERBS.map(escapeRegExp).join('|')})\\s+`, 'iu'), ' ')
  .replace(/\b(?:as|as a)\b/giu, ' ')
  .replace(new RegExp(`\\s*(?:${RELATION_TERMS.flatMap((term) => term.terms).map(escapeRegExp).join('|')})\\s*`, 'giu'), ' ')
  .replace(/\s+/g, ' ')
  .trim();

const stripAddVerbPrefix = (value: string): string => value
  .replace(new RegExp(`^(?:${ADD_VERBS.map(escapeRegExp).join('|')})\\s+`, 'iu'), ' ')
  .replace(/\s+/g, ' ')
  .trim();

const addAttributeClausePattern =
  /\s+(?:و\s*)?(?:يشتغل|تشتغل|يعمل|تعمل|يعمل\s+ك|تعمل\s+ك|عمله|عملها|مهنته|مهنتها|وظيفته|وظيفتها|شغله|شغلها|مكان\s+ميلاده|مكان\s+ميلادها|ولد\s+في|ولدت\s+في|مولود\s+في|مولودة\s+في|مواليد|عام|سنة|في\s+عام|تاريخ\s+ميلاده|تاريخ\s+ميلادها|profession|job|works\s+as|work\s+as|birth\s+place|born\s+in|born\s+on|born)\s+.+$/iu;

const stripAddAttributeClauses = (value: string): string => value
  .replace(addAttributeClausePattern, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const extractAddInitialUpdates = (query: string): Partial<Person> | undefined => {
  const updates: Partial<Person> = {};
  const professionMatch = query.match(
    /\s(?:و\s*)?(?:يشتغل|تشتغل|يعمل|تعمل|يعمل\s+ك|تعمل\s+ك|عمله|عملها|مهنته|مهنتها|وظيفته|وظيفتها|شغله|شغلها|profession|job|works\s+as|work\s+as)\s+([^,.;:!?،]+)$/iu
  );
  const profession = cleanUpdateValue(professionMatch?.[1]);
  const birthPlaceMatch = query.match(
    /\s(?:و\s*)?(?:مكان\s+ميلاده|مكان\s+ميلادها|ولد\s+في|ولدت\s+في|مولود\s+في|مولودة\s+في|birth\s+place|born\s+in)\s+([^,.;:!?،]+?)(?=\s+(?:و\s*)?(?:يشتغل|تشتغل|يعمل|تعمل|مهنته|مهنتها|وظيفته|وظيفتها|مواليد|عام|سنة|في\s+عام|تاريخ\s+ميلاده|تاريخ\s+ميلادها|مولود\s+عام|مولودة\s+عام|profession|job|works\s+as|work\s+as|born\s+on|born)\s+|$)/iu
  );
  const birthPlace = cleanUpdateValue(birthPlaceMatch?.[1]);
  const birthDateMatch = query.match(
    /(?:مواليد|عام|سنة|في\s+عام|تاريخ\s+ميلاده|تاريخ\s+ميلادها|مولود\s+عام|مولودة\s+عام|born\s+on|born)\s+(\d{4}(?:-\d{2}(?:-\d{2})?)?)/iu
  );

  if (profession !== undefined) {
    updates.profession = profession;
  }
  if (birthPlace !== undefined) {
    updates.birthPlace = birthPlace;
  }
  if (birthDateMatch?.[1]) {
    updates.birthDate = birthDateMatch[1];
  }

  return Object.keys(updates).length > 0 ? updates : undefined;
};

export const extractNameFromQuery = (query: string): KindiAddPlan['name'] => {
  const nameMarkers = NAME_MARKERS.map(escapeRegExp).join('|');
  const targetMarkers = TARGET_PREPOSITIONS.map(escapeRegExp).join('|');
  const explicitNameMatch = query.match(
    new RegExp(`(?:${nameMarkers})\\s+(.+?)(?=\\s+(?:${targetMarkers}|ل(?=\\p{Script=Arabic}))\\s*|$)`, 'iu')
  );

  const explicitName = splitPersonName(stripAddAttributeClauses(explicitNameMatch?.[1] || ''));
  if (explicitName) return explicitName;

  const beforeTarget = query
    .replace(new RegExp(`\\s+(?:${targetMarkers}|ل(?=\\p{Script=Arabic}))\\s*.+$`, 'iu'), ' ');

  const withoutAttributes = stripAddAttributeClauses(beforeTarget);
  const hasExplicitTarget = beforeTarget !== query;
  const stripped = hasExplicitTarget
    ? stripRelationWords(withoutAttributes)
    : stripAddVerbPrefix(withoutAttributes);
  const normalizedStripped = hasExplicitTarget
    ? stripKnownCommandTerms(stripped)
    : stripped;
  return parseKindiProvidedName(normalizedStripped);
};

export const extractKindiTargetText = (query: string): string | undefined => {
  const nameMarkers = NAME_MARKERS.map(escapeRegExp).join('|');
  const stopBeforeProfileClause = '(?:يشتغل|تشتغل|يعمل|تعمل|يعمل\\s+ك|تعمل\\s+ك|عمله|عملها|مهنته|مهنتها|وظيفته|وظيفتها|شغله|شغلها|مكان\\s+ميلاده|مكان\\s+ميلادها|ولد\\s+في|ولدت\\s+في|مولود\\s+في|مولودة\\s+في|مواليد|عام|سنة|في\\s+عام|تاريخ\\s+ميلاده|تاريخ\\s+ميلادها|profession|job|works\\s+as|work\\s+as|birth\\s+place|born\\s+in|born\\s+on|born)';
  const stopBeforeNewPersonName = `(?=\\s+(?:${nameMarkers})\\s+|\\s+(?:و\\s*)?${stopBeforeProfileClause}\\s+|[,.;:!?،]|$)`;
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

const resolveAddRelation = (query: string): Pick<KindiAddPlan, 'relation' | 'gender'> => resolveRelationTerm(query);

export const parseKindiCommand = (query: string): KindiParsedCommand => ({
  ...resolveAddRelation(query),
  newPersonName: extractNameFromQuery(query),
  targetMention: extractKindiTargetText(query),
  initialUpdates: extractAddInitialUpdates(query),
});
