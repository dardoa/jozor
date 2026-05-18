import { callAIProxy } from '../../../services/aiProxyClient';
import type {
  KindiAIClassification,
  KindiAIClassificationCategory,
  KindiAIPlanDraft,
  KindiAIPlanGender,
  KindiAIPlanIntent,
  KindiAIPlanRelation,
} from '../types';

const INTENTS = new Set<KindiAIPlanIntent>(['ADD', 'UPDATE', 'DELETE', 'QUERY', 'UNKNOWN']);
const CATEGORIES = new Set<KindiAIClassificationCategory>([
  'EXECUTABLE_COMMAND',
  'FAMILY_QUERY',
  'SUPPORT',
  'GREETING',
  'IRRELEVANT',
  'UNCLEAR',
]);
const RELATIONS = new Set<KindiAIPlanRelation>([
  'parent',
  'child',
  'spouse',
  'son',
  'daughter',
  'wife',
  'husband',
  'father',
  'mother',
]);
const GENDERS = new Set<KindiAIPlanGender>(['male', 'female', 'M', 'F']);
const UPDATE_FIELDS = new Set([
  'firstName',
  'middleName',
  'lastName',
  'nickName',
  'birthDate',
  'birthPlace',
  'deathDate',
  'deathPlace',
  'residence',
  'profession',
  'bio',
]);

const cleanJsonCodeBlock = (raw: string): string => {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '');
  }
  return cleaned.trim();
};

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined;

const asString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || undefined;
};

const sanitizeUpdates = (value: unknown): KindiAIPlanDraft['updates'] | undefined => {
  const record = asRecord(value);
  if (!record) return undefined;

  const updates = Object.fromEntries(
    Object.entries(record)
      .filter(([key, entry]) => UPDATE_FIELDS.has(key) && typeof entry === 'string')
      .map(([key, entry]) => [key, asString(entry)])
      .filter(([, entry]) => entry !== undefined),
  ) as KindiAIPlanDraft['updates'];

  return updates && Object.keys(updates).length > 0 ? updates : undefined;
};

export const sanitizeKindiPlanDraft = (value: unknown): KindiAIPlanDraft | null => {
  const record = asRecord(value);
  if (!record || !INTENTS.has(record.intent as KindiAIPlanIntent)) return null;
  if (typeof record.confidence !== 'number' || !Number.isFinite(record.confidence)) return null;

  const draft: KindiAIPlanDraft = {
    intent: record.intent as KindiAIPlanIntent,
    confidence: Math.max(0, Math.min(1, record.confidence)),
  };

  if (RELATIONS.has(record.relation as KindiAIPlanRelation)) {
    draft.relation = record.relation as KindiAIPlanRelation;
  }

  if (GENDERS.has(record.gender as KindiAIPlanGender)) {
    draft.gender = record.gender as KindiAIPlanGender;
  }

  const targetMention = asString(record.targetMention);
  if (targetMention) draft.targetMention = targetMention;

  const newPersonName = asString(record.newPersonName);
  if (newPersonName) draft.newPersonName = newPersonName;

  const updates = sanitizeUpdates(record.updates);
  if (updates) draft.updates = updates;

  if (Array.isArray(record.missingFields)) {
    const missingFields = record.missingFields.map(asString).filter(Boolean) as string[];
    if (missingFields.length > 0) draft.missingFields = missingFields;
  }

  return draft;
};

export const sanitizeKindiClassification = (value: unknown): KindiAIClassification | null => {
  const record = asRecord(value);
  if (!record) return null;

  const legacyDraft = sanitizeKindiPlanDraft(record);
  if (legacyDraft && !('category' in record)) {
    return {
      category: legacyDraft.intent === 'QUERY' ? 'FAMILY_QUERY' : legacyDraft.intent === 'UNKNOWN' ? 'UNCLEAR' : 'EXECUTABLE_COMMAND',
      draft: legacyDraft.intent === 'UNKNOWN' || legacyDraft.intent === 'QUERY' ? undefined : legacyDraft,
      confidence: legacyDraft.confidence,
    };
  }

  if (!CATEGORIES.has(record.category as KindiAIClassificationCategory)) return null;
  const confidence = typeof record.confidence === 'number' && Number.isFinite(record.confidence)
    ? Math.max(0, Math.min(1, record.confidence))
    : 0;
  const draft = sanitizeKindiPlanDraft(record.draft);
  const clarifyingQuestion = asString(record.clarifyingQuestion);

  return {
    category: record.category as KindiAIClassificationCategory,
    ...(draft ? { draft } : {}),
    ...(clarifyingQuestion ? { clarifyingQuestion } : {}),
    confidence,
  };
};

export const requestKindiPlanDraft = async (redactedText: string): Promise<KindiAIPlanDraft | null> => {
  try {
    const response = await callAIProxy({
      operation: 'kindi_plan',
      data: { redactedText },
    });
    const parsed = JSON.parse(cleanJsonCodeBlock(response.result || ''));
    const classification = sanitizeKindiClassification(parsed);
    if (classification?.draft) return classification.draft;
    return sanitizeKindiPlanDraft(parsed);
  } catch (error) {
    console.warn('[Kindi AI] Failed to request or parse plan draft.', error);
    return null;
  }
};

export const requestKindiClassification = async (redactedText: string): Promise<KindiAIClassification | null> => {
  try {
    const response = await callAIProxy({
      operation: 'kindi_plan',
      data: { redactedText },
    });
    const parsed = JSON.parse(cleanJsonCodeBlock(response.result || ''));
    return sanitizeKindiClassification(parsed);
  } catch (error) {
    console.warn('[Kindi AI] Failed to request or parse classification.', error);
    return null;
  }
};
