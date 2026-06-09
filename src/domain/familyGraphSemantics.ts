import type { Person } from '../types';
import type { FamilyGraph, FamilyUnitSemantics } from './familyGraph';

export interface FamilyRenderDecision {
  familyId: string;
  renderMode: 'canonical' | 'reference-only' | 'hidden';
  canonicalBranchPersonId?: string | null;
  branchOwnerPersonId?: string | null;
  ownerId?: string | null;
  ownerReason?: string;
  parentDisplayOrder?: string[] | null;
  reason?: string;
}

export interface PersonRenderRole {
  personId: string;
  role: 'canonical' | 'reference' | 'hidden';
  type?: 'child' | 'spouse' | 'root' | 'parent';
  viaFamilyId?: string | null;
  reason?: string;
}

export interface LayoutSemanticsSnapshot {
  rootPersonId: string;
  familyDecisions: Record<string, FamilyRenderDecision>;
  personRoles: Record<string, PersonRenderRole>;
}

export interface LayoutSemanticsOptions {
  maxDepth?: number;
}

interface CompatibleFamilyGraph extends FamilyGraph {
  people?: Record<string, Person>;
}

interface CompatibleFamilyUnit {
  familyId?: string;
  id?: string;
  parentIds?: string[];
  childIds?: string[];
  semantics?: FamilyUnitSemantics;
}

function normalizeFamilyGraph(input: CompatibleFamilyGraph): FamilyGraph {
  const persons = input.persons ?? input.people ?? {};
  const normalizedFamilies = Object.fromEntries(
    Object.entries(input.families ?? {}).map(([familyId, family]: [string, CompatibleFamilyUnit]) => [
      familyId,
      {
        familyId: family.familyId ?? family.id ?? familyId,
        parentIds: [...(family.parentIds ?? [])],
        childIds: [...(family.childIds ?? [])],
        semantics:
          family.semantics ?? {
            missingParentSide: (family.parentIds?.length ?? 0) >= 2 ? 'none' : 'one-missing',
            unionType: (family.childIds?.length ?? 0) > 0
              ? (family.parentIds?.length ?? 0) >= 2
                ? 'parental'
                : 'single-parent'
              : 'partnership',
          },
      },
    ])
  );

  const normalizedPersons = Object.fromEntries(
    Object.keys(persons).map((personId) => [
      personId,
      input.persons?.[personId] ?? {
        personId,
        parentUnitId: Object.keys(normalizedFamilies).find((familyId) =>
          normalizedFamilies[familyId].childIds.includes(personId)
        ) ?? null,
        ownUnitIds: Object.keys(normalizedFamilies).filter((familyId) =>
          normalizedFamilies[familyId].parentIds.includes(personId)
        ),
        familyIds: Object.keys(normalizedFamilies).filter((familyId) => {
          const family = normalizedFamilies[familyId];
          return family.parentIds.includes(personId) || family.childIds.includes(personId);
        }),
      },
    ])
  );

  return {
    persons: normalizedPersons,
    families: normalizedFamilies,
  };
}

function applyFamilyDecision(
  decisions: Record<string, FamilyRenderDecision>,
  familyId: string,
  renderMode: 'canonical' | 'reference-only',
  canonicalBranchPersonId: string,
  reason: string
): void {
  const existing = decisions[familyId];

  if (!existing || existing.renderMode === 'hidden') {
    decisions[familyId] = {
      familyId,
      renderMode,
      canonicalBranchPersonId,
      branchOwnerPersonId: null,
      ownerReason: undefined,
      parentDisplayOrder: null,
      reason,
    };
    return;
  }

  if (existing.renderMode === 'reference-only' && renderMode === 'canonical') {
    decisions[familyId] = {
      familyId,
      renderMode: 'canonical',
      canonicalBranchPersonId,
      branchOwnerPersonId: existing.branchOwnerPersonId ?? null,
      ownerReason: existing.ownerReason,
      parentDisplayOrder: existing.parentDisplayOrder ?? null,
      reason,
    };
  }
}

function computePersonDistances(
  familyGraph: FamilyGraph,
  rootPersonId: string
): Map<string, number> {
  const personDistances = new Map<string, number>();
  const seenFamilies = new Set<string>();
  const queue: Array<{ kind: 'person' | 'family'; id: string; distance: number }> = [
    { kind: 'person', id: rootPersonId, distance: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.kind === 'person') {
      if (personDistances.has(current.id)) continue;
      personDistances.set(current.id, current.distance);
      const personRef = familyGraph.persons[current.id];
      if (!personRef) continue;

      personRef.familyIds.forEach((familyId) => {
        if (seenFamilies.has(familyId)) return;
        queue.push({ kind: 'family', id: familyId, distance: current.distance + 1 });
      });
      continue;
    }

    if (seenFamilies.has(current.id)) continue;
    seenFamilies.add(current.id);
    const family = familyGraph.families[current.id];
    if (!family) continue;

    [...family.parentIds, ...family.childIds].forEach((personId) => {
      if (personDistances.has(personId)) return;
      queue.push({ kind: 'person', id: personId, distance: current.distance + 1 });
    });
  }

  return personDistances;
}

function finalizeCanonicalFamilyOwnership(
  familyGraph: FamilyGraph,
  familyDecisions: Record<string, FamilyRenderDecision>,
  personRoles: Record<string, PersonRenderRole>,
  personDistances: Map<string, number>,
  rootPersonId: string,
  people: Record<string, Person>
): void {
  Object.values(familyDecisions).forEach((decision) => {
    if (decision.renderMode !== 'canonical') {
      decision.branchOwnerPersonId = null;
      decision.ownerReason = undefined;
      decision.parentDisplayOrder = null;
      return;
    }

    const family = familyGraph.families[decision.familyId];
    if (!family || family.parentIds.length === 0) {
      decision.branchOwnerPersonId = null;
      decision.ownerReason = 'canonical-family-without-parents';
      decision.parentDisplayOrder = null;
      return;
    }

    // Determine owner based on a strict hierarchy: 
    // 1. Canonical Status (Critical to fix "Alone Root" issue)
    // 2. Root Supremacy
    // 3. Bloodline Priority
    // 4. Gender (Patrilineal fallback)

    const orderedParents = [...family.parentIds].sort((left, right) => {
      const leftRole = personRoles[left];
      const rightRole = personRoles[right];

      // PRIORITY 1: Canonical Supremacy
      // We MUST anchor children to a card that is actually drawn as a full card in this branch.
      const leftIsCanonical = leftRole?.role === 'canonical';
      const rightIsCanonical = rightRole?.role === 'canonical';
      if (leftIsCanonical && !rightIsCanonical) return -1;
      if (rightIsCanonical && !leftIsCanonical) return 1;

      // PRIORITY 2: Root Supremacy
      if (left === rootPersonId && right !== rootPersonId) return -1;
      if (right === rootPersonId && left !== rootPersonId) return 1;

      // PRIORITY 3: Bloodline Priority
      const leftIsBlood = leftRole?.type === 'child' || leftRole?.type === 'root' || leftRole?.type === 'parent';
      const rightIsBlood = rightRole?.type === 'child' || rightRole?.type === 'root' || rightRole?.type === 'parent';
      if (leftIsBlood && !rightIsBlood) return -1;
      if (rightIsBlood && !leftIsBlood) return 1;

      // PRIORITY 4: Gender Tie-breaker
      const leftPerson = people[left];
      const rightPerson = people[right];
      if (leftPerson?.gender === 'male' && rightPerson?.gender !== 'male') return -1;
      if (rightPerson?.gender === 'male' && leftPerson?.gender !== 'male') return 1;

      // PRIORITY 5: Distance to root
      const leftDistance = personDistances.get(left) ?? 999;
      const rightDistance = personDistances.get(right) ?? 999;
      if (leftDistance !== rightDistance) return leftDistance - rightDistance;

      return left.localeCompare(right);
    });

    const ownerId = orderedParents[0];
    decision.branchOwnerPersonId = ownerId;
    decision.ownerId = ownerId;
    decision.parentDisplayOrder = orderedParents;
    decision.canonicalBranchPersonId = ownerId;
    
    // Set human-readable reason
    if (ownerId === rootPersonId) decision.ownerReason = 'root-is-parent';
    else if (personRoles[ownerId]?.type === 'child') decision.ownerReason = 'bloodline-priority';
    else if (people[ownerId]?.gender === 'male') decision.ownerReason = 'patrilineal-priority';
    else decision.ownerReason = 'canonical-status-priority';
    decision.reason = ownerId === rootPersonId ? 'root-supremacy' : decision.ownerReason;
  });
}

function applyPersonRole(
  roles: Record<string, PersonRenderRole>,
  personId: string,
  role: 'canonical' | 'reference',
  type: 'child' | 'spouse' | 'root' | 'parent',
  viaFamilyId: string | null,
  reason: string
): boolean {
  const existing = roles[personId];

  if (!existing || existing.role === 'hidden') {
    roles[personId] = { personId, role, type, viaFamilyId, reason };
    return true;
  }

  if (existing.role === 'reference' && role === 'canonical') {
    roles[personId] = { personId, role, type, viaFamilyId, reason };
    return true;
  }

  return false;
}

function assignViaFamilyIds(
  familyGraph: FamilyGraph,
  familyDecisions: Record<string, FamilyRenderDecision>,
  personRoles: Record<string, PersonRenderRole>,
  rootPersonId: string
): void {
  Object.values(personRoles).forEach((role) => {
    role.viaFamilyId = null;
  });

  if (personRoles[rootPersonId]) {
    personRoles[rootPersonId].viaFamilyId = null;
  }

  const canonicalFamilies = Object.values(familyDecisions)
    .filter((decision) => decision.renderMode === 'canonical')
    .sort((left, right) => left.familyId.localeCompare(right.familyId));

  canonicalFamilies.forEach((decision) => {
    const family = familyGraph.families[decision.familyId];
    if (!family) return;

    family.parentIds.forEach((parentId) => {
      const role = personRoles[parentId];
      if (!role || role.role !== 'canonical') return;
      if (parentId === rootPersonId) return;
      if (role.viaFamilyId) return;
      role.viaFamilyId = decision.familyId;
    });

    family.childIds.forEach((childId) => {
      const role = personRoles[childId];
      if (!role || role.role !== 'canonical') return;
      if (role.viaFamilyId) return;
      role.viaFamilyId = decision.familyId;
    });
  });
}

function processNode(
  node: { id: string; type: PersonRenderRole['type']; depth: number },
  familyGraph: FamilyGraph,
  visitedPeople: Set<string>,
  visitedFamilies: Set<string>,
  personRoles: Record<string, PersonRenderRole>,
  familyDecisions: Record<string, FamilyRenderDecision>,
  queue: Array<{ id: string; type: PersonRenderRole['type']; depth: number }>,
  maxDepth: number
): void {
  const { id, type, depth } = node;
  if (depth > maxDepth) return; // Safety limit + Appearance Lab generation cap

  const personRef = familyGraph.persons[id];
  if (!personRef) return;

  const isFirstVisit = !visitedPeople.has(id);
  const role: 'canonical' | 'reference' = isFirstVisit ? 'canonical' : 'reference';
  
  applyPersonRole(personRoles, id, role, type || 'spouse', null, isFirstVisit ? 'bfs-discovery' : 're-discovery');
  
  if (isFirstVisit) {
    visitedPeople.add(id);
    
    personRef.ownUnitIds.forEach((famId) => {
      const family = familyGraph.families[famId];
      if (!family || visitedFamilies.has(famId)) return;

      visitedFamilies.add(famId);
      applyFamilyDecision(familyDecisions, famId, 'canonical', id, 'bfs-discovery');

      family.parentIds.forEach((pid) => {
        if (pid !== id) {
          queue.push({ id: pid, type: 'spouse', depth: depth + 1 });
        }
      });

      family.childIds.forEach((cid) => {
        queue.push({ id: cid, type: 'child', depth: depth + 1 });
      });
    });

    if (personRef.parentUnitId) {
      const famId = personRef.parentUnitId;
      const family = familyGraph.families[famId];
      if (family && !visitedFamilies.has(famId)) {
        visitedFamilies.add(famId);
        applyFamilyDecision(familyDecisions, famId, 'reference-only', id, 'ancestor-family');

        family.parentIds.forEach((pid) => {
          queue.push({ id: pid, type: 'parent', depth: depth + 1 });
        });
      }
    }
  }
}

export function buildLayoutSemanticsSnapshot(
  familyGraphInput: FamilyGraph,
  rootPersonId: string,
  people: Record<string, Person>,
  options: LayoutSemanticsOptions = {}
): LayoutSemanticsSnapshot {
  const familyGraph = normalizeFamilyGraph(familyGraphInput as CompatibleFamilyGraph);
  const resolvedPeople =
    Object.keys(people ?? {}).length > 0
      ? people
      : (((familyGraphInput as CompatibleFamilyGraph).people ?? {}) as Record<string, Person>);
  const familyDecisions: Record<string, FamilyRenderDecision> = {};
  const personRoles: Record<string, PersonRenderRole> = {};

  // Initialize
  Object.keys(familyGraph.families).forEach(id => {
    familyDecisions[id] = { familyId: id, renderMode: 'hidden', reason: 'unreached' };
  });
  Object.keys(familyGraph.persons).forEach(id => {
    personRoles[id] = { personId: id, role: 'hidden', reason: 'unreached' };
  });

  if (!familyGraph.persons[rootPersonId] || !resolvedPeople[rootPersonId]) {
    return { rootPersonId, familyDecisions, personRoles };
  }

  const personDistances = computePersonDistances(familyGraph, rootPersonId);
  const visitedPeople = new Set<string>();
  const visitedFamilies = new Set<string>();

  // BFS Queue: { id, type, depth }
  const queue: Array<{ id: string; type: PersonRenderRole['type']; depth: number }> = [
    { id: rootPersonId, type: 'root', depth: 0 }
  ];
  const maxDepth = Number.isFinite(options.maxDepth)
    ? Math.max(0, Math.floor(options.maxDepth ?? 20))
    : 20;

  while (queue.length > 0) {
    const node = queue.shift()!;
    processNode(
      node,
      familyGraph,
      visitedPeople,
      visitedFamilies,
      personRoles,
      familyDecisions,
      queue,
      maxDepth
    );
  }

  // Finalize ownership
  finalizeCanonicalFamilyOwnership(
    familyGraph,
    familyDecisions,
    personRoles,
    personDistances,
    rootPersonId,
    resolvedPeople
  );

  assignViaFamilyIds(familyGraph, familyDecisions, personRoles, rootPersonId);

  return {
    rootPersonId,
    familyDecisions,
    personRoles,
  };
}
