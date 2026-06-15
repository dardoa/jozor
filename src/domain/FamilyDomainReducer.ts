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
  | { type: 'updatePerson'; id: string; updates: Partial<Person>; updatedAt?: string; clientId?: string; clientVersion?: number }
  | { type: 'addParent'; targetId: string; gender: Gender; relatedPersonId?: string }
  | { type: 'addSpouse'; targetId: string; gender: Gender }
  | { type: 'addChild'; targetId: string; gender: Gender; relatedPersonId?: string }
  | { type: 'addRemotePerson'; person: Person; relativeId?: string; relationshipType?: RelationshipType; updatedAt?: string; clientId?: string; clientVersion?: number }
  | { type: 'deletePerson'; id: string }
  | { type: 'linkPerson'; focusId: string; existingId: string; relationshipType: RelationshipType; relatedPersonId?: string }
  | { type: 'removeRelationship'; targetId: string; relativeId: string; relationshipType: RelationshipType };

export interface FamilyDomainResult {
  people: Record<string, Person>;
  newId?: string;
}

const assertUnreachable = (value: never, context: string): never => {
  throw new Error(`Unhandled ${context}: ${String(value)}`);
};

const toRelationshipType = (value: unknown): RelationshipType | null =>
  value === 'parent' || value === 'spouse' || value === 'child' ? value : null;

const uniqueIds = (ids: string[] = []): string[] => Array.from(new Set(ids.filter(Boolean)));

const normalizePersonRelationships = (person: Person): Person => ({
  ...person,
  parents: uniqueIds(person.parents),
  spouses: uniqueIds(person.spouses),
  children: uniqueIds(person.children),
});

const relationalPersonKeys = new Set<keyof Person>(['parents', 'spouses', 'children', 'partnerDetails']);

const shouldOverwriteProperty = (
  currentTimestamp: string | undefined,
  currentClientId: string | undefined,
  currentClientVersion: number | undefined,
  incomingTimestamp: string | undefined,
  incomingClientId: string | undefined,
  incomingClientVersion: number | undefined
): boolean => {
  if (!incomingTimestamp) return true;
  if (!currentTimestamp) return true;

  if (incomingTimestamp > currentTimestamp) return true;
  if (incomingTimestamp < currentTimestamp) return false;

  const inClient = incomingClientId || '';
  const curClient = currentClientId || '';
  if (inClient > curClient) return true;
  if (inClient < curClient) return false;

  const inVer = incomingClientVersion || 0;
  const curVer = currentClientVersion || 0;
  return inVer > curVer;
};

const addRemotePerson = (
  people: Record<string, Person>,
  person: Person,
  relativeId?: string,
  relationshipType?: RelationshipType,
  updatedAt?: string,
  clientId?: string,
  clientVersion?: number
): Record<string, Person> => {
  const initTimestamp = updatedAt || new Date().toISOString();
  const initClientId = clientId || '';
  const initClientVersion = clientVersion || 0;

  const lastUpdated: Record<string, string> = {};
  const lastUpdatedOps: Record<string, { client_id: string; client_version: number }> = {};

  Object.keys(person).forEach((key) => {
    if (
      key !== 'parents' &&
      key !== 'spouses' &&
      key !== 'children' &&
      key !== 'partnerDetails' &&
      key !== 'metadata' &&
      key !== 'id'
    ) {
      lastUpdated[key] = initTimestamp;
      lastUpdatedOps[key] = { client_id: initClientId, client_version: initClientVersion };
    }
  });

  const normalized = normalizePersonRelationships(person);
  const initializedPerson: Person = {
    ...normalized,
    metadata: {
      ...normalized.metadata,
      lastUpdated: {
        ...lastUpdated,
        ...((normalized.metadata?.lastUpdated as Record<string, string>) || {}),
      },
      lastUpdatedOps: {
        ...lastUpdatedOps,
        ...((normalized.metadata?.lastUpdatedOps as Record<string, { client_id: string; client_version: number }>) || {}),
      },
    },
  };

  const nextPeople = {
    ...people,
    [person.id]: initializedPerson,
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

      const updatedAt = action.updatedAt;
      const clientId = action.clientId;
      const clientVersion = action.clientVersion;

      const updatedFields: Partial<Person> = {};
      const newLastUpdated = { ...((current.metadata?.lastUpdated as Record<string, string>) || {}) };
      const newLastUpdatedOps = { ...((current.metadata?.lastUpdatedOps as Record<string, { client_id: string; client_version: number }>) || {}) };
      const setUpdatedField = <K extends keyof Person>(key: K, value: Person[K]) => {
        updatedFields[key] = value;
      };

      (Object.keys(action.updates) as Array<keyof Person>).forEach((key) => {
        const val = action.updates[key];
        if (val === undefined) return;

        if (relationalPersonKeys.has(key)) {
          setUpdatedField(key, val);
          return;
        }

        const metadataKey = String(key);
        const currentTs = newLastUpdated[metadataKey];
        const currentOp = newLastUpdatedOps[metadataKey];

        if (
          shouldOverwriteProperty(
            currentTs,
            currentOp?.client_id,
            currentOp?.client_version,
            updatedAt,
            clientId,
            clientVersion
          )
        ) {
          setUpdatedField(key, val);
          if (updatedAt) {
            newLastUpdated[metadataKey] = updatedAt;
            newLastUpdatedOps[metadataKey] = {
              client_id: clientId || '',
              client_version: clientVersion || 0,
            };
          }
        }
      });

      if (Object.keys(updatedFields).length === 0) {
        return { people };
      }

      const mergedPerson = {
        ...current,
        ...updatedFields,
        metadata: {
          ...current.metadata,
          lastUpdated: newLastUpdated,
          lastUpdatedOps: newLastUpdatedOps,
        },
      };

      return {
        people: {
          ...people,
          [action.id]: validatePerson(mergedPerson),
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
      return { people: addRemotePerson(people, action.person, action.relativeId, action.relationshipType, action.updatedAt, action.clientId, action.clientVersion) };
    case 'deletePerson':
      return { people: performDeletePerson(people, action.id) };
    case 'linkPerson':
      return {
        people: performLinkPerson(people, action.focusId, action.existingId, action.relationshipType, action.relatedPersonId),
      };
    case 'removeRelationship':
      return { people: performRemoveRelationship(people, action.targetId, action.relativeId, action.relationshipType) };
    default:
      return assertUnreachable(action, 'family domain action');
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
        updatedAt: op.created_at,
        clientId: payload.client_id,
        clientVersion: payload.client_version,
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
        updatedAt: op.created_at,
        clientId: payload.client_id,
        clientVersion: payload.client_version,
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
    case 'SET_TREE_METADATA':
      return people;
    default:
      return assertUnreachable(type, 'delta operation type');
  }
};
