import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useKindiAIFallbackFlow } from '../hooks/useKindiAIFallbackFlow';
import type { KindiLearningEventInput } from '../services/kindiLearningService';

const request = {
  query: 'حدّث [NAME_1]',
  peopleList: [],
  lastContextPersonId: undefined,
  focusId: undefined,
  interactionId: 'interaction-1',
  routeKind: 'UNKNOWN' as const,
  resultKind: 'unknown_with_intent_signal' as const,
  redactedQuery: 'حدّث [NAME_1]',
  requestParserName: 'kindiAIPlanningFlow' as const,
  debugSearchKind: 'unknown_with_intent_signal',
};

describe('useKindiAIFallbackFlow', () => {
  it('records a classified fallback around the planner with bounded metadata', async () => {
    const sequence: string[] = [];
    const planWithAI = vi.fn(async () => {
      sequence.push('planner');
      return {
        kind: 'classified' as const,
        redaction: { redactedText: 'حدّث [NAME_1]', entities: [] },
        classification: {
          category: 'FAMILY_QUERY' as const,
          confidence: 0.91,
        },
      };
    });
    const loggedEvents: KindiLearningEventInput[] = [];
    const logEvent = vi.fn((event: KindiLearningEventInput) => {
      sequence.push(event.eventType);
      loggedEvents.push(event);
    });
    const logDebug = vi.fn();
    const { result } = renderHook(() => useKindiAIFallbackFlow({
      planWithAI,
      logEvent,
      logDebug,
    }));

    let planningResult: Awaited<ReturnType<typeof result.current.runAIFallback>> | undefined;
    await act(async () => {
      planningResult = await result.current.runAIFallback(request);
    });

    expect(planningResult?.kind).toBe('classified');
    expect(sequence).toEqual(['ai_fallback_requested', 'planner', 'ai_fallback_result']);
    expect(loggedEvents[0]).toEqual({
      eventType: 'ai_fallback_requested',
      interactionId: 'interaction-1',
      routeKind: 'UNKNOWN',
      resultKind: 'unknown_with_intent_signal',
      failureReason: undefined,
      redactedQuery: 'حدّث [NAME_1]',
      intentGuess: 'UNKNOWN',
      parserStage: 'ai_fallback',
      parserName: 'kindiAIPlanningFlow',
    });
    expect(loggedEvents[1]).toMatchObject({
      eventType: 'ai_fallback_result',
      routeKind: 'UNKNOWN',
      resultKind: 'classified',
      aiCategory: 'FAMILY_QUERY',
      confidence: 0.91,
      intentGuess: 'FAMILY_QUERY',
      parserName: 'kindiAIService',
    });
    expect(JSON.stringify(loggedEvents)).not.toContain('private-person-id');
    expect(logDebug).toHaveBeenNthCalledWith(1, 'fallback requested', {
      searchKind: 'unknown_with_intent_signal',
    });
    expect(logDebug).toHaveBeenNthCalledWith(2, 'fallback completed', {
      resultKind: 'classified',
    });
  });

  it('records intercepted cloud outcomes without inventing category or confidence', async () => {
    const planWithAI = vi.fn(async () => ({ kind: 'paywall_intercepted' as const }));
    const logEvent = vi.fn<(event: KindiLearningEventInput) => void>();
    const { result } = renderHook(() => useKindiAIFallbackFlow({ planWithAI, logEvent }));

    await act(async () => {
      await result.current.runAIFallback({
        ...request,
        routeKind: 'QUERY',
        resultKind: 'low_confidence',
        requestParserName: 'kindiAIPlanningFlow',
        debugSearchKind: undefined,
      });
    });

    expect(logEvent).toHaveBeenCalledTimes(2);
    expect(logEvent.mock.calls[1][0]).toMatchObject({
      eventType: 'ai_fallback_result',
      routeKind: 'QUERY',
      resultKind: 'paywall_intercepted',
    });
    expect(logEvent.mock.calls[1][0].aiCategory).toBeUndefined();
    expect(logEvent.mock.calls[1][0].confidence).toBeUndefined();
    expect(logEvent.mock.calls[1][0].intentGuess).toBeUndefined();
  });

  it('does not record a stale completion after the cloud request is cancelled', async () => {
    const planWithAI = vi.fn(async () => ({ kind: 'cancelled' as const }));
    const logEvent = vi.fn<(event: KindiLearningEventInput) => void>();
    const logDebug = vi.fn();
    const { result } = renderHook(() => useKindiAIFallbackFlow({
      planWithAI,
      logEvent,
      logDebug,
    }));

    let planningResult: Awaited<ReturnType<typeof result.current.runAIFallback>> | undefined;
    await act(async () => {
      planningResult = await result.current.runAIFallback(request);
    });

    expect(planningResult).toEqual({ kind: 'cancelled' });
    expect(logEvent).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'ai_fallback_requested',
      interactionId: 'interaction-1',
    }));
    expect(logDebug).toHaveBeenCalledTimes(1);
    expect(logDebug).toHaveBeenCalledWith('fallback requested', {
      searchKind: 'unknown_with_intent_signal',
    });
  });
});
