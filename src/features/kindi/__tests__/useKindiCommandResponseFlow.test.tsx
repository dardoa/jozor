import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { useKindiAIFallbackFlow } from '../hooks/useKindiAIFallbackFlow';
import type { useKindiCommandPlanningFlow } from '../hooks/useKindiCommandPlanningFlow';
import { useKindiCommandResponseFlow } from '../hooks/useKindiCommandResponseFlow';
import { getKindiStrings } from '../logic/kindiLocales';
import type { KindiTreeRole } from '../logic/kindiPermissions';
import type { KindiRoutedIntent } from '../types';

const routedUpdate: KindiRoutedIntent = {
  kind: 'UPDATE',
  query: 'update birth date',
  parsedIntents: [],
  targetText: 'person',
  summary: 'Update a birth date',
};

const confirmationPlanning = {
  kind: 'confirmation' as const,
  selectedPersonId: 'person-1',
  text: 'Review the update',
  people: [],
  visiblePeopleCount: 0,
  confirmation: {
    id: 'confirmation-1',
    title: 'Review update',
    description: 'Update a field through the official action',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel',
    kind: 'UPDATE' as const,
    status: 'pending' as const,
    plan: {
      type: 'UPDATE' as const,
      personId: 'person-1',
      updates: { birthDate: '1990' },
    },
  },
};

const createHarness = ({
  currentUserRole = 'owner',
  currentTreeId = null,
  isAIEnabled = false,
}: {
  currentUserRole?: KindiTreeRole;
  currentTreeId?: string | null;
  isAIEnabled?: boolean;
} = {}) => {
  const planCommand = vi.fn<ReturnType<typeof useKindiCommandPlanningFlow>['planCommand']>();
  planCommand.mockReturnValue(confirmationPlanning);
  const runAIFallback = vi.fn<ReturnType<typeof useKindiAIFallbackFlow>['runAIFallback']>();
  runAIFallback.mockResolvedValue({ kind: 'cloud_failure_intercepted' });
  const actions = {
    planCommand,
    runAIFallback,
    respondToPlannedAI: vi.fn(() => false),
    respondToClassifiedAI: vi.fn(() => false),
    requestDisambiguation: vi.fn(),
    requestMissingAddName: vi.fn(),
    setLastContextPersonId: vi.fn(),
    addAssistantMessageWithCue: vi.fn(),
    logFailure: vi.fn(),
    logEvent: vi.fn(),
  };
  const hook = renderHook(() => useKindiCommandResponseFlow({
    language: 'en',
    currentUserRole,
    currentTreeId,
    peopleList: [],
    lastContextPersonId: 'person-1',
    focusId: 'person-1',
    isAIEnabled,
    ...actions,
  }));

  return { ...hook, actions };
};

describe('useKindiCommandResponseFlow', () => {
  it('blocks viewers before planning or cloud fallback', async () => {
    const { result, actions } = createHarness({ currentUserRole: 'viewer', isAIEnabled: true });

    await act(async () => {
      await result.current.respondToCommandIntent(routedUpdate, routedUpdate.query, 'interaction-1');
    });

    expect(actions.planCommand).not.toHaveBeenCalled();
    expect(actions.runAIFallback).not.toHaveBeenCalled();
    expect(actions.addAssistantMessageWithCue).toHaveBeenCalledWith({
      text: getKindiStrings('en').permissions.readOnly,
    });
  });

  it('blocks unresolved roles on a cloud tree before planning or cloud fallback', async () => {
    const { result, actions } = createHarness({
      currentUserRole: null,
      currentTreeId: 'cloud-tree-1',
      isAIEnabled: true,
    });

    await act(async () => {
      await result.current.respondToCommandIntent(routedUpdate, routedUpdate.query, 'interaction-cloud-role');
    });

    expect(actions.planCommand).not.toHaveBeenCalled();
    expect(actions.runAIFallback).not.toHaveBeenCalled();
    expect(actions.addAssistantMessageWithCue).toHaveBeenCalledWith({
      text: getKindiStrings('en').permissions.readOnly,
    });
  });

  it('prepares a local confirmation without executing the mutation', async () => {
    const { result, actions } = createHarness();

    await act(async () => {
      await result.current.respondToCommandIntent(
        routedUpdate,
        routedUpdate.query,
        'interaction-2',
        'update [NAME_1] birth date'
      );
    });

    expect(actions.setLastContextPersonId).toHaveBeenCalledWith('person-1');
    expect(actions.logEvent).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'confirmation_shown',
      interactionId: 'interaction-2',
      routeKind: 'UPDATE',
      redactedQuery: 'update [NAME_1] birth date',
    }));
    expect(actions.addAssistantMessageWithCue).toHaveBeenCalledWith(expect.objectContaining({
      text: 'Review the update',
      answerMeta: {
        source: 'local-tree',
        kind: 'change',
        interactionId: 'interaction-2',
      },
      confirmation: expect.objectContaining({
        id: 'confirmation-1',
        interactionId: 'interaction-2',
      }),
    }));
    expect(actions.runAIFallback).not.toHaveBeenCalled();
  });

  it('routes ambiguous local targets into the existing decision flow', async () => {
    const { result, actions } = createHarness();
    actions.planCommand.mockReturnValueOnce({
      kind: 'ambiguous',
      candidates: [],
      resultPeople: [],
      fallbackFocusId: 'person-1',
      promptName: 'Alex',
    });

    await act(async () => {
      await result.current.respondToCommandIntent(routedUpdate, routedUpdate.query, 'interaction-3');
    });

    expect(actions.requestDisambiguation).toHaveBeenCalledWith(
      routedUpdate,
      [],
      [],
      'person-1',
      'Alex',
      'interaction-3'
    );
    expect(actions.addAssistantMessageWithCue).not.toHaveBeenCalled();
  });

  it('attempts cloud classification only when local command planning has no plan', async () => {
    const { result, actions } = createHarness({ isAIEnabled: true });
    actions.planCommand.mockReturnValueOnce({
      kind: 'no_plan',
      text: 'No local plan',
      people: [],
    });
    actions.respondToClassifiedAI.mockReturnValueOnce(true);

    await act(async () => {
      await result.current.respondToCommandIntent(routedUpdate, routedUpdate.query, 'interaction-4');
    });

    expect(actions.runAIFallback).toHaveBeenCalledWith(expect.objectContaining({
      routeKind: 'UPDATE',
      resultKind: 'no_plan',
      requestParserName: 'kindiCommandPlanningFlow',
    }));
    expect(actions.respondToClassifiedAI).toHaveBeenCalledWith(
      { kind: 'cloud_failure_intercepted' },
      'interaction-4'
    );
    expect(actions.addAssistantMessageWithCue).not.toHaveBeenCalled();
  });
});
