import { beforeEach, describe, expect, it, vi } from 'vitest';

import { callAIProxy } from '../../../services/aiProxyClient';
import { requestKindiPlanDraft, sanitizeKindiPlanDraft } from '../services/kindiAIService';

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
});
