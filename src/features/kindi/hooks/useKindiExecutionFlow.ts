import { useCallback } from 'react';

import { useTreeActions } from '../../../hooks/tree/useTreeActions';
import { useAppStore } from '../../../store/useAppStore';
import type { KindiConfirmation, KindiMessage } from '../types';
import type { MutationActionResult, Person } from '../../../types';
import { getFullName } from '../../../utils/familyLogic';
import { KINDI_STRINGS } from '../logic/kindiLocales';
import type { KindiLearningTrace } from '../types';

const logSuccessfulKindiTrace = (trace?: KindiLearningTrace): void => {
  if (!trace) return;
  void import('../services/kindiLearningService').then(({ logKindiSuccess }) => {
    logKindiSuccess(trace);
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
      addAssistantMessage({ text: KINDI_STRINGS.execution.readOnlyReply(error) });
      return;
    }

    const plan = confirmation.plan;
    if (!plan) {
      const error = KINDI_STRINGS.execution.invalidPlanError;
      setStatus('failed', error);
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

      const peopleBeforeAdd = useAppStore.getState().people;
      if (plan.relation === 'parent') {
        result = await treeActions.addParent(plan.gender, undefined, false, plan.targetPersonId);
      } else if (plan.relation === 'spouse') {
        result = await treeActions.addSpouse(plan.gender, plan.targetPersonId);
      } else {
        result = await treeActions.addChild(plan.gender, undefined, false, plan.targetPersonId);
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
      if (plan.name && addedId) {
        const nameUpdates: Partial<Person> = { ...(plan.initialUpdates ?? {}) };
        if (plan.name.firstName) nameUpdates.firstName = plan.name.firstName;
        if (plan.name.lastName) nameUpdates.lastName = plan.name.lastName;

        if (Object.keys(nameUpdates).length > 0) {
          const nameResult = await treeActions.updatePerson(addedId, nameUpdates);
          if (!nameResult.success) {
            const error = nameResult.error || KINDI_STRINGS.execution.addNameUpdateFailed;
            setStatus('failed', error);
            addAssistantMessage({ text: error });
            return;
          }
        }
      }

      const addedPerson = useAppStore.getState().people[addedId];
      setStatus('confirmed');
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
    logSuccessfulKindiTrace(confirmation.learningTrace);
    addAssistantMessage({
      text: KINDI_STRINGS.execution.deleteSuccess(
        deleteTarget ? getFullName(deleteTarget) : KINDI_STRINGS.execution.fallbackPersonName
      ),
    });
  }, [addAssistantMessage, currentUserRole, setConfirmationStatus, treeActions]);

  return { confirm };
};
