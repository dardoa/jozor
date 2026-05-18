import type { Person } from '../../../types';
import { getFullName } from '../../../utils/familyLogic';
import { normalizeKindiText, cleanNameText } from './parsers/nameParser';
import { parseKindiCommand, extractKindiTargetText } from './parsers/addCommandParser';
import { extractUpdateFields, parseUpdateCommand } from './parsers/updateCommandParser';
import { extractDeleteTargetText } from './parsers/deleteCommandParser';
import { DELETE_VERBS, UPDATE_VERBS, normalizeKindiCommandText } from './kindiCommandLexicon';
import type { KindiDeletePlan, KindiExecutivePlan, KindiRoutedIntent, KindiUpdatePlan, KindiParsedCommand } from '../types';

export type { KindiParsedCommand };

interface CreatePlanOptions {
  allPeople?: Person[];
  selectedTarget?: Person;
}

import { findKindiTargetCandidates, resolveKindiCommandTarget } from './parsers/targetResolver';
import type { KindiTargetResolution } from './parsers/targetResolver';

export { findKindiTargetCandidates, resolveKindiCommandTarget };
export type { KindiTargetResolution };

export { extractKindiTargetText, parseKindiCommand } from './parsers/addCommandParser';
export { extractDeleteTargetText } from './parsers/deleteCommandParser';

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const includesAny = (value: string, terms: string[]) =>
  terms.some((term) => normalizeKindiCommandText(value).includes(normalizeKindiCommandText(term)));

export { parseKindiProvidedName } from './parsers/nameParser';

const stripCommandWords = (value: string): string => value
  .replace(new RegExp(`^(?:${DELETE_VERBS.map(escapeRegExp).join('|')})\\s+`, 'iu'), ' ')
  .replace(new RegExp(`^(?:${UPDATE_VERBS.map(escapeRegExp).join('|')})\\s+`, 'iu'), ' ')
  .replace(/\b(?:birth|born|date|place|profession|job|notes|bio|death)\b/gi, ' ')
  .replace(/\s*(?:تاريخ|ميلاد|مكان|الميلاد|الوفاة|وفاة|مهنة|المهنة|عمل|العمل|ملاحظات|ملاحظة|السيرة|نبذة|اسم|الاسم|كنية|كنيته|كنيتها|لقب|لقبه|لقبها|سكن|السكن|يسكن|تسكن|اقامة|إقامة)\s*/giu, ' ')
  .replace(/\s+(?:to|into|as|الى|إلى)\s+.+$/iu, ' ')
  .replace(/\s+/g, ' ')
  .trim();

export const extractKindiSubjectText = (query: string): string | undefined => {
  if (includesAny(normalizeKindiText(query), ['عدل', 'غير', 'حدث', 'update', 'edit', 'change', 'rename', 'modify'])) {
    const updateSubject = parseUpdateCommand(query).subjectText;
    if (updateSubject) return updateSubject;
  }

  if (includesAny(normalizeKindiText(query), ['حذف', 'احذف', 'امسح', 'أزل', 'remove', 'delete', 'erase'])) {
    const deleteSubject = extractDeleteTargetText(query);
    if (deleteSubject) return deleteSubject;
  }

  const explicit = extractKindiTargetText(query);
  if (explicit) return explicit;
  return cleanNameText(stripCommandWords(query));
};

export const createKindiExecutivePlan = (
  routed: KindiRoutedIntent,
  relatedPeople: Person[],
  fallbackFocusId: string | undefined,
  options: CreatePlanOptions | Person[] = {}
): KindiExecutivePlan | null => {
  if (routed.kind === 'GREETING' || routed.kind === 'SUPPORT' || routed.kind === 'UNKNOWN' || routed.kind === 'QUERY') {
    return null;
  }

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
      initialUpdates: parsed.initialUpdates,
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
    const candidates = findKindiTargetCandidates(extractDeleteTargetText(routed.query), allPeople);
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
