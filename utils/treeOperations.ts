import { Person, Gender } from '../types';
import { createPerson } from './familyLogic';

// Helper to safely remove ID from array
const removeId = (arr: string[], idToRemove: string) => arr.filter((id) => id !== idToRemove);

/**
 * Pure function to delete a person and clean up all relationships.
 * Removes the person ID from parents, children, and spouses lists of related people.
 */
export const performDeletePerson = (
  people: Record<string, Person>,
  idToDelete: string
): Record<string, Person> => {
  const nextPeople = { ...people };
  const target = nextPeople[idToDelete];

  if (!target) return people;

  target.parents.forEach((parentId) => {
    if (nextPeople[parentId]) {
      nextPeople[parentId] = {
        ...nextPeople[parentId],
        children: removeId(nextPeople[parentId].children, idToDelete),
      };
    }
  });

  target.children.forEach((childId) => {
    if (nextPeople[childId]) {
      nextPeople[childId] = {
        ...nextPeople[childId],
        parents: removeId(nextPeople[childId].parents, idToDelete),
      };
    }
  });

  target.spouses.forEach((spouseId) => {
    if (nextPeople[spouseId]) {
      const spouse = nextPeople[spouseId];
      const newPartnerDetails = { ...(spouse.partnerDetails || {}) };
      delete newPartnerDetails[idToDelete];

      nextPeople[spouseId] = {
        ...spouse,
        spouses: removeId(spouse.spouses, idToDelete),
        partnerDetails: newPartnerDetails,
      };
    }
  });

  delete nextPeople[idToDelete];

  return nextPeople;
};

export const performAddParent = (
  people: Record<string, Person>,
  currentId: string,
  gender: Gender
): { updatedPeople: Record<string, Person>; newId: string } | null => {
  const current = people[currentId];
  if (!current || current.parents.length >= 2) return null;

  const newParent = createPerson(gender);
  newParent.children = [currentId];
  if (gender === 'male') {
    newParent.lastName = current.lastName;
  }

  const nextPeople = { ...people };
  const currentParentUpdate = { ...current, parents: [...current.parents, newParent.id] };
  const newParentUpdate = { ...newParent };

  if (current.parents.length === 1) {
    const existingParentId = current.parents[0];
    const existingParent = nextPeople[existingParentId];

    if (existingParent && !existingParent.spouses.includes(newParent.id)) {
      newParentUpdate.spouses = [existingParentId];

      nextPeople[existingParentId] = {
        ...existingParent,
        spouses: [...existingParent.spouses, newParent.id],
      };
    }
  }

  nextPeople[newParent.id] = newParentUpdate;
  nextPeople[currentId] = currentParentUpdate;

  return { updatedPeople: nextPeople, newId: newParent.id };
};

/**
 * Adds a spouse to the specified person.
 * Creates a two-way link between the people.
 */
export const performAddSpouse = (
  people: Record<string, Person>,
  currentId: string,
  gender: Gender
): { updatedPeople: Record<string, Person>; newId: string } | null => {
  const current = people[currentId];
  if (!current) return null;

  const newSpouse = createPerson(gender);
  newSpouse.spouses = [currentId];

  const nextPeople = {
    ...people,
    [newSpouse.id]: newSpouse,
    [currentId]: {
      ...current,
      spouses: [...current.spouses, newSpouse.id],
    },
  };

  return { updatedPeople: nextPeople, newId: newSpouse.id };
};

/**
 * Adds a child to the specified person.
 * Handles last name inheritance and auto-linking to the person's spouse as the second parent.
 */
export const performAddChild = (
  people: Record<string, Person>,
  currentId: string,
  gender: Gender
): { updatedPeople: Record<string, Person>; newId: string } | null => {
  const current = people[currentId];
  if (!current) return null;

  // Last Name Logic (Child usually takes father's name)
  let inheritedLastName = current.lastName;
  if (current.gender === 'female' && current.spouses.length > 0) {
    const spouse = people[current.spouses[0]];
    if (spouse && spouse.gender === 'male') inheritedLastName = spouse.lastName;
  }

  const newChild = createPerson(gender);
  newChild.lastName = inheritedLastName;
  newChild.parents = [currentId];

  const nextPeople = { ...people };
  const newChildUpdate = { ...newChild };
  const currentUpdate = { ...current };

  // Auto-link to primary spouse as second parent
  if (current.spouses.length > 0) {
    const spouseId = current.spouses[0];
    const spouse = nextPeople[spouseId];

    if (spouse) {
      newChildUpdate.parents.push(spouseId);

      nextPeople[spouseId] = {
        ...spouse,
        children: [...spouse.children, newChild.id],
      };
    }
  }

  currentUpdate.children = [...current.children, newChild.id];

  nextPeople[newChild.id] = newChildUpdate;
  nextPeople[currentId] = currentUpdate;

  return { updatedPeople: nextPeople, newId: newChild.id };
};

/**
 * Links two existing people with a specified relationship.
 * Handles extensive logic for reciprocal links and implicit connections (like auto-marrying parents).
 */
export const performLinkPerson = (
  people: Record<string, Person>,
  currentId: string,
  targetId: string,
  type: 'parent' | 'spouse' | 'child'
): Record<string, Person> => {
  const nextPeople = { ...people };
  const current = nextPeople[currentId];
  const target = nextPeople[targetId];

  if (!current || !target) return people;

  if (type === 'parent') {
    if (current.parents.includes(targetId) || current.parents.length >= 2) return people;

    nextPeople[currentId] = { ...current, parents: [...current.parents, targetId] };
    nextPeople[targetId] = { ...target, children: [...target.children, currentId] };

    // Auto-marriage with existing parent
    if (current.parents.length === 1) {
      const otherParentId = current.parents[0];
      const otherParent = nextPeople[otherParentId];
      if (otherParent && !otherParent.spouses.includes(targetId)) {
        nextPeople[otherParentId] = { ...otherParent, spouses: [...otherParent.spouses, targetId] };
        nextPeople[targetId] = {
          ...nextPeople[targetId],
          spouses: [...nextPeople[targetId].spouses, otherParentId],
        };
      }
    }
  } else if (type === 'spouse') {
    if (current.spouses.includes(targetId)) return people;
    nextPeople[currentId] = { ...current, spouses: [...current.spouses, targetId] };
    nextPeople[targetId] = { ...target, spouses: [...target.spouses, currentId] };
  } else if (type === 'child') {
    if (current.children.includes(targetId) || target.parents.length >= 2) return people;

    nextPeople[currentId] = { ...current, children: [...current.children, targetId] };
    nextPeople[targetId] = { ...target, parents: [...target.parents, currentId] };

    // Auto-parent assignment (link child to current spouse)
    if (current.spouses.length > 0) {
      const spouseId = current.spouses[0];
      const spouse = nextPeople[spouseId];
      if (spouse && !target.parents.includes(spouseId) && target.parents.length < 2) {
        nextPeople[spouseId] = { ...spouse, children: [...spouse.children, targetId] };
        nextPeople[targetId] = {
          ...nextPeople[targetId],
          parents: [...nextPeople[targetId].parents, spouseId],
        };
      }
    }
  }

  return nextPeople;
};

/**
 * Removes a relationship between two people.
 * Cleans up reciprocal links and spouse metadata if needed.
 */
export const performRemoveRelationship = (
  people: Record<string, Person>,
  id1: string,
  id2: string,
  type: 'parent' | 'spouse' | 'child'
): Record<string, Person> => {
  const nextPeople = { ...people };
  const p1 = nextPeople[id1];
  const p2 = nextPeople[id2];

  if (!p1 || !p2) return people;

  if (type === 'parent') {
    // id1 is child, id2 is parent
    nextPeople[id1] = { ...p1, parents: removeId(p1.parents, id2) };
    nextPeople[id2] = { ...p2, children: removeId(p2.children, id1) };
  } else if (type === 'child') {
    // id1 is parent, id2 is child
    nextPeople[id1] = { ...p1, children: removeId(p1.children, id2) };
    nextPeople[id2] = { ...p2, parents: removeId(p2.parents, id1) };
  } else if (type === 'spouse') {
    nextPeople[id1] = { ...p1, spouses: removeId(p1.spouses, id2) };
    nextPeople[id2] = { ...p2, spouses: removeId(p2.spouses, id1) };

    // Clean details
    if (nextPeople[id1].partnerDetails) delete nextPeople[id1].partnerDetails![id2];
    if (nextPeople[id2].partnerDetails) delete nextPeople[id2].partnerDetails![id1];
  }

  return nextPeople;
};
