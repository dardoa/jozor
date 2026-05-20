import { useCallback } from 'react';

import { useTreeActions } from '../../../hooks/tree/useTreeActions';
import { useAppStore } from '../../../store/useAppStore';
import type { KindiConfirmation, KindiMessage } from '../types';
import type { MutationActionResult, Person } from '../../../types';
import { getFullName } from '../../../utils/familyLogic';
import { KINDI_STRINGS } from '../logic/kindiLocales';
import type { KindiLearningTrace } from '../types';
import { KINDI_LEARNING_FAILURE_REASONS } from '../logic/kindiLearningTaxonomy';

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

interface UseKindiExecutionFlowArgs {
  currentUserRole?: string | null;
  addAssistantMessage: (message: Omit<KindiMessage, 'id' | 'role'>) => void;
  setConfirmationStatus: (
    confirmationId: string,
    status: NonNullable<KindiConfirmation['status']>,
    error?: string
  ) => void;
}

export const useKindiExecutionFlow = ({
  currentUserRole,
  addAssistantMessage,
  setConfirmationStatus,
}: UseKindiExecutionFlowArgs) => {
  const treeActions = useTreeActions();

  const confirm = useCallback(async (confirmation: KindiConfirmation) => {
    if (confirmation.status && confirmation.status !== 'pending') return;

    const setStatus = (
      status: NonNullable<KindiConfirmation['status']>,
      error?: string
    ) => setConfirmationStatus(confirmation.id, status, error);

    setStatus('processing');

    if (currentUserRole === 'viewer') {
      const error = KINDI_STRINGS.execution.readOnlyError;
      setStatus('failed', error);
      void import('../services/kindiLearningService').then(({ logKindiLearningEvent }) => {
        logKindiLearningEvent({
          eventType: 'confirmation_failed',
          interactionId: confirmation.interactionId,
          routeKind: confirmation.kind,
          failureReason: KINDI_LEARNING_FAILURE_REASONS.PERMISSION_DENIED,
          redactedQuery: confirmation.learningTrace?.redactedQuery,
          confidence: confirmation.learningTrace?.confidence,
          intentGuess: confirmation.kind,
          parserStage: 'execution',
          parserName: 'useKindiExecutionFlow',
        });
      });
      addAssistantMessage({ text: KINDI_STRINGS.execution.readOnlyReply(error) });
      return;
    }

    const plan = confirmation.plan;
    if (!plan) {
      const error = KINDI_STRINGS.execution.invalidPlanError;
      setStatus('failed', error);
      void import('../services/kindiLearningService').then(({ logKindiLearningEvent }) => {
        logKindiLearningEvent({
          eventType: 'confirmation_failed',
          interactionId: confirmation.interactionId,
          routeKind: confirmation.kind,
          failureReason: KINDI_LEARNING_FAILURE_REASONS.EXECUTION_FAILED,
          redactedQuery: confirmation.learningTrace?.redactedQuery,
          confidence: confirmation.learningTrace?.confidence,
          intentGuess: confirmation.kind,
          parserStage: 'execution',
          parserName: 'useKindiExecutionFlow',
        });
      });
      addAssistantMessage({ text: KINDI_STRINGS.execution.invalidPlanReply(error) });
      return;
    }

    let result: MutationActionResult = {
      success: false,
      error: KINDI_STRINGS.execution.unsupportedActionError,
    };

    if (plan.type === 'ADD') {
      if (!plan.name?.firstName) {
        const error = KINDI_STRINGS.execution.missingAddNameError;
        setStatus('failed', error);
        addAssistantMessage({
          text: KINDI_STRINGS.execution.missingAddNameReply(error),
        });
        return;
      }

      const nameUpdates: Partial<Person> = { ...(plan.initialUpdates ?? {}) };
      if (plan.name.firstName) nameUpdates.firstName = plan.name.firstName;
      if (plan.name.lastName) nameUpdates.lastName = plan.name.lastName;

      const peopleBeforeAdd = useAppStore.getState().people;
      if (plan.relation === 'parent') {
        result = await treeActions.addParent(plan.gender, undefined, false, plan.targetPersonId, nameUpdates);
      } else if (plan.relation === 'spouse') {
        result = await treeActions.addSpouse(plan.gender, plan.targetPersonId, false, nameUpdates);
      } else {
        result = await treeActions.addChild(plan.gender, undefined, false, plan.targetPersonId, nameUpdates);
      }

      if (!result.success) {
        const error = result.error || KINDI_STRINGS.execution.addFailed;
        setStatus('failed', error);
        addAssistantMessage({ text: error });
        return;
      }

      const postAddState = useAppStore.getState();
      const addedId = Object.keys(postAddState.people).find((personId) => !peopleBeforeAdd[personId])
        || postAddState.focusId;
      const addedPerson = useAppStore.getState().people[addedId];
      setStatus('confirmed');
      logConfirmedKindiEvent(confirmation);
      logSuccessfulKindiTrace(confirmation.learningTrace);
      addAssistantMessage({
        text: KINDI_STRINGS.execution.addSuccess(
          addedPerson ? getFullName(addedPerson) : KINDI_STRINGS.execution.fallbackNewPersonName
        ),
        people: addedPerson ? [addedPerson] : undefined,
      });
      return;
    }

    if (plan.type === 'UPDATE') {
      result = await treeActions.updatePerson(plan.personId, plan.updates);
      if (!result.success) {
        const error = result.error || KINDI_STRINGS.execution.updateFailed;
        setStatus('failed', error);
        addAssistantMessage({ text: error });
        return;
      }

      const updatedPerson = useAppStore.getState().people[plan.personId];
      setStatus('confirmed');
      logConfirmedKindiEvent(confirmation);
      logSuccessfulKindiTrace(confirmation.learningTrace);
      addAssistantMessage({
        text: KINDI_STRINGS.execution.updateSuccess(
          updatedPerson ? getFullName(updatedPerson) : KINDI_STRINGS.execution.fallbackPersonName
        ),
        people: updatedPerson ? [updatedPerson] : confirmation.relatedPeople,
      });
      return;
    }

    const deleteTarget = useAppStore.getState().people[plan.personId];
    result = await treeActions.deletePerson(plan.personId);
    if (!result.success) {
      const error = result.error || KINDI_STRINGS.execution.deleteFailed;
      setStatus('failed', error);
      addAssistantMessage({ text: error });
      return;
    }

    setStatus('confirmed');
    logConfirmedKindiEvent(confirmation);
    logSuccessfulKindiTrace(confirmation.learningTrace);
    addAssistantMessage({
      text: KINDI_STRINGS.execution.deleteSuccess(
        deleteTarget ? getFullName(deleteTarget) : KINDI_STRINGS.execution.fallbackPersonName
      ),
    });
  }, [addAssistantMessage, currentUserRole, setConfirmationStatus, treeActions]);

  return { confirm };
};
