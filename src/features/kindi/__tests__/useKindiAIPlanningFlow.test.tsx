import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Person } from '../../../types';
import type { KindiAIPlanningResult } from '../hooks/useKindiAIPlanningFlow';
import { buildKindiAICommandQuery, useKindiAIPlanningFlow } from '../hooks/useKindiAIPlanningFlow';

const person = (id: string, firstName: string): Person => ({
  id,
  title: '',
  firstName,
  middleName: '',
  lastName: 'القرجي',
  birthName: '',
  nickName: '',
  suffix: '',
  gender: 'male',
  birthDate: '',
  birthPlace: '',
  birthSource: '',
  deathDate: '',
  deathPlace: '',
  deathSource: '',
  burialPlace: '',
  residence: '',
  isDeceased: false,
  profession: '',
  company: '',
  interests: '',
  bio: '',
  gallery: [],
  voiceNotes: [],
  sources: [],
  events: [],
  email: '',
  website: '',
  blog: '',
  address: '',
  parents: [],
  spouses: [],
  children: [],
});

describe('useKindiAIPlanningFlow', () => {
  it('builds local command text from restored AI drafts', () => {
    expect(buildKindiAICommandQuery({
      intent: 'ADD',
      relation: 'child',
      gender: 'M',
      targetMention: 'سامي',
      newPersonName: 'خالد',
      confidence: 0.91,
    })).toBe('add son for سامي named خالد');
  });

  it('stays disabled when no AI request function is provided', async () => {
    const { result } = renderHook(() => useKindiAIPlanningFlow());
    let response: KindiAIPlanningResult | undefined;

    await act(async () => {
      response = await result.current.planWithAI({
        query: 'أضف خالد لسامي',
        peopleList: [person('p1', 'سامي')],
      });
    });

    expect(response!.kind).toBe('disabled');
    expect(response!.redaction.redactedText).not.toContain('خالد');
  });

  it('restores draft names and delegates target resolution to local planning', async () => {
    const requestDraft = vi.fn().mockResolvedValue({
      intent: 'ADD',
      relation: 'son',
      gender: 'male',
      targetMention: '[NAME_1]',
      newPersonName: '[NAME_2]',
      updates: {
        birthPlace: 'كفرنبل',
        birthDate: '1972',
        profession: 'طبيب',
      },
      confidence: 0.9,
    });
    const { result } = renderHook(() => useKindiAIPlanningFlow({ requestDraft }));
    let response: KindiAIPlanningResult | undefined;

    await act(async () => {
      response = await result.current.planWithAI({
        query: 'أضف ابن لسامي اسمه خالد',
        peopleList: [person('p1', 'سامي')],
      });
    });

    expect(requestDraft).toHaveBeenCalledWith(expect.objectContaining({
      redactedText: expect.stringContaining('[NAME_1]'),
    }));
    expect(response?.kind).toBe('planned');
    const planned = response as Extract<KindiAIPlanningResult, { kind: 'planned' }>;

    expect(planned.restoredDraft.targetMention).toBe('سامي');
    expect(planned.restoredDraft.newPersonName).toBe('خالد');
    expect(planned.learningTrace?.redactedQuery).not.toContain('سامي');
    expect(planned.learningTrace?.redactedQuery).not.toContain('خالد');
    expect(planned.learningTrace?.redactedQuery).toContain('[NAME_');
    expect(planned.learningTrace?.aiDraft).toMatchObject({
      targetMention: '[NAME_1]',
      newPersonName: '[NAME_2]',
    });
    expect(planned.syntheticQuery).toBe('add son for سامي named خالد');
    expect(planned.planning.kind).toBe('confirmation');
    if (planned.planning.kind !== 'confirmation') return;
    expect(planned.planning.confirmation.plan).toMatchObject({
      type: 'ADD',
      targetPersonId: 'p1',
      name: { firstName: 'خالد' },
      initialUpdates: {
        birthPlace: 'كفرنبل',
        birthDate: '1972',
        profession: 'طبيب',
      },
    });
  });

  it('rejects low-confidence AI drafts before local planning', async () => {
    const requestDraft = vi.fn().mockResolvedValue({
      intent: 'ADD',
      relation: 'son',
      gender: 'male',
      targetMention: '[NAME_1]',
      newPersonName: '[NAME_2]',
      confidence: 0.2,
    });
    const { result } = renderHook(() => useKindiAIPlanningFlow({ requestDraft, minimumConfidence: 0.55 }));
    let response: Awaited<ReturnType<typeof result.current.planWithAI>>;

    await act(async () => {
      response = await result.current.planWithAI({
        query: 'أضف ابن لسامي اسمه خالد',
        peopleList: [person('p1', 'سامي')],
      });
    });

    expect(response!.kind).toBe('low_confidence');
  });
});
