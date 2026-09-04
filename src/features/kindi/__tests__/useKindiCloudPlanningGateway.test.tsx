import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Language } from '../../../types/common';
import type { KindiAIFallbackPlanningResult } from '../hooks/useKindiAIFallbackFlow';
import { useKindiCloudPlanningGateway } from '../hooks/useKindiCloudPlanningGateway';
import { getKindiStrings } from '../logic/kindiLocales';

const requestClassification = vi.hoisted(() => vi.fn());

vi.mock('../services/kindiAIService', () => ({
  requestKindiClassificationWithUsage: requestClassification,
}));

const planningRequest = {
  query: 'unknown family request',
  peopleList: [],
};

interface HarnessOptions {
  enabled?: boolean;
  language?: Language;
  subscriptionTier?: 'free' | 'pro' | 'family';
}

const createHarness = ({
  enabled = true,
  language = 'en',
  subscriptionTier = 'pro',
}: HarnessOptions = {}) => {
  const actions = {
    addAssistantMessage: vi.fn(),
    setAiCloudQuotaRemaining: vi.fn(),
  };
  const hook = renderHook(() => useKindiCloudPlanningGateway({
    enabled,
    language,
    subscriptionTier,
    ...actions,
  }));

  return { ...hook, actions };
};

const runPlan = async (
  planWithAI: ReturnType<typeof useKindiCloudPlanningGateway>['planWithAI']
) => {
  let outcome: KindiAIFallbackPlanningResult | undefined;
  await act(async () => {
    outcome = await planWithAI(planningRequest);
  });
  return outcome;
};

describe('useKindiCloudPlanningGateway', () => {
  beforeEach(() => {
    requestClassification.mockReset();
    vi.restoreAllMocks();
  });

  it('keeps cloud planning disabled without contacting the provider', async () => {
    const { result } = createHarness({ enabled: false });

    const outcome = await runPlan(result.current.planWithAI);

    expect(outcome?.kind).toBe('disabled');
    expect(requestClassification).not.toHaveBeenCalled();
  });

  it('intercepts the free tier before any provider request', async () => {
    const dispatchEvent = vi.spyOn(window, 'dispatchEvent');
    const { result, actions } = createHarness({ subscriptionTier: 'free' });

    const outcome = await runPlan(result.current.planWithAI);

    expect(outcome).toEqual({ kind: 'paywall_intercepted' });
    expect(requestClassification).not.toHaveBeenCalled();
    expect(actions.addAssistantMessage).toHaveBeenCalledWith({
      text: getKindiStrings('en').billing.freePaywall,
    });
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-paywall' }));
  });

  it('uses authoritative Pro usage to update remaining quota', async () => {
    requestClassification.mockResolvedValueOnce({
      classification: { category: 'GREETING', confidence: 0.9 },
      usage: { used: 16, limit: 30, resetAt: '2026-10-01T00:00:00.000Z' },
    });
    const { result, actions } = createHarness();

    const outcome = await runPlan(result.current.planWithAI);

    expect(outcome?.kind).toBe('classified');
    expect(actions.setAiCloudQuotaRemaining).toHaveBeenCalledWith(14);
  });

  it('turns an authoritative Pro quota rejection into a localized paywall state', async () => {
    requestClassification.mockRejectedValueOnce({ code: 'AI_USAGE_LIMIT_EXCEEDED' });
    const dispatchEvent = vi.spyOn(window, 'dispatchEvent');
    const { result, actions } = createHarness();

    const outcome = await runPlan(result.current.planWithAI);

    expect(outcome).toEqual({ kind: 'paywall_intercepted' });
    expect(actions.setAiCloudQuotaRemaining).toHaveBeenCalledWith(0);
    expect(actions.addAssistantMessage).toHaveBeenCalledWith({
      text: getKindiStrings('en').billing.quotaExhausted,
    });
    expect(dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({ type: 'open-paywall' }));
  });

  it('converts an upstream failure into a localized message without exposing its details', async () => {
    requestClassification.mockRejectedValueOnce(new TypeError('private upstream failure'));
    const { result, actions } = createHarness();

    const outcome = await runPlan(result.current.planWithAI);

    expect(outcome).toEqual({ kind: 'cloud_failure_intercepted' });
    expect(actions.addAssistantMessage).toHaveBeenCalledWith({
      text: getKindiStrings('en').cloud.unavailable,
    });
    expect(JSON.stringify(actions.addAssistantMessage.mock.calls)).not.toContain('private upstream failure');
  });

  it('does not apply metered usage to the unlimited Family tier', async () => {
    requestClassification.mockResolvedValueOnce({
      classification: { category: 'GREETING', confidence: 0.9 },
      usage: { used: 99, limit: 100, resetAt: '2026-10-01T00:00:00.000Z' },
    });
    const { result, actions } = createHarness({ subscriptionTier: 'family' });

    const outcome = await runPlan(result.current.planWithAI);

    expect(outcome?.kind).toBe('classified');
    expect(actions.setAiCloudQuotaRemaining).not.toHaveBeenCalled();
  });
});
