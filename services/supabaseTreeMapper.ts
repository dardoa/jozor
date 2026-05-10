import type { FullState, Person } from '../types';
import { mapDbPersonRowToPerson, type DbPersonRow } from './personRowMapper';

type RelationshipType = 'parent' | 'spouse' | 'child';

interface TreeRow {
  owner_id: string;
  focus_id?: string | null;
  settings?: Record<string, unknown> | null;
  name?: string | null;
}

interface RelationshipRow {
  person_id: string;
  relative_id: string;
  type: RelationshipType;
}

interface LatestOperationRow {
  version_seq?: number | string | null;
}

export type TreeFetchResult = Pick<FullState, 'people' | 'focusId' | 'settings'> & {
  ownerId: string;
  lastVersion: number;
  name: string;
};

const linkParent = (peopleMap: Record<string, Person>, personId: string, relativeId: string) => {
  if (!peopleMap[personId].parents.includes(relativeId)) peopleMap[personId].parents.push(relativeId);
  if (!peopleMap[relativeId].children.includes(personId)) peopleMap[relativeId].children.push(personId);
};

const linkChild = (peopleMap: Record<string, Person>, personId: string, relativeId: string) => {
  if (!peopleMap[personId].children.includes(relativeId)) peopleMap[personId].children.push(relativeId);
  if (!peopleMap[relativeId].parents.includes(personId)) peopleMap[relativeId].parents.push(personId);
};

const linkSpouse = (peopleMap: Record<string, Person>, personId: string, relativeId: string) => {
  if (!peopleMap[personId].spouses.includes(relativeId)) peopleMap[personId].spouses.push(relativeId);
  if (!peopleMap[relativeId].spouses.includes(personId)) peopleMap[relativeId].spouses.push(personId);
};

export const buildPeopleMap = (peopleRows: Record<string, unknown>[] | null | undefined): Record<string, Person> => {
  const peopleMap: Record<string, Person> = {};
  (peopleRows ?? []).forEach((row) => {
    const id = row.id as string;
    peopleMap[id] = mapDbPersonRowToPerson(row as unknown as DbPersonRow);
  });
  return peopleMap;
};

export const applyRelationshipRows = (
  peopleMap: Record<string, Person>,
  relationshipRows: Record<string, unknown>[] | null | undefined
) => {
  (relationshipRows ?? []).forEach((row) => {
    const { person_id: personId, relative_id: relativeId, type } = row as unknown as RelationshipRow;
    if (!peopleMap[personId] || !peopleMap[relativeId]) return;

    if (type === 'parent') {
      linkParent(peopleMap, personId, relativeId);
    } else if (type === 'child') {
      linkChild(peopleMap, personId, relativeId);
    } else if (type === 'spouse') {
      linkSpouse(peopleMap, personId, relativeId);
    }
  });
};

export const buildTreeFetchResult = (
  tree: TreeRow,
  peopleRows: Record<string, unknown>[] | null | undefined,
  relationshipRows: Record<string, unknown>[] | null | undefined,
  latestOperationRow: LatestOperationRow | null | undefined
): TreeFetchResult => {
  const peopleMap = buildPeopleMap(peopleRows);
  applyRelationshipRows(peopleMap, relationshipRows);

  return {
    people: peopleMap,
    focusId: tree.focus_id || Object.keys(peopleMap)[0] || undefined,
    settings: tree.settings || {},
    ownerId: tree.owner_id,
    lastVersion: Number(latestOperationRow?.version_seq || 0),
    name: tree.name || 'Untitled tree',
  };
};
