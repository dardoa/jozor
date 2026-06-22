import type { Person } from './person';

export type RelationshipEdgeType =
  | 'BIOLOGICAL_PARENT'
  | 'ADOPTIVE_PARENT'
  | 'GUARDIAN'
  | 'FOSTER_PARENT'
  | 'STEP_PARENT'
  | 'SPOUSE'
  | 'PARTNER';

export interface RelationshipEdge {
  readonly id: string;
  readonly treeId: string;
  readonly fromPersonId: string; // parent or spouse 1
  readonly toPersonId: string;   // child or spouse 2
  readonly type: RelationshipEdgeType;
  readonly status?: 'ACTIVE' | 'ENDED' | 'UNKNOWN';
  readonly metadata?: {
    readonly startDate?: string;
    readonly startPlace?: string;
    readonly endDate?: string;
    readonly endPlace?: string;
    readonly [key: string]: unknown;
  };
  readonly updatedAt?: string;
  readonly createdAt: string;
}

/**
 * Derives relationship edges strictly and cleanly from denormalized person relationship arrays.
 * Enforces validation rules to prevent:
 * 1. Self-relationships (fromPersonId === toPersonId)
 * 2. Non-existent nodes (both people must be in the record)
 * 3. Duplicate spouses (ordered alphabetically)
 * 4. Duplicate parent-child edges
 */
export function deriveRelationshipsFromPeople(
  treeId: string,
  people: Record<string, Person>
): Record<string, RelationshipEdge> {
  const edges: Record<string, RelationshipEdge> = {};
  const processedPairs = new Set<string>();

  Object.values(people).forEach((person) => {
    if (!person || !person.id) return;

    // 1. Spouses/Partners
    (person.spouses || []).forEach((spouseId) => {
      if (!spouseId) return;
      if (person.id === spouseId) return; // Rule 1: No self-relationships
      if (!people[spouseId]) return;      // Rule 2: Both nodes must exist

      // Rule 3: Normalize spouse relationship order alphabetically to prevent duplicates
      const [p1, p2] = [person.id, spouseId].sort();
      const pairKey = `${p1}__spouse__${p2}`;
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const id = crypto.randomUUID();
      edges[id] = {
        id,
        treeId,
        fromPersonId: p1,
        toPersonId: p2,
        type: 'SPOUSE',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
    });

    // 2. Parents
    (person.parents || []).forEach((parentId) => {
      if (!parentId) return;
      if (person.id === parentId) return; // Rule 1: No self-relationships
      if (!people[parentId]) return;      // Rule 2: Both nodes must exist

      // Rule 4: Directed parent -> child edge. Prevent duplicates
      const pairKey = `${parentId}__parent__${person.id}`;
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const id = crypto.randomUUID();
      edges[id] = {
        id,
        treeId,
        fromPersonId: parentId,
        toPersonId: person.id,
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
    });

    // 3. Children (cross-referencing check)
    (person.children || []).forEach((childId) => {
      if (!childId) return;
      if (person.id === childId) return; // Rule 1: No self-relationships
      if (!people[childId]) return;      // Rule 2: Both nodes must exist

      // Rule 4: Directed parent -> child edge. Prevent duplicates
      const pairKey = `${person.id}__parent__${childId}`;
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const id = crypto.randomUUID();
      edges[id] = {
        id,
        treeId,
        fromPersonId: person.id,
        toPersonId: childId,
        type: 'BIOLOGICAL_PARENT',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
    });
  });

  return edges;
}

/**
 * Syncs the existing relationship edges with a newly updated people map.
 * Preserves custom relationship types (e.g. ADOPTIVE_PARENT) and metadata (e.g. marriage dates)
 * for edges that still exist in the denormalized arrays, while adding new edges or removing deleted ones.
 */
export function syncRelationshipsWithPeople(
  currentEdges: Record<string, RelationshipEdge>,
  treeId: string,
  people: Record<string, Person>
): Record<string, RelationshipEdge> {
  const derived = deriveRelationshipsFromPeople(treeId, people);
  const nextEdges: Record<string, RelationshipEdge> = {};

  Object.values(derived).forEach((derivedEdge) => {
    // Find matching existing edge
    const existing = Object.values(currentEdges).find((edge) => {
      const isParentTypeMatch = 
        derivedEdge.type !== 'SPOUSE' && 
        derivedEdge.type !== 'PARTNER' && 
        edge.type !== 'SPOUSE' && 
        edge.type !== 'PARTNER';

      const isSpouseTypeMatch = 
        (derivedEdge.type === 'SPOUSE' || derivedEdge.type === 'PARTNER') && 
        (edge.type === 'SPOUSE' || edge.type === 'PARTNER');

      return (
        edge.fromPersonId === derivedEdge.fromPersonId &&
        edge.toPersonId === derivedEdge.toPersonId &&
        edge.treeId === treeId &&
        (isParentTypeMatch || isSpouseTypeMatch)
      );
    });

    if (existing) {
      nextEdges[existing.id] = existing;
    } else {
      nextEdges[derivedEdge.id] = derivedEdge;
    }
  });

  return nextEdges;
}

