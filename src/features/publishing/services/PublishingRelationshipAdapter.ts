import type { Person, RelationshipEdge, RelationshipEdgeType } from '../../../types';
import { deriveRelationshipsFromPeople } from '../../../types';

export type PublishingParentType = 'father' | 'mother';

export interface PublishingParentRelationship {
  readonly childId: string;
  readonly parentId: string;
  readonly type: PublishingParentType;
}

export interface PublishingBranchRelationship {
  readonly parentId?: string;
  readonly childId?: string;
  readonly personId?: string;
  readonly spouseId?: string;
  readonly type: 'parent' | 'spouse';
}

export interface PublishingRelationshipWarning {
  readonly code: 'RELATIONSHIP_DRIFT';
  readonly message: string;
  readonly personIds: readonly string[];
}

export interface PublishingRelationshipContext {
  readonly parentEdges: readonly RelationshipEdge[];
  readonly spouseEdges: readonly RelationshipEdge[];
  readonly warnings: readonly PublishingRelationshipWarning[];
}

export interface PublishingGraphResult<Relationship> {
  readonly people: Record<string, Person>;
  readonly relationships: readonly Relationship[];
  readonly warnings: readonly PublishingRelationshipWarning[];
}

const PARENT_EDGE_TYPES: readonly RelationshipEdgeType[] = [
  'BIOLOGICAL_PARENT',
  'ADOPTIVE_PARENT',
  'GUARDIAN',
  'FOSTER_PARENT',
  'STEP_PARENT',
];

const SPOUSE_EDGE_TYPES: readonly RelationshipEdgeType[] = ['SPOUSE', 'PARTNER'];

function normalizeRelationshipInput(
  relationshipEdges?: Record<string, RelationshipEdge> | readonly RelationshipEdge[]
): readonly RelationshipEdge[] {
  if (!relationshipEdges) return [];
  return Array.isArray(relationshipEdges) ? relationshipEdges : Object.values(relationshipEdges);
}

function hasUsableRelationshipEdges(
  people: Record<string, Person>,
  edges: readonly RelationshipEdge[]
): boolean {
  return edges.some((edge) => (
    edge.fromPersonId !== edge.toPersonId &&
    Boolean(people[edge.fromPersonId]) &&
    Boolean(people[edge.toPersonId]) &&
    (PARENT_EDGE_TYPES.includes(edge.type) || SPOUSE_EDGE_TYPES.includes(edge.type))
  ));
}

function relationshipSignature(edge: RelationshipEdge): string | null {
  if (PARENT_EDGE_TYPES.includes(edge.type)) {
    return `parent:${edge.fromPersonId}->${edge.toPersonId}`;
  }
  if (SPOUSE_EDGE_TYPES.includes(edge.type)) {
    const [a, b] = [edge.fromPersonId, edge.toPersonId].sort();
    return `spouse:${a}<->${b}`;
  }
  return null;
}

function detectRelationshipDrift(
  people: Record<string, Person>,
  relationshipEdges: readonly RelationshipEdge[],
  treeId: string
): readonly PublishingRelationshipWarning[] {
  if (relationshipEdges.length === 0) return [];

  const derivedEdges = Object.values(deriveRelationshipsFromPeople(treeId, people));
  const derivedSignatures = new Set(derivedEdges.map(relationshipSignature).filter((sig): sig is string => Boolean(sig)));
  const edgeSignatures = new Set(relationshipEdges.map(relationshipSignature).filter((sig): sig is string => Boolean(sig)));

  const missingFromEdges = [...derivedSignatures].filter((sig) => !edgeSignatures.has(sig));
  const missingFromPeople = [...edgeSignatures].filter((sig) => !derivedSignatures.has(sig));

  if (missingFromEdges.length === 0 && missingFromPeople.length === 0) return [];

  return [{
    code: 'RELATIONSHIP_DRIFT',
    message: 'Publishing relationship edges differ from denormalized person relationship fields.',
    personIds: extractPersonIdsFromSignatures([...missingFromEdges, ...missingFromPeople]),
  }];
}

function extractPersonIdsFromSignatures(signatures: readonly string[]): readonly string[] {
  const ids = new Set<string>();
  signatures.forEach((signature) => {
    signature
      .replace(/^parent:/, '')
      .replace(/^spouse:/, '')
      .split(/->|<->/)
      .forEach((id) => {
        if (id) ids.add(id);
      });
  });
  return [...ids];
}

function createContext(
  people: Record<string, Person>,
  relationshipEdges?: Record<string, RelationshipEdge> | readonly RelationshipEdge[],
  treeId: string = 'publishing'
): PublishingRelationshipContext {
  const providedEdges = normalizeRelationshipInput(relationshipEdges);
  const effectiveEdges = hasUsableRelationshipEdges(people, providedEdges)
    ? providedEdges
    : Object.values(deriveRelationshipsFromPeople(treeId, people));

  const validEdges = effectiveEdges.filter((edge) => (
    edge.fromPersonId !== edge.toPersonId &&
    Boolean(people[edge.fromPersonId]) &&
    Boolean(people[edge.toPersonId])
  ));

  return {
    parentEdges: validEdges.filter((edge) => PARENT_EDGE_TYPES.includes(edge.type)),
    spouseEdges: validEdges.filter((edge) => SPOUSE_EDGE_TYPES.includes(edge.type)),
    warnings: detectRelationshipDrift(people, providedEdges, treeId),
  };
}

function getParentType(parent: Person, fallbackIndex: number): PublishingParentType {
  if (parent.gender === 'female') return 'mother';
  if (parent.gender === 'male') return 'father';
  return fallbackIndex === 1 ? 'mother' : 'father';
}

function buildAncestorGraph(
  people: Record<string, Person>,
  rootPersonId: string,
  generationsDepth: number,
  relationshipEdges?: Record<string, RelationshipEdge> | readonly RelationshipEdge[],
  treeId?: string
): PublishingGraphResult<PublishingParentRelationship> {
  const context = createContext(people, relationshipEdges, treeId);
  const collectedPersonIds = new Set<string>();
  const relationships: PublishingParentRelationship[] = [];
  const recordedRelationships = new Set<string>();
  const visited = new Set<string>();

  const addRelationship = (childId: string, parentId: string, type: PublishingParentType) => {
    const relationshipKey = `${childId}:${parentId}:${type}`;
    if (recordedRelationships.has(relationshipKey)) return;
    recordedRelationships.add(relationshipKey);
    relationships.push({ childId, parentId, type });
  };

  const traverse = (currentId: string, currentDepth: number) => {
    if (currentDepth > generationsDepth) return;
    if (visited.has(`${currentId}:${currentDepth}`)) return;
    visited.add(`${currentId}:${currentDepth}`);

    const person = people[currentId];
    if (!person) return;
    collectedPersonIds.add(currentId);

    const parentEdges = context.parentEdges.filter((edge) => edge.toPersonId === currentId);
    parentEdges.forEach((edge, index) => {
      const parent = people[edge.fromPersonId];
      if (!parent) return;
      addRelationship(currentId, edge.fromPersonId, getParentType(parent, index));
      traverse(edge.fromPersonId, currentDepth + 1);
    });
  };

  traverse(rootPersonId, 1);

  return {
    people: pickPeople(people, collectedPersonIds),
    relationships,
    warnings: context.warnings,
  };
}

function buildBranchGraph(
  people: Record<string, Person>,
  rootPersonId: string,
  relationshipEdges?: Record<string, RelationshipEdge> | readonly RelationshipEdge[],
  treeId?: string,
  generationsDepth?: number
): PublishingGraphResult<PublishingBranchRelationship> {
  const context = createContext(people, relationshipEdges, treeId);
  const collectedPersonIds = new Set<string>();
  const relationships: PublishingBranchRelationship[] = [];
  const recordedRelationships = new Set<string>();
  const visitedPeople = new Set<string>();

  const addRelationship = (relationship: PublishingBranchRelationship) => {
    const key = relationship.type === 'parent'
      ? `parent:${relationship.parentId}->${relationship.childId}`
      : `spouse:${[relationship.personId, relationship.spouseId].sort().join('<->')}`;
    if (recordedRelationships.has(key)) return;
    recordedRelationships.add(key);
    relationships.push(relationship);
  };

  const traverseDescendants = (currentId: string, currentDepth: number) => {
    if (typeof generationsDepth === 'number' && currentDepth > generationsDepth) return;
    if (visitedPeople.has(currentId)) return;
    visitedPeople.add(currentId);

    const person = people[currentId];
    if (!person) return;
    collectedPersonIds.add(currentId);

    context.spouseEdges
      .filter((edge) => edge.fromPersonId === currentId || edge.toPersonId === currentId)
      .forEach((edge) => {
        const spouseId = edge.fromPersonId === currentId ? edge.toPersonId : edge.fromPersonId;
        if (!people[spouseId]) return;
        collectedPersonIds.add(spouseId);
        addRelationship({ personId: currentId, spouseId, type: 'spouse' });
      });

    context.parentEdges
      .filter((edge) => edge.fromPersonId === currentId)
      .forEach((edge) => {
        if (!people[edge.toPersonId]) return;
        addRelationship({ parentId: currentId, childId: edge.toPersonId, type: 'parent' });
        traverseDescendants(edge.toPersonId, currentDepth + 1);
      });
  };

  traverseDescendants(rootPersonId, 1);

  return {
    people: pickPeople(people, collectedPersonIds),
    relationships,
    warnings: context.warnings,
  };
}

function pickPeople(people: Record<string, Person>, ids: ReadonlySet<string>): Record<string, Person> {
  return [...ids].reduce<Record<string, Person>>((acc, id) => {
    const person = people[id];
    if (person) acc[id] = person;
    return acc;
  }, {});
}

export const PublishingRelationshipAdapter = {
  createContext,
  buildAncestorGraph,
  buildBranchGraph,
};
