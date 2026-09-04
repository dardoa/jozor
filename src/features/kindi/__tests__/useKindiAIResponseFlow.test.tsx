import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Person } from '../../../types/person';
import { useKindiAIResponseFlow } from '../hooks/useKindiAIResponseFlow';
import type { KindiAIFallbackPlanningResult } from '../hooks/useKindiAIFallbackFlow';
import type {
  KindiAIPlanDraft,
  KindiConfirmation,
  KindiLearningTrace,
  KindiRoutedIntent,
} from '../types';

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

const root = person('private-root-id', 'رمضان');
const candidate = person('private-candidate-id', 'محمد');
const routed: KindiRoutedIntent = {
  kind: 'ACTION',
  query: 'أضف ابنا لرمضان',
  parsedIntents: [],
  targetText: 'رمضان',
  summary: 'إضافة ابن',
};
const draft: KindiAIPlanDraft = {
  intent: 'ADD',
  relation: 'son',
  targetMention: 'رمضان',
  newPersonName: 'محمد',
  confidence: 0.92,
};
const learningTrace: KindiLearningTrace = {
  redactedQuery: 'أضف ابنا لـ[NAME_1]',
  aiDraft: draft,
  confidence: 0.92,
  localLexiconVersion: 'test-v1',
};
const redaction = { redactedText: 'أضف ابنا لـ[NAME_1]', entities: [] };

const createConfirmation = (): KindiConfirmation => ({
  id: 'confirmation-1',
  title: 'تأكيد الإضافة',
  description: 'إضافة محمد ابنا لرمضان',
  confirmLabel: 'إضافة',
  cancelLabel: 'إلغاء',
  kind: 'ACTION',
  status: 'pending',
  relatedPeople: [root],
  plan: {
    type: 'ADD',
    relation: 'child',
    gender: 'male',
    targetPersonId: root.id,
    targetPersonName: root.firstName,
    name: { firstName: candidate.firstName },
  },
});

const createHarness = () => {
  const callbacks = {
    addAssistantMessageWithCue: vi.fn(),
    requestDisambiguation: vi.fn(),
    requestMissingAddName: vi.fn(),
    setLastContextPersonId: vi.fn(),
    logLearningSuccess: vi.fn(),
  };
  const hook = renderHook(() => useKindiAIResponseFlow({
    language: 'ar',
    ...callbacks,
  }));

  return { ...callbacks, ...hook };
};

const plannedResult = (
  planning: Extract<KindiAIFallbackPlanningResult, { kind: 'planned' }>['planning']
): Extract<KindiAIFallbackPlanningResult, { kind: 'planned' }> => ({
  kind: 'planned',
  redaction,
  draft,
  restoredDraft: draft,
  routed,
  syntheticQuery: routed.query,
  planning,
  learningTrace,
});

describe('useKindiAIResponseFlow', () => {
  it.each(['paywall_intercepted', 'cloud_failure_intercepted', 'cancelled'] as const)(
    'treats %s as already handled without emitting another response',
    (kind) => {
      const harness = createHarness();

      expect(harness.result.current.respondToClassifiedAI({ kind }, 'interaction-1')).toBe(true);
      expect(harness.result.current.respondToPlannedAI({ kind }, 'interaction-1')).toBe(true);
      expect(harness.addAssistantMessageWithCue).not.toHaveBeenCalled();
      expect(harness.requestDisambiguation).not.toHaveBeenCalled();
      expect(harness.requestMissingAddName).not.toHaveBeenCalled();
      expect(harness.logLearningSuccess).not.toHaveBeenCalled();
    }
  );

  it('maps a classified support response and records the successful learning trace', () => {
    const harness = createHarness();
    const result: KindiAIFallbackPlanningResult = {
      kind: 'classified',
      redaction,
      classification: { category: 'SUPPORT', confidence: 0.88 },
      learningTrace,
    };

    expect(harness.result.current.respondToClassifiedAI(result, 'interaction-2')).toBe(true);
    expect(harness.logLearningSuccess).toHaveBeenCalledWith(learningTrace);
    expect(harness.addAssistantMessageWithCue).toHaveBeenCalledWith(
      expect.objectContaining({
        answerMeta: {
          source: 'cloud-assisted',
          kind: 'guide',
          interactionId: 'interaction-2',
          feedbackEnabled: true,
        },
      }),
      'greeting'
    );
  });

  it('routes ambiguous planning to the disambiguation flow with no assistant duplicate', () => {
    const harness = createHarness();
    const result = plannedResult({
      kind: 'ambiguous',
      candidates: [candidate],
      resultPeople: [candidate],
      fallbackFocusId: root.id,
      promptName: candidate.firstName,
    });

    expect(harness.result.current.respondToPlannedAI(result, 'interaction-3')).toBe(true);
    expect(harness.requestDisambiguation).toHaveBeenCalledWith(
      routed,
      [candidate],
      [candidate],
      root.id,
      candidate.firstName,
      'interaction-3'
    );
    expect(harness.addAssistantMessageWithCue).not.toHaveBeenCalled();
  });

  it('preserves trace and interaction metadata when the add command still needs a name', () => {
    const harness = createHarness();
    const plan = {
      type: 'ADD' as const,
      relation: 'child' as const,
      gender: 'male' as const,
      targetPersonId: root.id,
      targetPersonName: root.firstName,
    };

    expect(harness.result.current.respondToPlannedAI(plannedResult({
      kind: 'needs_add_name',
      routed,
      plan,
      relatedPeople: [root],
    }), 'interaction-4')).toBe(true);
    expect(harness.requestMissingAddName).toHaveBeenCalledWith({
      routed,
      plan,
      relatedPeople: [root],
      learningTrace,
      interactionId: 'interaction-4',
    });
  });

  it('emits a cloud-assisted confirmation without executing it', () => {
    const harness = createHarness();
    const confirmation = createConfirmation();

    expect(harness.result.current.respondToPlannedAI(plannedResult({
      kind: 'confirmation',
      selectedPersonId: root.id,
      text: 'جهزت التغيير للمراجعة.',
      people: [root],
      visiblePeopleCount: 1,
      confirmation,
    }), 'interaction-5')).toBe(true);
    expect(harness.setLastContextPersonId).toHaveBeenCalledWith(root.id);
    expect(harness.addAssistantMessageWithCue).toHaveBeenCalledWith({
      text: 'جهزت التغيير للمراجعة.',
      people: [root],
      visiblePeopleCount: 1,
      answerMeta: {
        source: 'cloud-assisted',
        kind: 'change',
        interactionId: 'interaction-5',
      },
      confirmation: {
        ...confirmation,
        learningTrace,
        interactionId: 'interaction-5',
      },
    });
    expect(confirmation.status).toBe('pending');
  });

  it('declines unrelated planning outcomes without side effects', () => {
    const harness = createHarness();
    const result: KindiAIFallbackPlanningResult = {
      kind: 'disabled',
      redaction,
    };

    expect(harness.result.current.respondToClassifiedAI(result)).toBe(false);
    expect(harness.result.current.respondToPlannedAI(result)).toBe(false);
    expect(harness.addAssistantMessageWithCue).not.toHaveBeenCalled();
  });
});
