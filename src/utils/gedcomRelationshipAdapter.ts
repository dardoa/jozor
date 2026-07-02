import { Person } from '../types';
import { RelationshipEdge, RelationshipEdgeType } from '../types/relationship';

export interface GedcomFamilyGroup {
  readonly familyId: string;
  readonly spouseIds: readonly string[];
  readonly childIds: readonly string[];
  readonly source: 'relationship-edge' | 'legacy-array' | 'mixed';
  readonly warnings: readonly GedcomRelationshipWarning[];
}

export interface GedcomRelationshipWarning {
  readonly code:
    | 'RELATIONSHIP_DRIFT'
    | 'MISSING_PERSON'
    | 'DUPLICATE_SPOUSE_PAIR'
    | 'SELF_RELATIONSHIP'
    | 'UNRESOLVED_PARENT_CHILD';
  readonly personIds: readonly string[];
  readonly message: string;
}

export interface BuildGedcomFamilyGroupsInput {
  readonly people: Record<string, Person>;
  readonly relationshipEdges?: Record<string, RelationshipEdge> | readonly RelationshipEdge[];
  readonly useLegacyFallback?: boolean;
}

const PARENT_EDGE_TYPES = new Set<RelationshipEdgeType>([
  'BIOLOGICAL_PARENT',
  'ADOPTIVE_PARENT',
  'GUARDIAN',
  'FOSTER_PARENT',
  'STEP_PARENT',
]);

const SPOUSE_EDGE_TYPES = new Set<RelationshipEdgeType>([
  'SPOUSE',
  'PARTNER',
]);

export function buildGedcomFamilyGroups(input: BuildGedcomFamilyGroupsInput): {
  readonly groups: readonly GedcomFamilyGroup[];
  readonly warnings: readonly GedcomRelationshipWarning[];
} {
  const people = input.people;
  const warnings: GedcomRelationshipWarning[] = [];

  // Convert edges to array safely
  let edges: readonly RelationshipEdge[] = [];
  if (input.relationshipEdges) {
    edges = Array.isArray(input.relationshipEdges)
      ? input.relationshipEdges
      : Object.values(input.relationshipEdges);
  }

  const hasEdges = edges.length > 0;

  if (!hasEdges && input.useLegacyFallback !== false) {
    return buildFromLegacyArrays(people);
  }

  // Group structures
  interface FamilyBuilder {
    spouseIds: string[];
    childIds: Set<string>;
    source: 'relationship-edge' | 'legacy-array' | 'mixed';
    warnings: GedcomRelationshipWarning[];
  }
  const familyGroupsMap = new Map<string, FamilyBuilder>();

  // Process Spouse Edges
  const processedSpousePairs = new Set<string>();

  edges.forEach((edge) => {
    if (!SPOUSE_EDGE_TYPES.has(edge.type)) return;

    const { fromPersonId, toPersonId } = edge;

    if (fromPersonId === toPersonId) {
      warnings.push({
        code: 'SELF_RELATIONSHIP',
        personIds: [fromPersonId],
        message: 'Self-spouse relationship detected.',
      });
      return;
    }

    if (!people[fromPersonId] || !people[toPersonId]) {
      const missingIds = [];
      if (!people[fromPersonId]) missingIds.push(fromPersonId);
      if (!people[toPersonId]) missingIds.push(toPersonId);
      warnings.push({
        code: 'MISSING_PERSON',
        personIds: missingIds,
        message: 'Spouse edge references missing person in the tree.',
      });
      return;
    }

    const [p1, p2] = [fromPersonId, toPersonId].sort();
    const pairKey = `${p1}:${p2}`;

    if (processedSpousePairs.has(pairKey)) {
      warnings.push({
        code: 'DUPLICATE_SPOUSE_PAIR',
        personIds: [p1, p2],
        message: 'Duplicate spouse edge pair detected.',
      });
      return;
    }
    processedSpousePairs.add(pairKey);

    const familyId = `fam:${p1}:${p2}`;
    familyGroupsMap.set(familyId, {
      spouseIds: [p1, p2],
      childIds: new Set<string>(),
      source: 'relationship-edge',
      warnings: [],
    });
  });

  // Map parents to child relations
  const childParentsMap = new Map<string, Set<string>>();

  edges.forEach((edge) => {
    if (!PARENT_EDGE_TYPES.has(edge.type)) return;

    const parentId = edge.fromPersonId;
    const childId = edge.toPersonId;

    if (parentId === childId) {
      warnings.push({
        code: 'SELF_RELATIONSHIP',
        personIds: [parentId],
        message: 'Self-parent relationship detected.',
      });
      return;
    }

    if (!people[parentId] || !people[childId]) {
      const missingIds = [];
      if (!people[parentId]) missingIds.push(parentId);
      if (!people[childId]) missingIds.push(childId);
      warnings.push({
        code: 'MISSING_PERSON',
        personIds: missingIds,
        message: 'Parent edge references missing person in the tree.',
      });
      return;
    }

    if (!childParentsMap.has(childId)) {
      childParentsMap.set(childId, new Set<string>());
    }
    childParentsMap.get(childId)!.add(parentId);
  });

  // Attach children to best matching family groups
  childParentsMap.forEach((parentIdsSet, childId) => {
    const parentIds = [...parentIdsSet].sort();

    if (parentIds.length >= 2) {
      // Look for a spouse pair match among the parents
      let attached = false;
      for (let i = 0; i < parentIds.length; i++) {
        for (let j = i + 1; j < parentIds.length; j++) {
          const [p1, p2] = [parentIds[i], parentIds[j]].sort();
          const familyId = `fam:${p1}:${p2}`;
          const existingFam = familyGroupsMap.get(familyId);
          if (existingFam) {
            existingFam.childIds.add(childId);
            attached = true;
          }
        }
      }

      if (!attached) {
        // If parents are not spouses, attach to single parent groups for each parent
        parentIds.forEach((parentId) => {
          const singleFamId = `fam:${parentId}:single`;
          if (!familyGroupsMap.has(singleFamId)) {
            familyGroupsMap.set(singleFamId, {
              spouseIds: [parentId],
              childIds: new Set<string>(),
              source: 'relationship-edge',
              warnings: [],
            });
          }
          familyGroupsMap.get(singleFamId)!.childIds.add(childId);
        });
      }
    } else if (parentIds.length === 1) {
      const parentId = parentIds[0];
      const singleFamId = `fam:${parentId}:single`;
      if (!familyGroupsMap.has(singleFamId)) {
        familyGroupsMap.set(singleFamId, {
          spouseIds: [parentId],
          childIds: new Set<string>(),
          source: 'relationship-edge',
          warnings: [],
        });
      }
      familyGroupsMap.get(singleFamId)!.childIds.add(childId);
    }
  });

  // Verify drift warnings if legacy lists exist
  const emittedDriftFamilies = new Set<string>();

  Object.keys(people).forEach((personId) => {
    const person = people[personId];
    if (!person) return;

    // Verify spouses array matching
    const legacySpouses = (person.spouses || []).filter((id) => people[id] && id !== personId);
    legacySpouses.forEach((spouseId) => {
      const [p1, p2] = [personId, spouseId].sort();
      const familyId = `fam:${p1}:${p2}`;
      if (!familyGroupsMap.has(familyId) && !emittedDriftFamilies.has(familyId)) {
        emittedDriftFamilies.add(familyId);
        warnings.push({
          code: 'RELATIONSHIP_DRIFT',
          personIds: [personId, spouseId],
          message: 'Spouse relationship exists in legacy array but is missing in edges.',
        });
      }
    });

    // Verify parents/children array matching
    const legacyParents = (person.parents || []).filter((id) => people[id] && id !== personId);
    legacyParents.forEach((parentId) => {
      // Find if child is linked to parent in any group
      let linked = false;
      familyGroupsMap.forEach((group) => {
        if (group.spouseIds.includes(parentId) && group.childIds.has(personId)) {
          linked = true;
        }
      });

      const parentChildKey = `parent_child:${parentId}:${personId}`;
      if (!linked && !emittedDriftFamilies.has(parentChildKey)) {
        emittedDriftFamilies.add(parentChildKey);
        warnings.push({
          code: 'RELATIONSHIP_DRIFT',
          personIds: [parentId, personId],
          message: 'Parent-child relationship exists in legacy array but is missing in edges.',
        });
      }
    });
  });

  // Compile final sorted output groups
  const finalGroups: GedcomFamilyGroup[] = [];

  [...familyGroupsMap.entries()]
    .sort(([idA], [idB]) => idA.localeCompare(idB))
    .forEach(([familyId, builder]) => {
      finalGroups.push({
        familyId,
        spouseIds: [...builder.spouseIds].sort(),
        childIds: [...builder.childIds].sort(),
        source: builder.source,
        warnings: builder.warnings,
      });
    });

  return {
    groups: finalGroups,
    warnings,
  };
}

function buildFromLegacyArrays(people: Record<string, Person>): {
  readonly groups: readonly GedcomFamilyGroup[];
  readonly warnings: readonly GedcomRelationshipWarning[];
} {
  const familiesMap = new Map<string, { spouseIds: string[]; childIds: Set<string> }>();

  // Process legacy spouses
  Object.keys(people).forEach((personId) => {
    const person = people[personId];
    if (!person) return;

    (person.spouses || []).forEach((spouseId) => {
      if (!people[spouseId] || personId === spouseId) return;
      const [p1, p2] = [personId, spouseId].sort();
      const familyId = `fam:${p1}:${p2}`;

      if (!familiesMap.has(familyId)) {
        familiesMap.set(familyId, {
          spouseIds: [p1, p2],
          childIds: new Set<string>(),
        });
      }
    });
  });

  // Process legacy parent linkages
  Object.keys(people).forEach((childId) => {
    const child = people[childId];
    if (!child) return;

    const validParents = (child.parents || []).filter((id) => people[id] && id !== childId);
    if (validParents.length === 0) return;

    if (validParents.length >= 2) {
      let attached = false;
      for (let i = 0; i < validParents.length; i++) {
        for (let j = i + 1; j < validParents.length; j++) {
          const [p1, p2] = [validParents[i], validParents[j]].sort();
          const familyId = `fam:${p1}:${p2}`;
          const existing = familiesMap.get(familyId);
          if (existing) {
            existing.childIds.add(childId);
            attached = true;
          }
        }
      }

      if (!attached) {
        validParents.forEach((parentId) => {
          const singleId = `fam:${parentId}:single`;
          if (!familiesMap.has(singleId)) {
            familiesMap.set(singleId, {
              spouseIds: [parentId],
              childIds: new Set<string>(),
            });
          }
          familiesMap.get(singleId)!.childIds.add(childId);
        });
      }
    } else {
      const parentId = validParents[0];
      const singleId = `fam:${parentId}:single`;
      if (!familiesMap.has(singleId)) {
        familiesMap.set(singleId, {
          spouseIds: [parentId],
          childIds: new Set<string>(),
        });
      }
      familiesMap.get(singleId)!.childIds.add(childId);
    }
  });

  const finalGroups: GedcomFamilyGroup[] = [];

  [...familiesMap.entries()]
    .sort(([idA], [idB]) => idA.localeCompare(idB))
    .forEach(([familyId, builder]) => {
      finalGroups.push({
        familyId,
        spouseIds: [...builder.spouseIds].sort(),
        childIds: [...builder.childIds].sort(),
        source: 'legacy-array',
        warnings: [],
      });
    });

  return {
    groups: finalGroups,
    warnings: [],
  };
}
