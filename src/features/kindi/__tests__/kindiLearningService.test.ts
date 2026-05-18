import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn(() => ({ insert: insertMock })));
const getSupabaseFullMock = vi.hoisted(() => vi.fn(() => ({ from: fromMock })));
const getPreferredSupabaseTokenMock = vi.hoisted(() => vi.fn());

vi.mock('../../../services/supabaseClient', () => ({
  getSupabaseFull: getSupabaseFullMock,
}));

vi.mock('../../../services/authTokenService', () => ({
  authTokenService: {
    getPreferredSupabaseToken: getPreferredSupabaseTokenMock,
  },
}));

import { insertKindiLearningLog, logKindiSuccess } from '../services/kindiLearningService';
import type { KindiLearningTrace } from '../types';

const validTrace: KindiLearningTrace = {
  redactedQuery: 'add son for [NAME_1] named [NAME_2]',
  aiDraft: {
    intent: 'ADD',
    relation: 'son',
    targetMention: '[NAME_1]',
    newPersonName: '[NAME_2]',
    confidence: 0.91,
  },
  confidence: 0.91,
  localLexiconVersion: 'test-lexicon',
};

describe('kindiLearningService', () => {
  beforeEach(() => {
    insertMock.mockReset().mockResolvedValue({ error: null });
    fromMock.mockClear();
    getSupabaseFullMock.mockClear();
    getPreferredSupabaseTokenMock.mockReset().mockResolvedValue('token');
  });

  it('ignores learning traces that do not contain redacted name tokens', () => {
    logKindiSuccess({
      ...validTrace,
      redactedQuery: 'add son for Sami named Khaled',
    });

    expect(getPreferredSupabaseTokenMock).not.toHaveBeenCalled();
    expect(getSupabaseFullMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('inserts only redacted successful AI traces', async () => {
    await insertKindiLearningLog(validTrace);

    expect(getPreferredSupabaseTokenMock).toHaveBeenCalledTimes(1);
    expect(fromMock).toHaveBeenCalledWith('kindi_learning_logs');
    expect(insertMock).toHaveBeenCalledWith({
      redacted_query: validTrace.redactedQuery,
      ai_draft: validTrace.aiDraft,
      confidence: validTrace.confidence,
      local_lexicon_version: validTrace.localLexiconVersion,
    });
  });
});
