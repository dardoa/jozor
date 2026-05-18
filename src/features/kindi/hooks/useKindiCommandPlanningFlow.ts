import { useCallback } from 'react';

import type { Person } from '../../../types';
import {
  createKindiExecutivePlan,
  extractKindiSubjectText,
  extractKindiTargetText,
  resolveKindiCommandTarget,
} from '../logic/kindiExecutivePlanner';
import { KINDI_STRINGS } from '../logic/kindiLocales';
import type {
  KindiAddPlan,
  KindiConfirmation,
  KindiDisambiguation,
  KindiExecutivePlan,
  KindiRoutedIntent,
} from '../types';
import { createKindiMessageId } from './useKindiMessages';

export type KindiCommandPlanningResult =
  | {
      kind: 'not_found';
      target?: string;
      text: string;
    }
  | {
      kind: 'ambiguous';
      candidates: Person[];
      resultPeople: Person[];
      fallbackFocusId?: string;
      promptName?: string;
    }
  | {
      kind: 'no_plan';
      text: string;
      people: Person[];
    }
  | {
      kind: 'needs_add_name';
      routed: KindiRoutedIntent;
      plan: KindiAddPlan;
      relatedPeople: Person[];
    }
  | {
      kind: 'confirmation';
      selectedPersonId?: string;
      text: string;
      people: Person[];
      visiblePeopleCount: number;
      confirmation: KindiConfirmation;
    };

interface PlanCommandArgs {
  routed: KindiRoutedIntent;
  query: string;
  peopleList: Person[];
  lastContextPersonId?: string;
  focusId?: string;
}

interface PlanDisambiguationArgs {
  disambiguation: KindiDisambiguation;
  selectedPerson: Person;
  peopleList: Person[];
}

export const getKindiRelationLabel = (plan: Extract<KindiExecutivePlan, { type: 'ADD' }>) => {
  return KINDI_STRINGS.relationLabel(plan);
};

export const createKindiConfirmation = (
  routed: KindiRoutedIntent,
  plan: KindiExecutivePlan,
  relatedPeople: Person[]
): KindiConfirmation => ({
  id: createKindiMessageId(),
  kind: routed.kind === 'DELETE' ? 'DELETE' : routed.kind === 'UPDATE' ? 'UPDATE' : 'ACTION',
  title: KINDI_STRINGS.confirmation.title(routed.kind),
  description:
    plan.type === 'ADD'
      ? KINDI_STRINGS.confirmation.addDescription(
        plan.name?.firstName,
        getKindiRelationLabel(plan),
        plan.targetPersonName
      )
      : plan.type === 'DELETE'
        ? KINDI_STRINGS.confirmation.deleteDescription
        : KINDI_STRINGS.confirmation.updateDescription,
  confirmLabel: KINDI_STRINGS.confirmation.confirmLabel(routed.kind),
  cancelLabel: KINDI_STRINGS.confirmation.cancelLabel,
  status: 'pending',
  relatedPeople,
  plan,
});

const getNoPlanText = (routed: KindiRoutedIntent): string => KINDI_STRINGS.planning.noPlan(routed);

const buildPlanningSuccess = (
  routed: KindiRoutedIntent,
  query: string | undefined,
  plan: KindiExecutivePlan,
  peopleList: Person[],
  resultPeople: Person[]
): KindiCommandPlanningResult => {
  const selectedPerson = plan.type === 'ADD'
    ? peopleList.find((person) => person.id === plan.targetPersonId)
    : peopleList.find((person) => person.id === plan.personId);
  const confirmationPeople = selectedPerson
    ? [selectedPerson, ...resultPeople.filter((person) => person.id !== selectedPerson.id)]
    : resultPeople;

  if (plan.type === 'ADD' && !plan.name?.firstName) {
    return {
      kind: 'needs_add_name',
      routed,
      plan,
      relatedPeople: confirmationPeople,
    };
  }

  return {
    kind: 'confirmation',
    selectedPersonId: selectedPerson?.id,
    text: query
      ? KINDI_STRINGS.planning.confirmationPrepared(routed.summary, query)
      : KINDI_STRINGS.planning.finalConfirmationPrepared,
    people: confirmationPeople,
    visiblePeopleCount: Math.min(confirmationPeople.length, 12),
    confirmation: createKindiConfirmation(routed, plan, confirmationPeople),
  };
};

export const useKindiCommandPlanningFlow = () => {
  const planCommand = useCallback(({
    routed,
    query,
    peopleList,
    lastContextPersonId,
    focusId,
  }: PlanCommandArgs): KindiCommandPlanningResult => {
    const commandTargetText = routed.kind === 'ACTION'
      ? extractKindiTargetText(routed.query)
      : routed.kind === 'UPDATE' || routed.kind === 'DELETE'
        ? extractKindiSubjectText(routed.query)
        : undefined;
    const fallbackFocusId = lastContextPersonId || focusId;
    const resultPeople: Person[] = [];

    if (routed.kind === 'ACTION') {
      const targetResolution = resolveKindiCommandTarget(commandTargetText, peopleList);
      if (targetResolution.status === 'not_found') {
        return {
          kind: 'not_found',
          target: commandTargetText,
          text: KINDI_STRINGS.planning.targetNotFound(commandTargetText),
        };
      }

      if (targetResolution.status === 'ambiguous') {
        return {
          kind: 'ambiguous',
          candidates: targetResolution.candidates,
          resultPeople: targetResolution.candidates,
          fallbackFocusId,
          promptName: commandTargetText,
        };
      }
    } else {
      const subjectResolution = resolveKindiCommandTarget(commandTargetText, peopleList);
      if (subjectResolution.status === 'not_found') {
        return {
          kind: 'not_found',
          target: commandTargetText,
          text: KINDI_STRINGS.planning.subjectNotFound(
            commandTargetText,
            KINDI_STRINGS.planning.actionLabel(routed.kind)
          ),
        };
      }

      if (subjectResolution.status === 'ambiguous') {
        return {
          kind: 'ambiguous',
          candidates: subjectResolution.candidates,
          resultPeople: subjectResolution.candidates,
          fallbackFocusId,
          promptName: commandTargetText || KINDI_STRINGS.disambiguation.defaultPromptName,
        };
      }
    }

    const plan = createKindiExecutivePlan(routed, resultPeople, fallbackFocusId, { allPeople: peopleList });
    if (!plan) {
      return {
        kind: 'no_plan',
        text: getNoPlanText(routed),
        people: resultPeople,
      };
    }

    return buildPlanningSuccess(routed, query, plan, peopleList, resultPeople);
  }, []);

  const planDisambiguation = useCallback(({
    disambiguation,
    selectedPerson,
    peopleList,
  }: PlanDisambiguationArgs): KindiCommandPlanningResult => {
    const plan = createKindiExecutivePlan(
      disambiguation.routedIntent,
      disambiguation.resultPeople,
      disambiguation.fallbackFocusId,
      { allPeople: peopleList, selectedTarget: selectedPerson }
    );

    if (!plan) {
      return {
        kind: 'no_plan',
        text: KINDI_STRINGS.disambiguation.noPlan,
        people: [],
      };
    }

    return buildPlanningSuccess(
      disambiguation.routedIntent,
      undefined,
      plan,
      peopleList,
      disambiguation.resultPeople
    );
  }, []);

  return {
    planCommand,
    planDisambiguation,
  };
};
