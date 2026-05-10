import type { Person } from '../types';

export const getSelectableCoParents = (
  people: Record<string, Person>,
  currentPersonId: string,
  relationType: 'parent' | 'spouse' | 'child' | null
): Person[] => {
  if (relationType !== 'child') return [];

  const currentPerson = people[currentPersonId];
  if (!currentPerson) return [];

  return currentPerson.spouses
    .map((id) => people[id])
    .filter((person): person is Person => !!person);
};

export const resolveSpouseForNewParent = (
  newParent: Person,
  relatedPersonId?: string
): string | undefined => relatedPersonId || newParent.spouses[0];

export const resolveCoParentForNewChild = (
  newChild: Person,
  focusId: string,
  relatedPersonId?: string
): string | undefined =>
  relatedPersonId || newChild.parents.find((parentId) => parentId !== focusId);

export const resolveOtherParentForLinkedParent = (
  people: Record<string, Person>,
  childId: string,
  relatedPersonId?: string
): string | undefined => relatedPersonId || people[childId]?.parents?.[0];

export const resolveCoParentForLinkedChild = (
  people: Record<string, Person>,
  parentId: string,
  childId: string,
  relatedPersonId?: string
): string | undefined =>
  relatedPersonId ||
  people[parentId]?.spouses?.find((spouseId) => !people[childId]?.parents?.includes(spouseId));
