import { useCallback, useRef } from 'react';

import { useTreeActions } from '../../../hooks/tree/useTreeActions';
import { useAppStore } from '../../../store/useAppStore';
import type { KindiConfirmation, KindiMessage, KindiUndoAction } from '../types';
import type { Person } from '../../../types/person';
import type { Language } from '../../../types/common';
import { getFullName } from '../../../utils/familyLogic';
import { getKindiStrings } from '../logic/kindiLocales';
import type { KindiLearningTrace } from '../types';
import { KINDI_LEARNING_FAILURE_REASONS } from '../logic/kindiLearningTaxonomy';
import { getKindiUndoHistoryToken } from '../logic/kindiUndoHistoryToken';
import { canKindiMutateTree, type KindiTreeRole } from '../logic/kindiPermissions';
import type { KindiLearningFailureReason } from '../logic/kindiLearningTaxonomy';

const logSuccessfulKindiTrace = (trace?: KindiLearningTrace): void => {
  if (!trace) return;
  void import('../services/kindiLearningService').then(({ logKindiSuccess }) => {
    logKindiSuccess(trace);
  });
};

const logConfirmedKindiEvent = (confirmation: KindiConfirmation): void => {
  void import('../services/kindiLearningService').then(({ logKindiLearningEvent }) => {
    logKindiLearningEvent({
      eventType: 'confirmation_confirmed',
      interactionId: confirmation.interactionId,
      routeKind: confirmation.kind,
      resultKind: confirmation.learningTrace ? 'ai_success' : 'local_success',
      redactedQuery: confirmation.learningTrace?.redactedQuery,
      confidence: confirmation.learningTrace?.confidence,
      intentGuess: confirmation.kind,
      parserStage: 'execution',
      parserName: 'useKindiExecutionFlow',
      metadata: {
        planType: confirmation.plan?.type,
      },
    });
  });
};

const logFailedKindiEvent = (
  confirmation: KindiConfirmation,
  failureReason: KindiLearningFailureReason
): void => {
  void import('../services/kindiLearningService').then(({ logKindiLearningEvent }) => {
    logKindiLearningEvent({
      eventType: 'confirmation_failed',
      interactionId: confirmation.interactionId,
      routeKind: confirmation.kind,
      failureReason,
      redactedQuery: confirmation.learningTrace?.redactedQuery,
      confidence: confirmation.learningTrace?.confidence,
      intentGuess: confirmation.kind,
      parserStage: 'execution',
      parserName: 'useKindiExecutionFlow',
      metadata: {
        planType: confirmation.plan?.type,
      },
    });
  });
};

interface UseKindiExecutionFlowArgs {
  currentUserRole?: KindiTreeRole;
  currentTreeId?: string | null;
  language?: Language;
  addAssistantMessage: (message: Omit<KindiMessage, 'id' | 'role'>) => string;
  setConfirmationStatus: (
    confirmationId: string,
    status: NonNullable<KindiConfirmation['status']>,
    error?: string
  ) => void;
}

const captureUndoAction = (): KindiUndoAction | undefined => {
  const state = useAppStore.getState();
  const historyEntryToken = getKindiUndoHistoryToken(state.past.at(-1));
  if (!historyEntryToken) return undefined;

  return {
    status: 'available',
    peopleVersion: state.peopleVersion,
    historyEntryToken,
    pastCount: state.past.length,
    futureCount: state.future.length,
  };
};

export const useKindiExecutionFlow = ({
  currentUserRole,
  currentTreeId,
  language = 'ar',
  addAssistantMessage,
  setConfirmationStatus,
}: UseKindiExecutionFlowArgs) => {
  const treeActions = useTreeActions();
  const strings = getKindiStrings(language);
  const confirmationsInFlight = useRef(new Set<string>());

  const confirm = useCallback(async (confirmation: KindiConfirmation) => {
    if (confirmation.status && confirmation.status !== 'pending') return;
    if (confirmationsInFlight.current.has(confirmation.id)) return;
    confirmationsInFlight.current.add(confirmation.id);

    const setStatus = (
      status: NonNullable<KindiConfirmation['status']>,
      error?: string
    ) => setConfirmationStatus(confirmation.id, status, error);
    const plan = confirmation.plan;
    const fail = (
      error: string,
      reply = error,
      failureReason: KindiLearningFailureReason = KINDI_LEARNING_FAILURE_REASONS.EXECUTION_FAILED
    ) => {
      setStatus('failed', error);
      logFailedKindiEvent(confirmation, failureReason);
      addAssistantMessage({ text: reply });
    };

    try {
      setStatus('processing');

      if (!canKindiMutateTree(currentUserRole, currentTreeId)) {
        const error = strings.execution.readOnlyError;
        fail(
          error,
          strings.execution.readOnlyReply(error),
          KINDI_LEARNING_FAILURE_REASONS.PERMISSION_DENIED
        );
        return;
      }

      if (!plan) {
        const error = strings.execution.invalidPlanError;
        fail(error, strings.execution.invalidPlanReply(error));
        return;
      }

      if (plan.type === 'ADD') {
        if (!plan.name?.firstName) {
          const error = strings.execution.missingAddNameError;
          fail(error, strings.execution.missingAddNameReply(error));
          return;
        }

        const nameUpdates: Partial<Person> = { ...(plan.initialUpdates ?? {}) };
        nameUpdates.firstName = plan.name.firstName;
        if (plan.name.lastName) nameUpdates.lastName = plan.name.lastName;

        const peopleBeforeAdd = useAppStore.getState().people;
        const result = plan.relation === 'parent'
          ? await treeActions.addParent(plan.gender, undefined, false, plan.targetPersonId, nameUpdates)
          : plan.relation === 'spouse'
            ? await treeActions.addSpouse(plan.gender, plan.targetPersonId, false, nameUpdates)
            : await treeActions.addChild(plan.gender, undefined, false, plan.targetPersonId, nameUpdates);

        if (!result.success) {
          fail(strings.execution.addFailed);
          return;
        }

        const postAddState = useAppStore.getState();
        const addedId = Object.keys(postAddState.people).find((personId) => !peopleBeforeAdd[personId])
          || postAddState.focusId;
        const addedPerson = postAddState.people[addedId];
        setStatus('confirmed');
        logConfirmedKindiEvent(confirmation);
        logSuccessfulKindiTrace(confirmation.learningTrace);
        addAssistantMessage({
          text: strings.execution.addSuccess(
            addedPerson ? getFullName(addedPerson) : strings.execution.fallbackNewPersonName
          ),
          people: addedPerson ? [addedPerson] : undefined,
          undoAction: captureUndoAction(),
        });
        return;
      }

      if (plan.type === 'UPDATE') {
        const result = await treeActions.updatePerson(plan.personId, plan.updates);
        if (!result.success) {
          fail(strings.execution.updateFailed);
          return;
        }

        const updatedPerson = useAppStore.getState().people[plan.personId];
        setStatus('confirmed');
        logConfirmedKindiEvent(confirmation);
        logSuccessfulKindiTrace(confirmation.learningTrace);
        addAssistantMessage({
          text: strings.execution.updateSuccess(
            updatedPerson ? getFullName(updatedPerson) : strings.execution.fallbackPersonName
          ),
          people: updatedPerson ? [updatedPerson] : confirmation.relatedPeople,
          undoAction: captureUndoAction(),
        });
        return;
      }

      if (plan.type === 'DELETE') {
        const deleteTarget = useAppStore.getState().people[plan.personId];
        const result = await treeActions.deletePerson(plan.personId);
        if (!result.success) {
          fail(strings.execution.deleteFailed);
          return;
        }

        setStatus('confirmed');
        logConfirmedKindiEvent(confirmation);
        logSuccessfulKindiTrace(confirmation.learningTrace);
        addAssistantMessage({
          text: strings.execution.deleteSuccess(
            deleteTarget ? getFullName(deleteTarget) : strings.execution.fallbackPersonName
          ),
          undoAction: captureUndoAction(),
        });
        return;
      }

      fail(strings.execution.unsupportedActionError);
    } catch {
      fail(strings.execution.unexpectedFailure);
    } finally {
      confirmationsInFlight.current.delete(confirmation.id);
    }
  }, [addAssistantMessage, currentTreeId, currentUserRole, setConfirmationStatus, strings, treeActions]);

  return { confirm };
};
