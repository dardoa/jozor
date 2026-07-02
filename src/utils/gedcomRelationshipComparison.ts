import { Person } from '../types';
import { RelationshipEdge } from '../types/relationship';
import {
  buildGedcomFamilyGroups,
  GedcomFamilyGroup,
  GedcomRelationshipWarning,
} from './gedcomRelationshipAdapter';

export interface GedcomRelationshipComparisonResult {
  readonly equivalent: boolean;
  readonly legacyFamilyCount: number;
  readonly adapterFamilyCount: number;
  readonly warnings: readonly GedcomRelationshipWarning[];
  readonly differences: readonly GedcomDifference[];
}

export interface GedcomDifference {
  readonly code: 'MISSING_IN_ADAPTER' | 'EXTRA_IN_ADAPTER' | 'CHILDREN_MISMATCH' | 'SPOUSES_MISMATCH';
  readonly familyId: string;
  readonly personIds: readonly string[];
}

export function compareGedcomRelationships(
  people: Record<string, Person>,
  relationshipEdges?: Record<string, RelationshipEdge> | readonly RelationshipEdge[]
): GedcomRelationshipComparisonResult {
  // Generate legacy family groups directly
  const legacyResult = buildLegacyFamilyGroupsDirect(people);

  // Generate adapter family groups
  const adapterResult = buildGedcomFamilyGroups({
    people,
    relationshipEdges,
    useLegacyFallback: true,
  });

  const differences: GedcomDifference[] = [];

  const legacyMap = new Map<string, GedcomFamilyGroup>();
  legacyResult.groups.forEach((g) => legacyMap.set(g.familyId, g));

  const adapterMap = new Map<string, GedcomFamilyGroup>();
  adapterResult.groups.forEach((g) => adapterMap.set(g.familyId, g));

  // 1. Check missing in adapter
  legacyResult.groups.forEach((legacyGroup) => {
    const adapterGroup = adapterMap.get(legacyGroup.familyId);
    if (!adapterGroup) {
      differences.push({
        code: 'MISSING_IN_ADAPTER',
        familyId: legacyGroup.familyId,
        personIds: [...legacyGroup.spouseIds, ...legacyGroup.childIds].sort(),
      });
    } else {
      // Compare spouses
      const legacySpouses = [...legacyGroup.spouseIds].sort();
      const adapterSpouses = [...adapterGroup.spouseIds].sort();
      if (JSON.stringify(legacySpouses) !== JSON.stringify(adapterSpouses)) {
        differences.push({
          code: 'SPOUSES_MISMATCH',
          familyId: legacyGroup.familyId,
          personIds: [...new Set([...legacySpouses, ...adapterSpouses])].sort(),
        });
      }

      // Compare children
      const legacyChildren = [...legacyGroup.childIds].sort();
      const adapterChildren = [...adapterGroup.childIds].sort();
      if (JSON.stringify(legacyChildren) !== JSON.stringify(adapterChildren)) {
        differences.push({
          code: 'CHILDREN_MISMATCH',
          familyId: legacyGroup.familyId,
          personIds: [...new Set([...legacyChildren, ...adapterChildren])].sort(),
        });
      }
    }
  });

  // 2. Check extra in adapter
  adapterResult.groups.forEach((adapterGroup) => {
    if (!legacyMap.has(adapterGroup.familyId)) {
      differences.push({
        code: 'EXTRA_IN_ADAPTER',
        familyId: adapterGroup.familyId,
        personIds: [...adapterGroup.spouseIds, ...adapterGroup.childIds].sort(),
      });
    }
  });

  return {
    equivalent: differences.length === 0,
    legacyFamilyCount: legacyResult.groups.length,
    adapterFamilyCount: adapterResult.groups.length,
    warnings: adapterResult.warnings,
    differences,
  };
}

function buildLegacyFamilyGroupsDirect(people: Record<string, Person>): {
  readonly groups: readonly GedcomFamilyGroup[];
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
  };
}
