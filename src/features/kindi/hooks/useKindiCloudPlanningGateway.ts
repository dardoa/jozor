import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { Language } from '../../../types/common';
import { getKindiStrings } from '../logic/kindiLocales';
import type { KindiMessage } from '../types';
import type { KindiAIFallbackPlanningResult } from './useKindiAIFallbackFlow';
import {
  type KindiAIPlannerRequest,
  useKindiAIPlanningFlow,
} from './useKindiAIPlanningFlow';

type KindiSubscriptionTier = 'free' | 'pro' | 'family';
type AddAssistantMessage = (message: Omit<KindiMessage, 'id' | 'role'>) => string | void;

interface UseKindiCloudPlanningGatewayArgs {
  enabled: boolean;
  language: Language;
  subscriptionTier: KindiSubscriptionTier;
  setAiCloudQuotaRemaining: (quota: number) => void;
  addAssistantMessage: AddAssistantMessage;
}

const isUsageLimitError = (error: unknown): boolean => Boolean(
  error
  && typeof error === 'object'
  && 'code' in error
  && error.code === 'AI_USAGE_LIMIT_EXCEEDED'
);

const throwIfRequestWasCancelled = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw new DOMException('The Kindi request was cancelled.', 'AbortError');
  }
};

export const useKindiCloudPlanningGateway = ({
  enabled,
  language,
  subscriptionTier,
  setAiCloudQuotaRemaining,
  addAssistantMessage,
}: UseKindiCloudPlanningGatewayArgs) => {
  const strings = getKindiStrings(language);
  const activeRequestsRef = useRef(new Set<AbortController>());
  const lifecycleVersionRef = useRef(0);

  useEffect(() => () => {
    lifecycleVersionRef.current += 1;
    activeRequestsRef.current.forEach((controller) => controller.abort());
    activeRequestsRef.current.clear();
  }, []);

  const requestDraft = useMemo<KindiAIPlannerRequest | undefined>(() => {
    if (!enabled) return undefined;

    return async ({ redactedText, signal }) => {
      throwIfRequestWasCancelled(signal);
      const { requestKindiClassificationWithUsage } = await import('../services/kindiAIService');
      throwIfRequestWasCancelled(signal);
      const response = await requestKindiClassificationWithUsage(redactedText, { signal });
      throwIfRequestWasCancelled(signal);
      if (subscriptionTier === 'pro' && response.usage) {
        setAiCloudQuotaRemaining(Math.max(0, response.usage.limit - response.usage.used));
      }
      return response.classification;
    };
  }, [enabled, setAiCloudQuotaRemaining, subscriptionTier]);

  const { planWithAI: planWithAIRaw } = useKindiAIPlanningFlow({
    requestDraft,
    language,
  });

  const planWithAI = useCallback(
    async (args: Parameters<typeof planWithAIRaw>[0]): Promise<KindiAIFallbackPlanningResult> => {
      if (subscriptionTier === 'free') {
        addAssistantMessage({ text: strings.billing.freePaywall });
        window.dispatchEvent(new CustomEvent('open-paywall'));
        return { kind: 'paywall_intercepted' };
      }

      const controller = new AbortController();
      const requestLifecycleVersion = lifecycleVersionRef.current;
      activeRequestsRef.current.add(controller);

      try {
        const result = await planWithAIRaw({ ...args, signal: controller.signal });
        const requestIsStale = controller.signal.aborted
          || lifecycleVersionRef.current !== requestLifecycleVersion;
        if (requestIsStale) {
          return { kind: 'cancelled' };
        }

        if (subscriptionTier === 'pro' && result.kind === 'failed' && isUsageLimitError(result.error)) {
          setAiCloudQuotaRemaining(0);
          addAssistantMessage({ text: strings.billing.quotaExhausted });
          window.dispatchEvent(new CustomEvent('open-paywall'));
          return { kind: 'paywall_intercepted' };
        }

        if (result.kind === 'failed') {
          addAssistantMessage({ text: strings.cloud.unavailable });
          return { kind: 'cloud_failure_intercepted' };
        }

        return result;
      } finally {
        activeRequestsRef.current.delete(controller);
      }
    },
    [
      addAssistantMessage,
      planWithAIRaw,
      setAiCloudQuotaRemaining,
      strings.billing.freePaywall,
      strings.billing.quotaExhausted,
      strings.cloud.unavailable,
      subscriptionTier,
    ]
  );

  return { planWithAI };
};
