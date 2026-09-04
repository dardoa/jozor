import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { Person } from '../../../types/person';
import { useKindiDecisionFlow } from '../hooks/useKindiDecisionFlow';
import { routeKindiIntent } from '../logic/intentRouter';
import type { KindiLearningEventInput } from '../services/kindiLearningService';
import type { KindiConfirmation, KindiMessage } from '../types';

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

const firstMohammed = person('private-mohammed-1', 'محمد');
const secondMohammed = person('private-mohammed-2', 'محمد');

const createHarness = (messages: KindiMessage[] = []) => {
  const callbacks = {
    addAssistantMessage: vi.fn(() => 'message-id'),
    addAssistantMessageWithCue: vi.fn(),
    setConfirmationStatus: vi.fn(),
    setDisambiguationStatus: vi.fn(),
    setLastContextPersonId: vi.fn(),
    logEvent: vi.fn<(event: KindiLearningEventInput) => void>(),
    getSafeRedactedQuery: vi.fn(() => 'أضف ابنا لـ[NAME_1]'),
  };
  const hook = renderHook(() => useKindiDecisionFlow({
    language: 'ar',
    messages,
    peopleList: [firstMohammed, secondMohammed],
    ...callbacks,
  }));

  return { ...callbacks, ...hook };
};

afterEach(() => {
  vi.useRealTimers();
});

describe('useKindiDecisionFlow', () => {
  it('requests a missing name and turns the supplied name into a pending confirmation', async () => {
    vi.useFakeTimers();
    const harness = createHarness();
    const routed = routeKindiIntent('أضف ابن لمحمد');
    const plan = {
      type: 'ADD' as const,
      relation: 'child' as const,
      gender: 'male' as const,
      targetPersonId: firstMohammed.id,
      targetPersonName: firstMohammed.firstName,
    };

    act(() => {
      harness.result.current.requestMissingAddName({
        interactionId: 'interaction-1',
        routed,
        plan,
        relatedPeople: [firstMohammed],
      });
    });
    expect(harness.result.current.hasPendingAddName).toBe(true);
    expect(harness.addAssistantMessageWithCue).toHaveBeenCalledWith(
      expect.objectContaining({ people: [firstMohammed], visiblePeopleCount: 1 }),
      'flow-add'
    );

    await act(async () => {
      const response = harness.result.current.respondToPendingAddName('علي القرجي');
      await vi.advanceTimersByTimeAsync(450);
      expect(await response).toBe(true);
    });

    expect(harness.result.current.hasPendingAddName).toBe(false);
    expect(harness.addAssistantMessage).toHaveBeenLastCalledWith(expect.objectContaining({
      people: [firstMohammed],
      confirmation: expect.objectContaining({
        interactionId: 'interaction-1',
        plan: expect.objectContaining({
          type: 'ADD',
          targetPersonId: firstMohammed.id,
          name: { firstName: 'علي', lastName: 'القرجي' },
        }),
      }),
    }));
  });

  it('shows disambiguation with bounded telemetry and no person name in metadata', () => {
    const harness = createHarness();
    const routed = routeKindiIntent('أضف ابن لمحمد اسمه علي');

    act(() => {
      harness.result.current.requestDisambiguation(
        routed,
        [firstMohammed, secondMohammed],
        [firstMohammed, secondMohammed],
        undefined,
        'محمد',
        'interaction-2'
      );
    });

    expect(harness.logEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'disambiguation_shown',
      interactionId: 'interaction-2',
      redactedQuery: 'أضف ابنا لـ[NAME_1]',
      metadata: { candidateCount: 2 },
    }));
    expect(JSON.stringify(harness.logEvent.mock.calls[0][0].metadata)).not.toContain('محمد');
    expect(harness.addAssistantMessageWithCue).toHaveBeenCalledWith(expect.objectContaining({
      people: [firstMohammed, secondMohammed],
      visiblePeopleCount: 2,
      disambiguation: expect.objectContaining({ status: 'pending' }),
    }));
  });

  it('uses the selected ambiguous person to prepare a confirmation without executing it', () => {
    const routed = routeKindiIntent('أضف ابن لمحمد اسمه علي');
    const message: KindiMessage = {
      id: 'disambiguation-message',
      role: 'assistant',
      text: 'اختر الشخص المقصود',
      disambiguation: {
        interactionId: 'interaction-3',
        promptName: 'محمد',
        routedIntent: routed,
        resultPeople: [firstMohammed, secondMohammed],
        status: 'pending',
      },
    };
    const harness = createHarness([message]);

    act(() => {
      harness.result.current.chooseDisambiguation(message.id, secondMohammed.id);
    });

    expect(harness.setDisambiguationStatus).toHaveBeenCalledWith(message.id, 'resolved');
    expect(harness.setLastContextPersonId).toHaveBeenCalledWith(secondMohammed.id);
    expect(harness.addAssistantMessage).toHaveBeenCalledWith(expect.objectContaining({
      confirmation: expect.objectContaining({
        interactionId: 'interaction-3',
        plan: expect.objectContaining({
          type: 'ADD',
          targetPersonId: secondMohammed.id,
          name: { firstName: 'علي' },
        }),
      }),
    }));
    expect(harness.logEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'confirmation_shown',
      parserStage: 'confirmation',
    }));
  });

  it('cancels only pending confirmations and records the redacted trace', () => {
    const harness = createHarness();
    const confirmation: KindiConfirmation = {
      id: 'confirmation-1',
      title: 'تأكيد',
      description: 'وصف',
      confirmLabel: 'نعم',
      cancelLabel: 'لا',
      kind: 'ACTION',
      status: 'pending',
      learningTrace: {
        redactedQuery: 'أضف ابنا لـ[NAME_1]',
        aiDraft: { intent: 'ADD', confidence: 0.8 },
        confidence: 0.8,
        localLexiconVersion: 'test-v1',
      },
    };

    act(() => {
      harness.result.current.cancel(confirmation);
    });

    expect(harness.setConfirmationStatus).toHaveBeenCalledWith(confirmation.id, 'cancelled');
    expect(harness.logEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'confirmation_cancelled',
      redactedQuery: 'أضف ابنا لـ[NAME_1]',
      confidence: 0.8,
    }));
    expect(harness.addAssistantMessage).not.toHaveBeenCalled();
  });

  it('keeps a standalone acknowledgement for cancellation without a confirmation card', () => {
    const harness = createHarness();

    act(() => {
      harness.result.current.cancel();
    });

    expect(harness.setConfirmationStatus).not.toHaveBeenCalled();
    expect(harness.logEvent).not.toHaveBeenCalled();
    expect(harness.addAssistantMessage).toHaveBeenCalledWith({
      text: expect.any(String),
    });
  });
});
