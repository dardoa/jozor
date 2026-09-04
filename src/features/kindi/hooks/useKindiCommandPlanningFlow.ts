import { useCallback } from 'react';

import type { Person } from '../../../types/person';
import type { Language } from '../../../types/common';
import {
  createKindiExecutivePlan,
  extractKindiSubjectText,
  extractKindiTargetText,
  resolveKindiCommandTarget,
} from '../logic/kindiExecutivePlanner';
import { isKindiContextTargetReference } from '../logic/parsers/targetResolver';
import { getKindiStrings } from '../logic/kindiLocales';
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

export const getKindiRelationLabel = (
  plan: Extract<KindiExecutivePlan, { type: 'ADD' }>,
  language: Language = 'ar'
) => {
  return getKindiStrings(language).relationLabel(plan);
};

export const createKindiConfirmation = (
  routed: KindiRoutedIntent,
  plan: KindiExecutivePlan,
  relatedPeople: Person[],
  language: Language = 'ar'
): KindiConfirmation => ({
  id: createKindiMessageId(),
  kind: routed.kind === 'DELETE' ? 'DELETE' : routed.kind === 'UPDATE' ? 'UPDATE' : 'ACTION',
  title: getKindiStrings(language).confirmation.title(routed.kind),
  description:
    plan.type === 'ADD'
      ? getKindiStrings(language).confirmation.addDescription(
        plan.name?.firstName,
        getKindiRelationLabel(plan, language),
        plan.targetPersonName
      )
      : plan.type === 'DELETE'
        ? getKindiStrings(language).confirmation.deleteDescription
        : getKindiStrings(language).confirmation.updateDescription,
  confirmLabel: getKindiStrings(language).confirmation.confirmLabel(routed.kind),
  cancelLabel: getKindiStrings(language).confirmation.cancelLabel,
  status: 'pending',
  relatedPeople,
  plan,
});

const getNoPlanText = (routed: KindiRoutedIntent, language: Language): string =>
  getKindiStrings(language).planning.noPlan(routed);

const buildPlanningSuccess = (
  routed: KindiRoutedIntent,
  query: string | undefined,
  plan: KindiExecutivePlan,
  peopleList: Person[],
  resultPeople: Person[],
  language: Language
): KindiCommandPlanningResult => {
  const strings = getKindiStrings(language);
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
      ? strings.planning.confirmationPrepared(routed.summary)
      : strings.planning.finalConfirmationPrepared,
    people: confirmationPeople,
    visiblePeopleCount: Math.min(confirmationPeople.length, 12),
    confirmation: createKindiConfirmation(routed, plan, confirmationPeople, language),
  };
};

export const useKindiCommandPlanningFlow = (language: Language = 'ar') => {
  const strings = getKindiStrings(language);
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
    const contextualTarget = isKindiContextTargetReference(commandTargetText)
      ? peopleList.find((person) => person.id === fallbackFocusId)
      : undefined;
    const resultPeople: Person[] = contextualTarget ? [contextualTarget] : [];

    if (routed.kind === 'ACTION') {
      const targetResolution = contextualTarget
        ? { status: 'exact' as const, candidates: [contextualTarget] as [Person] }
        : resolveKindiCommandTarget(commandTargetText, peopleList);
      if (targetResolution.status === 'not_found') {
        return {
          kind: 'not_found',
          target: commandTargetText,
          text: strings.planning.targetNotFound(commandTargetText),
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
      const subjectResolution = contextualTarget
        ? { status: 'exact' as const, candidates: [contextualTarget] as [Person] }
        : resolveKindiCommandTarget(commandTargetText, peopleList);
      if (subjectResolution.status === 'not_found') {
        return {
          kind: 'not_found',
          target: commandTargetText,
          text: strings.planning.subjectNotFound(
            commandTargetText,
            strings.planning.actionLabel(routed.kind)
          ),
        };
      }

      if (subjectResolution.status === 'ambiguous') {
        return {
          kind: 'ambiguous',
          candidates: subjectResolution.candidates,
          resultPeople: subjectResolution.candidates,
          fallbackFocusId,
          promptName: commandTargetText || strings.disambiguation.defaultPromptName,
        };
      }
    }

    const plan = createKindiExecutivePlan(routed, resultPeople, fallbackFocusId, {
      allPeople: peopleList,
      selectedTarget: contextualTarget,
    });
    if (!plan) {
      return {
        kind: 'no_plan',
        text: getNoPlanText(routed, language),
        people: resultPeople,
      };
    }

    return buildPlanningSuccess(routed, query, plan, peopleList, resultPeople, language);
  }, [language, strings.disambiguation.defaultPromptName, strings.planning]);

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
        text: strings.disambiguation.noPlan,
        people: [],
      };
    }

    return buildPlanningSuccess(
      disambiguation.routedIntent,
      undefined,
      plan,
      peopleList,
      disambiguation.resultPeople,
      language
    );
  }, [language, strings.disambiguation.noPlan]);

  return {
    planCommand,
    planDisambiguation,
  };
};
