import type { Gender, Person } from '../types';
import type { DeltaOperation } from '../services/sync/SyncTypes';
import { validatePerson } from '../utils/familyLogic';
import {
  performAddChild,
  performAddParent,
  performAddSpouse,
  performDeletePerson,
  performLinkPerson,
  performRemoveRelationship,
} from './familyTreeOperations';

export type RelationshipType = 'parent' | 'spouse' | 'child';

export type FamilyDomainAction =
  | { type: 'updatePerson'; id: string; updates: Partial<Person> }
  | { type: 'addParent'; targetId: string; gender: Gender; relatedPersonId?: string }
  | { type: 'addSpouse'; targetId: string; gender: Gender }
  | { type: 'addChild'; targetId: string; gender: Gender; relatedPersonId?: string }
  | { type: 'addRemotePerson'; person: Person; relativeId?: string; relationshipType?: RelationshipType }
  | { type: 'deletePerson'; id: string }
  | { type: 'linkPerson'; focusId: string; existingId: string; relationshipType: RelationshipType; relatedPersonId?: string }
  | { type: 'removeRelationship'; targetId: string; relativeId: string; relationshipType: RelationshipType };

export interface FamilyDomainResult {
  people: Record<string, Person>;
  newId?: string;
}

const toRelationshipType = (value: unknown): RelationshipType | null =>
  value === 'parent' || value === 'spouse' || value === 'child' ? value : null;

const uniqueIds = (ids: string[] = []): string[] => Array.from(new Set(ids.filter(Boolean)));

const normalizePersonRelationships = (person: Person): Person => ({
  ...person,
  parents: uniqueIds(person.parents),
  spouses: uniqueIds(person.spouses),
  children: uniqueIds(person.children),
});

const addRemotePerson = (
  people: Record<string, Person>,
  person: Person,
  relativeId?: string,
  relationshipType?: RelationshipType
): Record<string, Person> => {
  const nextPeople = {
    ...people,
    [person.id]: normalizePersonRelationships(person),
  };

  if (!relativeId || !relationshipType || !nextPeople[relativeId]) {
    return nextPeople;
  }

  const relative = nextPeople[relativeId];

  if (relationshipType === 'parent') {
    nextPeople[relativeId] = {
      ...relative,
      parents: uniqueIds([...(relative.parents || []), person.id]),
    };
  } else if (relationshipType === 'child') {
    nextPeople[relativeId] = {
      ...relative,
      children: uniqueIds([...(relative.children || []), person.id]),
    };
  } else if (relationshipType === 'spouse') {
    nextPeople[relativeId] = {
      ...relative,
      spouses: uniqueIds([...(relative.spouses || []), person.id]),
    };
  }

  return nextPeople;
};

export const applyFamilyDomainAction = (
  people: Record<string, Person>,
  action: FamilyDomainAction
): FamilyDomainResult | null => {
  switch (action.type) {
    case 'updatePerson': {
      const current = people[action.id];
      if (!current) return { people };
      return {
        people: {
          ...people,
          [action.id]: validatePerson({ ...current, ...action.updates }),
        },
      };
    }
    case 'addParent': {
      const result = performAddParent(people, action.targetId, action.gender, action.relatedPersonId);
      return result ? { people: result.updatedPeople, newId: result.newId } : null;
    }
    case 'addSpouse': {
      const result = performAddSpouse(people, action.targetId, action.gender);
      return result ? { people: result.updatedPeople, newId: result.newId } : null;
    }
    case 'addChild': {
      const result = performAddChild(people, action.targetId, action.gender, action.relatedPersonId);
      return result ? { people: result.updatedPeople, newId: result.newId } : null;
    }
    case 'addRemotePerson':
      return { people: addRemotePerson(people, action.person, action.relativeId, action.relationshipType) };
    case 'deletePerson':
      return { people: performDeletePerson(people, action.id) };
    case 'linkPerson':
      return {
        people: performLinkPerson(people, action.focusId, action.existingId, action.relationshipType, action.relatedPersonId),
      };
    case 'removeRelationship':
      return { people: performRemoveRelationship(people, action.targetId, action.relativeId, action.relationshipType) };
    default:
      return null;
  }
};

export const reduceFamilyDomain = (
  people: Record<string, Person>,
  action: FamilyDomainAction
): Record<string, Person> | null => applyFamilyDomainAction(people, action)?.people ?? null;

export const applyDeltaOperationToFamily = (
  people: Record<string, Person>,
  op: DeltaOperation
): Record<string, Person> | null => {
  const { type, payload } = op;

  switch (type) {
    case 'UPDATE_PROP': {
      const id = typeof payload.id === 'string' ? payload.id : '';
      if (!id || !payload.updates) return people;
      return reduceFamilyDomain(people, {
        type: 'updatePerson',
        id,
        updates: payload.updates as Partial<Person>,
      });
    }
    case 'ADD_NODE': {
      const relationshipType = toRelationshipType(payload.type);
      if (!payload.person?.id) return null;
      return reduceFamilyDomain(people, {
        type: 'addRemotePerson',
        person: payload.person,
        relativeId: typeof payload.relativeId === 'string' ? payload.relativeId : undefined,
        relationshipType: relationshipType ?? undefined,
      });
    }
    case 'DELETE_NODE': {
      const id = typeof payload.id === 'string' ? payload.id : '';
      if (!id) return people;
      return reduceFamilyDomain(people, { type: 'deletePerson', id });
    }
    case 'ADD_RELATION': {
      const relationshipType = toRelationshipType(payload.type);
      if (!payload.focusId || !payload.existingId || !relationshipType) return people;
      return reduceFamilyDomain(people, {
        type: 'linkPerson',
        focusId: payload.focusId,
        existingId: payload.existingId,
        relationshipType,
        relatedPersonId: typeof payload.relativeId === 'string' ? payload.relativeId : undefined,
      });
    }
    case 'DELETE_RELATION': {
      const relationshipType = toRelationshipType(payload.type);
      if (!payload.targetId || !payload.relativeId || !relationshipType) return people;
      return reduceFamilyDomain(people, {
        type: 'removeRelationship',
        targetId: payload.targetId,
        relativeId: payload.relativeId,
        relationshipType,
      });
    }
    default:
      return people;
  }
};
