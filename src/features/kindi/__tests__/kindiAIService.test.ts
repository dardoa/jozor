import { beforeEach, describe, expect, it, vi } from 'vitest';

import { callAIProxy } from '../../../services/aiProxyClient';
import {
  requestKindiPlanDraft,
  requestKindiClassification,
  requestKindiClassificationWithUsage,
  sanitizeKindiClassification,
  sanitizeKindiPlanDraft,
} from '../services/kindiAIService';

vi.mock('../../../services/aiProxyClient', () => ({
  callAIProxy: vi.fn(),
}));

describe('kindiAIService', () => {
  beforeEach(() => {
    vi.mocked(callAIProxy).mockReset();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('requests the kindi_plan operation and parses fenced JSON', async () => {
    vi.mocked(callAIProxy).mockResolvedValue({
      result: '```json\n{"intent":"ADD","relation":"son","gender":"male","targetMention":"[NAME_1]","newPersonName":"[NAME_2]","confidence":0.93}\n```',
    });

    await expect(requestKindiPlanDraft('أضف ابن ل[NAME_1] اسمه [NAME_2]')).resolves.toMatchObject({
      intent: 'ADD',
      relation: 'son',
      gender: 'male',
      targetMention: '[NAME_1]',
      newPersonName: '[NAME_2]',
      confidence: 0.93,
    });
    expect(callAIProxy).toHaveBeenCalledWith({
      operation: 'kindi_plan',
      data: { redactedText: 'أضف ابن ل[NAME_1] اسمه [NAME_2]' },
    });
  });

  it('drops ids and unsupported update fields from AI output', () => {
    expect(sanitizeKindiPlanDraft({
      intent: 'UPDATE',
      personId: 'invented-id',
      targetMention: '[NAME_1]',
      updates: {
        profession: 'طبيب',
        id: 'bad-id',
        parents: ['p1'],
      },
      confidence: 1.5,
    })).toEqual({
      intent: 'UPDATE',
      targetMention: '[NAME_1]',
      updates: {
        profession: 'طبيب',
      },
      confidence: 1,
    });
  });

  it('returns null for invalid proxy JSON or malformed drafts', async () => {
    vi.mocked(callAIProxy).mockResolvedValueOnce({ result: 'not-json' });
    await expect(requestKindiPlanDraft('[NAME_1]')).resolves.toBeNull();

    vi.mocked(callAIProxy).mockResolvedValueOnce({ result: '{"intent":"ADD"}' });
    await expect(requestKindiPlanDraft('[NAME_1]')).resolves.toBeNull();
  });

  it('rejects invented redaction tokens and internal identifiers', async () => {
    vi.mocked(callAIProxy).mockResolvedValueOnce({
      result: '{"category":"EXECUTABLE_COMMAND","draft":{"intent":"DELETE","targetMention":"[NAME_999]","confidence":0.9},"confidence":0.9}',
    });
    await expect(requestKindiPlanDraft('احذف [NAME_1]')).resolves.toBeNull();

    expect(sanitizeKindiPlanDraft({
      intent: 'DELETE',
      targetMention: '64392415-5ef0-46f3-b869-8adddb4fa9e3',
      confidence: 0.9,
    })).toBeNull();
  });

  it('does not retain executable drafts on non-executable classifications', () => {
    expect(sanitizeKindiClassification({
      category: 'SUPPORT',
      draft: {
        intent: 'DELETE',
        targetMention: '[NAME_1]',
        confidence: 0.99,
      },
      confidence: 0.9,
    }, new Set(['[NAME_1]']))).toEqual({
      category: 'SUPPORT',
      confidence: 0.9,
    });
  });

  it('preserves authoritative usage returned by the proxy', async () => {
    vi.mocked(callAIProxy).mockResolvedValueOnce({
      result: '{"category":"FAMILY_QUERY","confidence":0.91}',
      usage: {
        used: 9,
        limit: 30,
        resetAt: '2026-10-01T00:00:00.000Z',
      },
    });

    await expect(requestKindiClassificationWithUsage('[NAME_1] family')).resolves.toEqual({
      classification: {
        category: 'FAMILY_QUERY',
        confidence: 0.91,
      },
      usage: {
        used: 9,
        limit: 30,
        resetAt: '2026-10-01T00:00:00.000Z',
      },
    });
  });

  it('propagates the authoritative quota error for controller handling', async () => {
    vi.mocked(callAIProxy).mockRejectedValueOnce({
      code: 'AI_USAGE_LIMIT_EXCEEDED',
    });

    await expect(requestKindiClassificationWithUsage('[NAME_1] family')).rejects.toMatchObject({
      code: 'AI_USAGE_LIMIT_EXCEEDED',
    });
  });

  it('propagates cloud failures through the usage-aware contract while preserving the legacy nullable contract', async () => {
    const networkError = new TypeError('Failed to fetch');
    vi.mocked(callAIProxy).mockRejectedValueOnce(networkError);

    await expect(requestKindiClassificationWithUsage('[NAME_1] family')).rejects.toBe(networkError);

    vi.mocked(callAIProxy).mockRejectedValueOnce(networkError);
    await expect(requestKindiClassification('[NAME_1] family')).resolves.toBeNull();
  });

  it('ignores malformed usage without discarding a valid classification', async () => {
    vi.mocked(callAIProxy).mockResolvedValueOnce({
      result: '{"category":"SUPPORT","confidence":0.8}',
      usage: {
        used: 31,
        limit: 30,
        resetAt: 'not-a-date',
      },
    });

    await expect(requestKindiClassificationWithUsage('[NAME_1] help')).resolves.toEqual({
      classification: {
        category: 'SUPPORT',
        confidence: 0.8,
      },
    });
  });
});
