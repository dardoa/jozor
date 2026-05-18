import { normalizeArabic, stripArabicPrefixes } from '../../../../utils/search/arabicUtils';
import type { KindiAddPlan } from '../../types';

export const normalizeKindiText = (value: string | undefined): string =>
  stripArabicPrefixes(normalizeArabic(value || '')).replace(/\s+/g, ' ').trim();

export const cleanNameText = (rawName: string | undefined): string | undefined => {
  const cleaned = rawName
    ?.replace(/[،,.;:!?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || undefined;
};

export const splitPersonName = (rawName: string | undefined): KindiAddPlan['name'] => {
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

export const cleanUpdateValue = (value: string | undefined): string | undefined => {
  const cleaned = cleanNameText(value);
  if (!cleaned) return undefined;

  const withoutNarrativePrefix = cleaned
    .replace(/^(?:انه|أنّه|انهُ|انها|أنها|إنه|إنها|هو|هي)\s+/iu, '')
    .trim();

  const normalized = normalizeKindiText(withoutNarrativePrefix);
  if (['فارغ', 'فاضي', 'خالي', 'بدون', 'empty', 'blank', 'none', 'null'].includes(normalized)) {
    return '';
  }

  return withoutNarrativePrefix || cleaned;
};
