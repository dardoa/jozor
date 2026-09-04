import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKindiTurnSubmissionFlow } from '../hooks/useKindiTurnSubmissionFlow';

const createHarness = ({
  draft = '',
  hasPendingDecision = false,
  hasPendingAddName = false,
  lastConversationCue,
  overrides = {},
}: {
  draft?: string;
  hasPendingDecision?: boolean;
  hasPendingAddName?: boolean;
  lastConversationCue?: 'greeting' | 'flow-search' | 'flow-add';
  overrides?: Record<string, unknown>;
} = {}) => {
  const actions = {
    setDraft: vi.fn(),
    setIsThinking: vi.fn(),
    addAssistantMessage: vi.fn(),
    addUserMessage: vi.fn(),
    clearConversationCue: vi.fn(),
    respondToPendingAddName: vi.fn(async () => true),
    respondToConversationFlow: vi.fn(async () => false),
    respondToQueryIntent: vi.fn(async () => true),
    respondToUnknownIntent: vi.fn(async () => true),
    respondToGreetingIntent: vi.fn(() => true),
    respondToSupportIntent: vi.fn(() => true),
    respondToCommandIntent: vi.fn(async () => true),
    logEvent: vi.fn(),
    ...overrides,
  };

  const hook = renderHook(() => useKindiTurnSubmissionFlow({
    draft,
    language: 'en',
    hasPendingDecision,
    hasPendingAddName,
    lastConversationCue,
    ...actions,
  }));

  return { ...hook, actions };
};

describe('useKindiTurnSubmissionFlow', () => {
  it('ignores empty input without changing conversation state', async () => {
    const { result, actions } = createHarness({ draft: '   ' });

    await act(async () => {
      await result.current.submit();
    });

    expect(actions.addUserMessage).not.toHaveBeenCalled();
    expect(actions.setIsThinking).not.toHaveBeenCalled();
    expect(actions.logEvent).not.toHaveBeenCalled();
  });

  it('blocks a new turn while a decision is pending', async () => {
    const { result, actions } = createHarness({ hasPendingDecision: true });

    await act(async () => {
      await result.current.submit('find Lina');
    });

    expect(actions.addAssistantMessage).toHaveBeenCalledOnce();
    expect(actions.addUserMessage).not.toHaveBeenCalled();
    expect(actions.setDraft).not.toHaveBeenCalled();
    expect(actions.setIsThinking).not.toHaveBeenCalled();
  });

  it('keeps a supplied name in the pending add-name flow without rerouting it', async () => {
    const { result, actions } = createHarness({ hasPendingAddName: true });

    await act(async () => {
      await result.current.submit('Ali Al-Qurji');
    });

    expect(actions.respondToPendingAddName).toHaveBeenCalledWith('Ali Al-Qurji');
    expect(actions.respondToQueryIntent).not.toHaveBeenCalled();
    expect(actions.respondToCommandIntent).not.toHaveBeenCalled();
    expect(actions.logEvent).not.toHaveBeenCalled();
    expect(actions.setIsThinking.mock.calls).toEqual([[true], [false]]);
  });

  it.each([
    ['hello Kindi', 'respondToGreetingIntent'],
    ['what can you do?', 'respondToSupportIntent'],
    ['find Lina', 'respondToQueryIntent'],
    ['tell me a joke', 'respondToUnknownIntent'],
    ['delete Mahmoud', 'respondToCommandIntent'],
  ] as const)('dispatches %s through %s', async (query, responderName) => {
    const { result, actions } = createHarness();

    await act(async () => {
      await result.current.submit(query);
    });

    expect(actions[responderName]).toHaveBeenCalled();
    expect(actions.addUserMessage).toHaveBeenCalledWith(query);
    expect(actions.setIsThinking.mock.calls).toEqual([[true], [false]]);
  });

  it('logs only a redacted command query with the routed interaction', async () => {
    const { result, actions } = createHarness();
    const query = 'أضف ابن لمحمد خير القرجي اسمه أمير';

    await act(async () => {
      await result.current.submit(query);
    });

    const event = actions.logEvent.mock.calls[0]?.[0];
    expect(event).toEqual(expect.objectContaining({
      eventType: 'query_submitted',
      routeKind: 'ACTION',
      intentGuess: 'ACTION',
      parserStage: 'intent_router',
      parserName: 'intentRouter',
    }));
    expect(event.interactionId).toEqual(expect.any(String));
    expect(event.redactedQuery).toContain('[NAME_1]');
    expect(event.redactedQuery).not.toContain('محمد خير القرجي');
    expect(event.redactedQuery).not.toContain('أمير');
  });

  it('always clears thinking state when a responder throws', async () => {
    const failure = new Error('local answer failed');
    const { result, actions } = createHarness({
      overrides: {
        respondToQueryIntent: vi.fn(async () => {
          throw failure;
        }),
      },
    });

    await expect(result.current.submit('find Lina')).rejects.toThrow(failure);

    expect(actions.setIsThinking.mock.calls).toEqual([[true], [false]]);
  });
});
