import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useKindiReadResponseFlow } from '../hooks/useKindiReadResponseFlow';
import type { useKindiSearchFlow } from '../hooks/useKindiSearchFlow';
import { resolveKindiLocalStructuredAnswer } from '../logic/kindiLocalAnswerOrchestrator';

vi.mock('../logic/kindiLocalAnswerOrchestrator', () => ({
  resolveKindiLocalStructuredAnswer: vi.fn(),
}));

const createHarness = ({
  isAIEnabled = false,
  lastContextPersonId,
}: {
  isAIEnabled?: boolean;
  lastContextPersonId?: string;
} = {}) => {
  const runSearchFlow = vi.fn<ReturnType<typeof useKindiSearchFlow>['runSearchFlow']>();
  runSearchFlow.mockResolvedValue({
    kind: 'reliable',
    text: 'Found locally',
    peopleResults: [],
    visiblePeopleCount: 0,
  });
  const actions = {
    addAssistantMessageWithCue: vi.fn(),
    runSearchFlow,
    runAIFallback: vi.fn(async () => ({ kind: 'cloud_failure_intercepted' as const })),
    respondToPlannedAI: vi.fn(() => false),
    respondToClassifiedAI: vi.fn(() => false),
    logFailure: vi.fn(),
    logEvent: vi.fn(),
    logDebug: vi.fn(),
  };
  const hook = renderHook(() => useKindiReadResponseFlow({
    language: 'en',
    peopleList: [],
    lastContextPersonId,
    focusId: 'focus-person',
    isAIEnabled,
    ...actions,
  }));

  return { ...hook, actions };
};

describe('useKindiReadResponseFlow', () => {
  beforeEach(() => {
    vi.mocked(resolveKindiLocalStructuredAnswer).mockReset();
    vi.mocked(resolveKindiLocalStructuredAnswer).mockReturnValue(null);
  });

  it('uses a deterministic structured answer before search or cloud fallback', async () => {
    vi.mocked(resolveKindiLocalStructuredAnswer).mockReturnValue({
      kind: 'diagnostic',
      message: {
        text: 'Local diagnostic result',
        answerMeta: {
          source: 'local-tree',
          kind: 'diagnostic',
          interactionId: 'interaction-1',
          feedbackEnabled: true,
        },
      },
    });
    const { result, actions } = createHarness({ isAIEnabled: true });

    await act(async () => {
      await result.current.respondToQueryIntent('diagnose this tree', 'interaction-1');
    });

    expect(actions.addAssistantMessageWithCue).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Local diagnostic result',
    }));
    expect(actions.runSearchFlow).not.toHaveBeenCalled();
    expect(actions.runAIFallback).not.toHaveBeenCalled();
  });

  it('returns indexed search results with local-tree provenance', async () => {
    const { result, actions } = createHarness();

    await act(async () => {
      await result.current.respondToQueryIntent('Lina', 'interaction-2');
    });

    expect(actions.runSearchFlow).toHaveBeenCalledWith('Lina', {
      interactionId: 'interaction-2',
      redactedQuery: undefined,
    });
    expect(actions.addAssistantMessageWithCue).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Found locally',
      answerMeta: {
        source: 'local-tree',
        kind: 'search',
        interactionId: 'interaction-2',
        feedbackEnabled: true,
      },
    }));
  });

  it('uses cloud fallback only after local search cannot answer', async () => {
    const { result, actions } = createHarness({ isAIEnabled: true });
    actions.runSearchFlow.mockResolvedValueOnce({
      kind: 'not_found',
      text: 'Not found locally',
    });
    actions.respondToClassifiedAI.mockReturnValueOnce(true);

    await act(async () => {
      await result.current.respondToQueryIntent(
        'unmatched family question',
        'interaction-3',
        '[NAME_1] family question'
      );
    });

    expect(actions.runAIFallback).toHaveBeenCalledWith(expect.objectContaining({
      routeKind: 'QUERY',
      resultKind: 'not_found',
      redactedQuery: '[NAME_1] family question',
    }));
    expect(actions.respondToClassifiedAI).toHaveBeenCalledWith(
      { kind: 'cloud_failure_intercepted' },
      'interaction-3'
    );
    expect(actions.addAssistantMessageWithCue).not.toHaveBeenCalled();
  });

  it('answers support from the shared guide and emits topic-only telemetry', () => {
    const { result, actions } = createHarness();

    act(() => {
      result.current.respondToSupportIntent('How do I create a cloud backup?', 'interaction-4');
    });

    expect(actions.addAssistantMessageWithCue).toHaveBeenCalledWith(expect.objectContaining({
      helpTopicId: 'cloud-backup',
      answerMeta: expect.objectContaining({
        source: 'help-center',
        kind: 'guide',
        topicId: 'cloud-backup',
      }),
    }), 'greeting');
    expect(actions.logEvent).toHaveBeenCalledWith({
      eventType: 'support_local_answered',
      interactionId: 'interaction-4',
      routeKind: 'SUPPORT',
      failureReason: undefined,
      redactedQuery: undefined,
      intentGuess: 'SUPPORT',
      parserStage: 'support_guide',
      parserName: 'guideMatcher',
    });
    expect(JSON.stringify(actions.logEvent.mock.calls)).not.toContain('cloud backup?');
  });

  it('keeps an unknown request local when it has no family intent signal', async () => {
    const { result, actions } = createHarness({ isAIEnabled: true });

    await act(async () => {
      await result.current.respondToUnknownIntent(
        'tell me the weather tomorrow',
        'interaction-5'
      );
    });

    expect(actions.logFailure).toHaveBeenCalledWith(
      'PARSER_PATTERN_MISSING',
      'tell me the weather tomorrow',
      { route: 'UNKNOWN' },
      { interactionId: 'interaction-5', redactedQuery: undefined }
    );
    expect(actions.runAIFallback).not.toHaveBeenCalled();
    expect(actions.addAssistantMessageWithCue).toHaveBeenCalledOnce();
  });

  it('allows cloud fallback for an unknown request only when a family intent signal exists', async () => {
    const { result, actions } = createHarness({ isAIEnabled: true });
    actions.respondToClassifiedAI.mockReturnValueOnce(true);

    await act(async () => {
      await result.current.respondToUnknownIntent(
        'show me the family relationship for Lina',
        'interaction-6',
        'show me the family relationship for [NAME_1]'
      );
    });

    expect(actions.runAIFallback).toHaveBeenCalledWith(expect.objectContaining({
      routeKind: 'UNKNOWN',
      resultKind: 'unknown_with_intent_signal',
      redactedQuery: 'show me the family relationship for [NAME_1]',
    }));
    expect(actions.addAssistantMessageWithCue).not.toHaveBeenCalled();
  });

  it('answers greetings locally without search or cloud work', () => {
    const { result, actions } = createHarness({ isAIEnabled: true });

    act(() => {
      result.current.respondToGreetingIntent('How are you?');
    });

    expect(actions.addAssistantMessageWithCue).toHaveBeenCalledWith(
      expect.objectContaining({ text: expect.any(String) }),
      'greeting'
    );
    expect(actions.runSearchFlow).not.toHaveBeenCalled();
    expect(actions.runAIFallback).not.toHaveBeenCalled();
  });
});
