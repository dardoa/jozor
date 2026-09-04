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

import {
  insertKindiLearningEvent,
  insertKindiLearningLog,
  logKindiSuccess,
  type KindiLearningEventInput,
} from '../services/kindiLearningService';
import { KINDI_LEARNING_PARSER_NAMES } from '../logic/kindiLearningDimensions';
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

  it('inserts redacted learning events without raw query data', async () => {
    await insertKindiLearningEvent({
      eventType: 'ai_fallback_result',
      interactionId: '7c785f48-88b8-4ab2-a3c2-04c9d31c138a',
      routeKind: 'QUERY',
      resultKind: 'planned',
      failureReason: 'LOCAL_SEARCH_FAILED',
      redactedQuery: 'add son for [NAME_1] named [NAME_2]',
      confidence: 0.8,
      intentGuess: 'ADD',
      parserStage: 'ai_fallback',
      parserName: 'kindiAIService',
      metadata: {
        candidateCount: 2,
        promptName: 'must-not-be-sent',
        personId: 'must-not-be-sent',
        rawQuery: 'must-not-be-sent',
      },
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'ai_fallback_result',
      interaction_id: '7c785f48-88b8-4ab2-a3c2-04c9d31c138a',
      route_kind: 'QUERY',
      result_kind: 'planned',
      failure_reason: 'LOCAL_SEARCH_FAILED',
      redacted_query: 'add son for [NAME_1] named [NAME_2]',
      confidence: 0.8,
      intent_guess: 'ADD',
      parser_stage: 'ai_fallback',
      parser_name: 'kindiAIService',
      metadata: {
        candidateCount: 2,
      },
    }));
  });

  it('allows only controlled answer metadata for feedback events', async () => {
    await insertKindiLearningEvent({
      eventType: 'answer_feedback_unhelpful',
      interactionId: '7861f0e8-93e7-43f0-a881-7cd1048b78ca',
      routeKind: 'SUPPORT',
      resultKind: 'guide',
      parserStage: 'support_guide',
      parserName: 'kindiHelpKnowledgeService',
      metadata: {
        answerSource: 'help-center',
        answerKind: 'guide',
        topicId: 'backup-restore',
        rawQuery: 'must-not-be-sent',
        personName: 'must-not-be-sent',
      },
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      event_type: 'answer_feedback_unhelpful',
      redacted_query: undefined,
      metadata: {
        answerSource: 'help-center',
        answerKind: 'guide',
        topicId: 'backup-restore',
      },
    }));
  });

  it('accepts diagnostic as a controlled local answer kind', async () => {
    await insertKindiLearningEvent({
      eventType: 'answer_feedback_helpful',
      metadata: {
        answerSource: 'local-tree',
        answerKind: 'diagnostic',
      },
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      metadata: {
        answerSource: 'local-tree',
        answerKind: 'diagnostic',
      },
    }));
  });

  it('accepts biography as a controlled local answer kind without storing draft text', async () => {
    await insertKindiLearningEvent({
      eventType: 'answer_feedback_helpful',
      metadata: {
        answerSource: 'local-tree',
        answerKind: 'biography',
        draftText: 'private biography text',
      },
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      metadata: {
        answerSource: 'local-tree',
        answerKind: 'biography',
      },
    }));
    expect(JSON.stringify(insertMock.mock.calls[0]?.[0])).not.toContain('private biography text');
  });

  it('accepts record review as a dimension without storing notes or source details', async () => {
    await insertKindiLearningEvent({
      eventType: 'answer_feedback_helpful',
      metadata: {
        answerSource: 'local-tree',
        answerKind: 'record-review',
        noteText: 'private family note',
        sourceUrl: 'https://private.example/source',
      },
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      metadata: {
        answerSource: 'local-tree',
        answerKind: 'record-review',
      },
    }));
    expect(JSON.stringify(insertMock.mock.calls[0]?.[0])).not.toContain('private family note');
    expect(JSON.stringify(insertMock.mock.calls[0]?.[0])).not.toContain('private.example');
  });

  it('rejects unsafe values even when they use allowed metadata keys', async () => {
    await insertKindiLearningEvent({
      eventType: 'answer_feedback_unhelpful',
      metadata: {
        answerSource: 'owner@example.test',
        answerKind: 'https://private.example/kind',
        topicId: 'https://private.example/person/123',
        route: 'bearer private-token',
        candidateCount: 2.5,
        bestScore: Number.POSITIVE_INFINITY,
      },
    });

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({
      metadata: {},
    }));
    expect(JSON.stringify(insertMock.mock.calls[0]?.[0])).not.toContain('owner@example.test');
    expect(JSON.stringify(insertMock.mock.calls[0]?.[0])).not.toContain('private.example');
    expect(JSON.stringify(insertMock.mock.calls[0]?.[0])).not.toContain('private-token');
  });

  it('drops unrecognized event dimensions and non-opaque interaction identifiers', async () => {
    await insertKindiLearningEvent({
      eventType: 'search_failure',
      interactionId: 'person_private-family-id',
      routeKind: 'PRIVATE_PERSON_NAME',
      resultKind: 'private-family-name',
      failureReason: 'owner@example.test',
      aiCategory: 'https://private.example/category',
      intentGuess: 'bearer private-token',
      parserStage: 'private-stage',
      parserName: 'person_internal-id',
    } as unknown as KindiLearningEventInput);

    const insertedEvent = insertMock.mock.calls[0]?.[0];
    expect(insertedEvent).toEqual(expect.objectContaining({
      event_type: 'search_failure',
      interaction_id: undefined,
      route_kind: undefined,
      result_kind: undefined,
      failure_reason: undefined,
      ai_category: undefined,
      intent_guess: undefined,
      parser_stage: undefined,
      parser_name: undefined,
    }));
    expect(JSON.stringify(insertedEvent)).not.toContain('private-family');
    expect(JSON.stringify(insertedEvent)).not.toContain('owner@example.test');
    expect(JSON.stringify(insertedEvent)).not.toContain('private.example');
    expect(JSON.stringify(insertedEvent)).not.toContain('private-token');
    expect(JSON.stringify(insertedEvent)).not.toContain('person_internal-id');
  });

  it('retains every registered code-owned parser name', async () => {
    for (const parserName of KINDI_LEARNING_PARSER_NAMES) {
      await insertKindiLearningEvent({
        eventType: 'query_submitted',
        parserName,
      });
    }

    expect(insertMock.mock.calls.map((call) => call[0]?.parser_name))
      .toEqual(KINDI_LEARNING_PARSER_NAMES);
  });

  it('retains command-planning and confirmation result dimensions', async () => {
    const resultKinds = ['ambiguous', 'needs_add_name', 'confirmation', 'ACTION'] as const;

    for (const resultKind of resultKinds) {
      await insertKindiLearningEvent({
        eventType: 'confirmation_shown',
        resultKind,
      });
    }

    expect(insertMock.mock.calls.map((call) => call[0]?.result_kind))
      .toEqual(resultKinds);
  });
});
