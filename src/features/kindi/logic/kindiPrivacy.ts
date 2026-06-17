import { normalizeArabic } from '../../../utils/search/arabicUtils';
import type { KindiAIPlanDraft } from '../types';

export type KindiRedactionEntityKind = 'target' | 'new_person' | 'subject';

export interface KindiRedactionEntity {
  token: string;
  original: string;
  kind: KindiRedactionEntityKind;
}

export interface KindiPromptRedaction {
  redactedText: string;
  entities: KindiRedactionEntity[];
}

interface EntitySpan {
  start: number;
  end: number;
  kind: KindiRedactionEntityKind;
  original: string;
}

const NAME_TOKEN_PREFIX = 'NAME';
const NAME_TOKEN_PATTERN = /\[NAME_\d+\]/g;
const NAME_CAPTURE =
  String.raw`[\p{Script=Arabic}A-Za-z][\p{Script=Arabic}A-Za-z'\-]*(?:\s+[\p{Script=Arabic}A-Za-z][\p{Script=Arabic}A-Za-z'\-]*){0,5}?`;
const SENTENCE_BOUNDARY = String.raw`(?=\s+(?:اسمه|اسمها|باسم|بإسم|ليكون|لتكون|الى|إلى|to|as)(?:\s|$)|[،,.;:!?؟]|$)`;

const nameMarkerRegex = new RegExp(
  String.raw`(?:اسمه|اسمها|باسم|بإسم|يدعى|تدعى|named|called|name\s+is)\s+(${NAME_CAPTURE})${SENTENCE_BOUNDARY}`,
  'giu',
);

const targetPrepRegex = new RegExp(
  String.raw`(?:^|\s)(?:لـ|ل(?=[\p{Script=Arabic}])|ل\s+|عن\s+|عند\s+|مع\s+|حق\s+|for\s+|to\s+)\s*(${NAME_CAPTURE})${SENTENCE_BOUNDARY}`,
  'giu',
);

const actionSubjectRegex = new RegExp(
  String.raw`(?:^|\s)(?:احذف|حذف|امسح|إزالة|ازالة|عدل|عدّل|تعديل|غير|غيّر|تحديث|حدث|حدّث|صحح|صحّح|delete|remove|update|edit|change)\s+(?:(?:مهنة|المهنة|تاريخ\s+ميلاد|تاريخ\s+الميلاد|مكان\s+الميلاد|مكان\s+الوفاة|ملاحظات|الاسم(?:\s+الأوسط|\s+الاول|\s+الأول)?|birth\s+date|occupation|job|notes|name)\s+)?(${NAME_CAPTURE})(?=\s+(?:الى|إلى|to|as|ليكون|لتكون|هو|هي)(?:\s|$)|[،,.;:!?؟]|$)`,
  'giu',
);

const bareAddNameRegex = new RegExp(
  String.raw`(?:^|\s)(?:أضف|اضف|إضافة|اضافة|ضيف|سجل|add|create)\s+(${NAME_CAPTURE})(?=\s+(?:لـ|ل(?=[\p{Script=Arabic}])|ل\s+|for\s+|to\s+))`,
  'giu',
);

const relationOnlyTerms = new Set(
  [
    'اب',
    'أب',
    'ام',
    'أم',
    'ابن',
    'إبن',
    'بنت',
    'ابنة',
    'إبنة',
    'ولد',
    'طفل',
    'طفلة',
    'زوج',
    'زوجة',
    'حفيد',
    'حفيدة',
    'father',
    'mother',
    'son',
    'daughter',
    'child',
    'wife',
    'husband',
    'spouse',
  ].map((term) => normalizeArabic(term).toLowerCase()),
);

const cleanNameCandidate = (value: string): string => value.replace(/\s+/g, ' ').trim();

const isRelationOnly = (value: string): boolean => {
  const normalized = normalizeArabic(value).toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normalized) return true;
  const words = normalized.split(' ');
  return words.every((word) => relationOnlyTerms.has(word));
};

const addRegexSpans = (
  text: string,
  regex: RegExp,
  kind: KindiRedactionEntityKind,
  spans: EntitySpan[],
  shouldKeep: (candidate: string) => boolean = () => true,
) => {
  regex.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text))) {
    const candidate = cleanNameCandidate(match[1] || '');
    if (!candidate || !shouldKeep(candidate)) continue;

    const rawIndex = match[0].lastIndexOf(match[1]);
    if (rawIndex < 0) continue;

    const start = match.index + rawIndex;
    const end = start + match[1].length;
    spans.push({ start, end, kind, original: candidate });
  }
};

const collectEntitySpans = (text: string): EntitySpan[] => {
  const spans: EntitySpan[] = [];

  addRegexSpans(text, nameMarkerRegex, 'new_person', spans);
  addRegexSpans(text, targetPrepRegex, 'target', spans, (candidate) => !isRelationOnly(candidate));
  addRegexSpans(text, actionSubjectRegex, 'subject', spans, (candidate) => !isRelationOnly(candidate));
  addRegexSpans(text, bareAddNameRegex, 'new_person', spans, (candidate) => !isRelationOnly(candidate));

  return spans
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .reduce<EntitySpan[]>((accepted, span) => {
      const overlaps = accepted.some((existing) => span.start < existing.end && existing.start < span.end);
      if (!overlaps) accepted.push(span);
      return accepted;
    }, []);
};

export const redactKindiPrompt = (text: string): KindiPromptRedaction => {
  const spans = collectEntitySpans(text);
  const entities = spans.map<KindiRedactionEntity>((span, index) => ({
    token: `[${NAME_TOKEN_PREFIX}_${index + 1}]`,
    original: span.original,
    kind: span.kind,
  }));

  let redactedText = text;
  for (let index = spans.length - 1; index >= 0; index -= 1) {
    const span = spans[index];
    const entity = entities[index];
    redactedText = `${redactedText.slice(0, span.start)}${entity.token}${redactedText.slice(span.end)}`;
  }

  return { redactedText, entities };
};

const restoreString = (value: string, entityMap: Map<string, string>): string =>
  value.replace(NAME_TOKEN_PATTERN, (token) => entityMap.get(token) || token);

const restoreValue = (value: unknown, entityMap: Map<string, string>): unknown => {
  if (typeof value === 'string') return restoreString(value, entityMap);
  if (Array.isArray(value)) return value.map((item) => restoreValue(item, entityMap));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, restoreValue(entry, entityMap)]),
    );
  }
  return value;
};

export const restoreKindiDraft = <T extends KindiAIPlanDraft>(draft: T, entities: KindiRedactionEntity[]): T => {
  const entityMap = new Map<string, string>();
  entities.forEach((entity) => {
    entityMap.set(entity.token, entity.original);
  });
  return restoreValue(draft, entityMap) as T;
};
