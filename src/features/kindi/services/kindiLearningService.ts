import { authTokenService } from '../../../services/authTokenService';
import { getSupabaseFull } from '../../../services/supabaseClient';
import type { KindiLearningTrace } from '../types';
import { shouldLogKindiLearningTrace } from '../logic/kindiLearningTrace';

export const insertKindiLearningLog = async (trace: KindiLearningTrace): Promise<void> => {
  if (!shouldLogKindiLearningTrace(trace)) return;

  const token = await authTokenService.getPreferredSupabaseToken();
  if (!token) return;

  const supabase = getSupabaseFull(undefined, undefined, token);
  const { error } = await supabase
    .from('kindi_learning_logs')
    .insert({
      redacted_query: trace.redactedQuery,
      ai_draft: trace.aiDraft,
      confidence: trace.confidence,
      local_lexicon_version: trace.localLexiconVersion,
    });

  if (error) throw error;
};

export const logKindiSuccess = (trace?: KindiLearningTrace): void => {
  if (!shouldLogKindiLearningTrace(trace)) return;

  void insertKindiLearningLog(trace).catch((error) => {
    if (import.meta.env.DEV) {
      console.warn('[Kindi learning] Failed to log successful AI trace.', error);
    }
  });
};
