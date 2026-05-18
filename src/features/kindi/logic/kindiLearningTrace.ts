import type { KindiAIPlanDraft, KindiLearningTrace } from '../types';

export const KINDI_LOCAL_LEXICON_VERSION = '2026-05-kindi-v3';

const containsRedactionToken = (value: string): boolean => /\[NAME_\d+\]/.test(value);

export const createKindiLearningTrace = ({
  redactedQuery,
  aiDraft,
  localLexiconVersion = KINDI_LOCAL_LEXICON_VERSION,
}: {
  redactedQuery: string;
  aiDraft: KindiAIPlanDraft;
  localLexiconVersion?: string;
}): KindiLearningTrace | undefined => {
  const cleanedQuery = redactedQuery.replace(/\s+/g, ' ').trim();
  if (!containsRedactionToken(cleanedQuery)) return undefined;

  return {
    redactedQuery: cleanedQuery,
    aiDraft,
    confidence: Number.isFinite(aiDraft.confidence) ? aiDraft.confidence : 0,
    localLexiconVersion,
  };
};

export const shouldLogKindiLearningTrace = (
  trace?: KindiLearningTrace
): trace is KindiLearningTrace => {
  if (!trace) return false;
  if (!containsRedactionToken(trace.redactedQuery)) return false;
  if (!Number.isFinite(trace.confidence)) return false;
  if (trace.confidence < 0 || trace.confidence > 1) return false;
  if (!trace.localLexiconVersion.trim()) return false;
  return true;
};
