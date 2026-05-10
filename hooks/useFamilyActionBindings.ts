import { useMemo } from 'react';
import type { FamilyActionsProps, Gender, MutationActionResult } from '../types';

interface FamilyActionBindingsOptions {
  handleOpenLinkModal: (type: 'parent' | 'spouse' | 'child', gender: Gender) => void;
  addParent: (gender: Gender, relatedPersonId?: string) => MutationActionResult | Promise<MutationActionResult>;
  addSpouse: (gender: Gender) => MutationActionResult | Promise<MutationActionResult>;
  addChild: (gender: Gender, relatedPersonId?: string) => MutationActionResult | Promise<MutationActionResult>;
  addFirstPerson: (gender: Gender) => MutationActionResult | Promise<MutationActionResult>;
  removeRelationship: (targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child') => MutationActionResult | Promise<MutationActionResult>;
  linkPerson: (existingId: string, type: 'parent' | 'spouse' | 'child' | null, relatedPersonId?: string) => MutationActionResult | Promise<MutationActionResult>;
}

export function useFamilyActionBindings({
  handleOpenLinkModal,
  addParent,
  addSpouse,
  addChild,
  addFirstPerson,
  removeRelationship,
  linkPerson,
}: FamilyActionBindingsOptions): {
  sidebarFamilyActions: FamilyActionsProps;
  coreFamilyActions: FamilyActionsProps;
} {
  const invalidTypeResult = (): MutationActionResult => ({
    success: false,
    error: 'Relationship type is required.',
  });
  const openedModalResult = (): MutationActionResult => ({ success: true });

  const sidebarFamilyActions = useMemo<FamilyActionsProps>(() => ({
    onAddParent: (gender) => {
      handleOpenLinkModal('parent', gender);
      return openedModalResult();
    },
    onAddSpouse: (gender) => {
      handleOpenLinkModal('spouse', gender);
      return openedModalResult();
    },
    onAddChild: (gender) => {
      handleOpenLinkModal('child', gender);
      return openedModalResult();
    },
    onAddFirstPerson: (gender) => addFirstPerson(gender),
    onRemoveRelationship: (targetId, relativeId, type) => removeRelationship(targetId, relativeId, type),
    onLinkPerson: (existingId, type, relatedPersonId) =>
      type ? linkPerson(existingId, type, relatedPersonId) : invalidTypeResult(),
  }), [addFirstPerson, handleOpenLinkModal, linkPerson, removeRelationship]);

  const coreFamilyActions = useMemo<FamilyActionsProps>(() => ({
    onAddParent: (gender: Gender, relatedPersonId?: string) => addParent(gender, relatedPersonId),
    onAddSpouse: (gender: Gender) => addSpouse(gender),
    onAddChild: (gender: Gender, relatedPersonId?: string) => addChild(gender, relatedPersonId),
    onAddFirstPerson: (gender: Gender) => addFirstPerson(gender),
    onRemoveRelationship: (targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child') => removeRelationship(targetId, relativeId, type),
    onLinkPerson: (existingId: string, type: 'parent' | 'spouse' | 'child' | null, relatedPersonId?: string) =>
      type ? linkPerson(existingId, type, relatedPersonId) : invalidTypeResult(),
  }), [addChild, addFirstPerson, addParent, addSpouse, linkPerson, removeRelationship]);

  return { sidebarFamilyActions, coreFamilyActions };
}
