import type { Person } from '../types';
import type { FamilyGraph } from './familyGraph';
import type { LayoutSemanticsSnapshot } from './familyGraphSemantics';
import {
  V3_CARD_CLEARANCE,
  V3_FAMILY_TO_BAR_GAP,
  V3_GENERATION_GAP,
  V3_HALF_CARD_W,
  V3_HALF_CARD_H,
  V3_HALF_VISUAL_CARD_H,
  V3_INTER_FAMILY_GAP,
  V3_PARTNER_GAP,
  V3_SIBLING_GAP,
  V3_TRUNK_ROUTE_OFFSET,
} from '../utils/layout/constants';

export type EdgeEntityType =
  | 'partner-link'
  | 'parent-to-family'
  | 'family-trunk'
  | 'sibling-bar'
  | 'child-drop';

export interface EdgeEntityMetadata {
  familyId: string;
  sourcePersonId: string | null;
  targetPersonId: string | null;
}

export interface EdgeEntity {
  id: string;
  type: EdgeEntityType;
  pathData: string;
  metadata: EdgeEntityMetadata;
}

export interface ClusterLayoutNode {
  entityId: string;
  personId: string;
  generation: number;
  x: number;
  y: number;
  renderRole: 'canonical' | 'reference';
}

export interface ClusterLayoutEdgePoints {
  partnerStart?: { x: number; y: number };
  partnerEnd?: { x: number; y: number };
  marriagePoint: { x: number; y: number };
  childBandStart?: { x: number; y: number };
  childBandEnd?: { x: number; y: number };
}

export interface FamilyClusterLayout {
  familyId: string;
  generation: number;
  parentEntityIds: string[];
  childEntityIds: string[];
  marriagePoint: { x: number; y: number };
  childBandCenter: { x: number; y: number };
  bounds: { left: number; right: number; top: number; bottom: number };
  edgePoints: ClusterLayoutEdgePoints;
}

export interface ClusterLayoutSnapshot {
  nodes: Record<string, ClusterLayoutNode>;
  clusters: Record<string, FamilyClusterLayout>;
}



interface MutableClusterLayoutState {
  nodes: Map<string, ClusterLayoutNode>;
  clusters: Map<string, FamilyClusterLayout>;
  generationByPerson: Map<string, number>;
  footprintMemo: Map<string, FootprintBounds>;
}

interface FootprintBounds {
  left: number;
  right: number;
}

function personY(generation: number): number {
  return (generation / 2) * V3_GENERATION_GAP;
}

function familyY(generation: number): number {
  return personY(generation - 1);
}

function childBandY(generation: number): number {
  return familyY(generation) + V3_FAMILY_TO_BAR_GAP;
}

function normalizeZero(value: number): number {
  return Math.abs(value) < 1e-9 ? 0 : value;
}

function fmt(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function linePath(start: { x: number; y: number }, end: { x: number; y: number }): string {
  return `M ${fmt(start.x)} ${fmt(start.y)} L ${fmt(end.x)} ${fmt(end.y)}`;
}

function orthogonalPath(start: { x: number; y: number }, end: { x: number; y: number }, midY?: number): string {
  if (Math.abs(start.x - end.x) < 0.01 || Math.abs(start.y - end.y) < 0.01) {
    return linePath(start, end);
  }

  const routingY = midY ?? (start.y + end.y) / 2;
  return [
    `M ${fmt(start.x)} ${fmt(start.y)}`,
    `L ${fmt(start.x)} ${fmt(routingY)}`,
    `L ${fmt(end.x)} ${fmt(routingY)}`,
    `L ${fmt(end.x)} ${fmt(end.y)}`,
  ].join(' ');
}

function getCanonicalFamiliesByOwner(
  semantics: LayoutSemanticsSnapshot
): Map<string, string[]> {
  const byOwner = new Map<string, string[]>();

  Object.values(semantics.familyDecisions).forEach((decision) => {
    if (decision.renderMode !== 'canonical' || !decision.branchOwnerPersonId) return;
    const families = byOwner.get(decision.branchOwnerPersonId) ?? [];
    families.push(decision.familyId);
    families.sort();
    byOwner.set(decision.branchOwnerPersonId, families);
  });

  return byOwner;
}

function getFamilyPartnerId(
  familyParentIds: string[],
  ownerId: string
): string | null {
  return familyParentIds.find((parentId) => parentId !== ownerId) ?? null;
}

function sortFamiliesForOwner(
  ownerId: string,
  familyIds: string[],
  graph: FamilyGraph,
  people?: Record<string, Person>
): string[] {
  const spouseOrder = new Map(
    (people?.[ownerId]?.spouses ?? []).map((spouseId, index) => [spouseId, index])
  );

  return [...familyIds].sort((leftFamilyId, rightFamilyId) => {
    const leftPartner = getFamilyPartnerId(graph.families[leftFamilyId]?.parentIds ?? [], ownerId);
    const rightPartner = getFamilyPartnerId(graph.families[rightFamilyId]?.parentIds ?? [], ownerId);
    const leftOrder = leftPartner ? spouseOrder.get(leftPartner) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    const rightOrder = rightPartner ? spouseOrder.get(rightPartner) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return leftFamilyId.localeCompare(rightFamilyId);
  });
}

function parseBirthTime(person: Person | undefined): number {
  if (!person?.birthDate) return Number.MAX_SAFE_INTEGER;
  const time = Date.parse(person.birthDate);
  return Number.isFinite(time) ? time : Number.MAX_SAFE_INTEGER;
}

function getParentChildOrder(
  childId: string,
  parentIds: string[],
  people?: Record<string, Person>
): number {
  const indices = parentIds
    .map((parentId) => people?.[parentId]?.children?.indexOf(childId) ?? -1)
    .filter((index) => index >= 0);
  return indices.length > 0 ? Math.min(...indices) : Number.MAX_SAFE_INTEGER;
}

function sortChildrenForFamily(
  childIds: string[],
  parentIds: string[],
  people?: Record<string, Person>
): string[] {
  return [...childIds].sort((leftId, rightId) => {
    const leftBirth = parseBirthTime(people?.[leftId]);
    const rightBirth = parseBirthTime(people?.[rightId]);
    if (leftBirth !== rightBirth) return leftBirth - rightBirth;

    const leftOrder = getParentChildOrder(leftId, parentIds, people);
    const rightOrder = getParentChildOrder(rightId, parentIds, people);
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;

    return leftId.localeCompare(rightId);
  });
}

function computeCanonicalGenerations(
  graph: FamilyGraph,
  semantics: LayoutSemanticsSnapshot,
  rootPersonId: string,
  people?: Record<string, Person>
): Map<string, number> {
  const generationByPerson = new Map<string, number>();
  const queue: Array<{ personId: string; generation: number }> = [];
  const canonicalFamiliesByOwner = getCanonicalFamiliesByOwner(semantics);

  if (semantics.personRoles[rootPersonId]?.role !== 'canonical') return generationByPerson;

  generationByPerson.set(rootPersonId, 0);
  queue.push({ personId: rootPersonId, generation: 0 });

  while (queue.length > 0) {
    const current = queue.shift()!;
    const person = graph.persons[current.personId];
    if (!person) continue;

    person.ownUnitIds.forEach((familyId) => {
      const family = graph.families[familyId];
      if (!family || semantics.familyDecisions[familyId]?.renderMode !== 'canonical') return;

      family.parentIds.forEach((parentId) => {
        if (semantics.personRoles[parentId]?.role !== 'canonical') return;
        const existing = generationByPerson.get(parentId);
        if (existing !== undefined && existing <= current.generation) return;
        generationByPerson.set(parentId, current.generation);
        queue.push({ personId: parentId, generation: current.generation });
      });
    });

    sortFamiliesForOwner(
      current.personId,
      canonicalFamiliesByOwner.get(current.personId) ?? [],
      graph,
      people,
    ).forEach((familyId) => {
      const family = graph.families[familyId];
      if (!family) return;

      sortChildrenForFamily(family.childIds, family.parentIds, people).forEach((childId) => {
        if (semantics.personRoles[childId]?.role !== 'canonical') return;
        const nextGeneration = current.generation + 2;
        const existing = generationByPerson.get(childId);
        if (existing !== undefined && existing <= nextGeneration) return;
        generationByPerson.set(childId, nextGeneration);
        queue.push({ personId: childId, generation: nextGeneration });
      });
    });
  }

  return generationByPerson;
}

function upsertCanonicalNode(
  state: MutableClusterLayoutState,
  personId: string,
  generation: number,
  x: number
): ClusterLayoutNode {
  const existing = state.nodes.get(personId);
  if (existing) {
    return existing;
  }

  const node: ClusterLayoutNode = {
    entityId: personId,
    personId,
    generation,
    x: normalizeZero(x),
    y: personY(generation),
    renderRole: 'canonical',
  };
  state.nodes.set(node.entityId, node);
  return node;
}

function upsertLocalCanonicalNode(
  state: MutableClusterLayoutState,
  familyId: string,
  personId: string,
  generation: number,
  x: number
): ClusterLayoutNode {
  const existingCanonical = state.nodes.get(personId);
  if (existingCanonical?.renderRole === 'canonical') {
    return existingCanonical;
  }

  const entityId = `local:${familyId}:${personId}`;
  const existing = state.nodes.get(entityId);
  if (existing) {
    existing.x = normalizeZero(x);
    existing.y = personY(generation);
    return existing;
  }

  const node: ClusterLayoutNode = {
    entityId,
    personId,
    generation,
    x: normalizeZero(x),
    y: personY(generation),
    renderRole: 'canonical',
  };
  state.nodes.set(entityId, node);
  return node;
}

function getOrCreateParentNode(
  state: MutableClusterLayoutState,
  graph: FamilyGraph,
  semantics: LayoutSemanticsSnapshot,
  familyId: string,
  personId: string,
  generation: number,
  x: number,
  people?: Record<string, Person>
): ClusterLayoutNode {
  const role = semantics.personRoles[personId];
  const familyOwnerId = semantics.familyDecisions[familyId]?.branchOwnerPersonId ?? null;
  const canonicalOriginFamilyId = graph.persons[personId]?.parentUnitId ?? role?.viaFamilyId ?? null;
  const hasCanonicalOriginInAnotherFamily =
    role?.role === 'canonical' &&
    role.type !== 'spouse' &&
    Boolean(canonicalOriginFamilyId) &&
    canonicalOriginFamilyId !== familyId &&
    semantics.familyDecisions[canonicalOriginFamilyId as string]?.renderMode === 'canonical';
  const isFemaleLineageReference = people?.[personId]?.gender === 'female';
  const shouldRenderAsLocalReference =
    personId !== familyOwnerId &&
    isFemaleLineageReference &&
    hasCanonicalOriginInAnotherFamily;

  const isCanonicalParent =
    !shouldRenderAsLocalReference &&
    role?.role === 'canonical' &&
    (graph.persons[personId]?.ownUnitIds ?? []).includes(familyId);

  if (isCanonicalParent) {
    return upsertCanonicalNode(state, personId, generation, x);
  }

  if (!shouldRenderAsLocalReference) {
    return upsertLocalCanonicalNode(state, familyId, personId, generation, x);
  }

  const entityId = `ref:${familyId}:${personId}`;
  const existing = state.nodes.get(entityId);
  if (existing) {
    existing.x = normalizeZero(x);
    existing.y = personY(generation);
    return existing;
  }

  const node: ClusterLayoutNode = {
    entityId,
    personId,
    generation,
    x: normalizeZero(x),
    y: personY(generation),
    renderRole: 'reference',
  };
  state.nodes.set(entityId, node);
  return node;
}

function getOrCreateChildNode(
  state: MutableClusterLayoutState,
  graph: FamilyGraph,
  semantics: LayoutSemanticsSnapshot,
  familyId: string,
  personId: string,
  generation: number,
  x: number
): ClusterLayoutNode {
  const isCanonicalChild =
    semantics.personRoles[personId]?.role === 'canonical' &&
    graph.persons[personId]?.parentUnitId === familyId;

  if (isCanonicalChild) {
    return upsertCanonicalNode(state, personId, generation, x);
  }

  const entityId = `ref:${familyId}:${personId}`;
  const existing = state.nodes.get(entityId);
  if (existing) {
    existing.x = normalizeZero(x);
    existing.y = personY(generation);
    return existing;
  }

  const node: ClusterLayoutNode = {
    entityId,
    personId,
    generation,
    x: normalizeZero(x),
    y: personY(generation),
    renderRole: 'reference',
  };
  state.nodes.set(entityId, node);
  return node;
}

function childBandWidth(childCount: number): number {
  if (childCount <= 0) return 0;
  return V3_HALF_CARD_W * 2 + Math.max(0, childCount - 1) * V3_SIBLING_GAP;
}

function footprintWidth(bounds: FootprintBounds): number {
  return bounds.right - bounds.left;
}

function alternatingPartnerOffset(index: number): number {
  const direction = index % 2 === 0 ? 1 : -1;
  const ring = Math.floor(index / 2) + 1;
  return direction * ring * V3_PARTNER_GAP;
}

function computeChildBandOffsets(
  _ownerId: string,
  families: string[],
  graph: FamilyGraph,
  semantics: LayoutSemanticsSnapshot,
  people: Record<string, Person> | undefined,
  memo: Map<string, FootprintBounds>,
  visiting: Set<string>
): Map<string, number> {
  const offsets = new Map<string, number>();
  
  if (families.length === 0) return offsets;
  if (families.length === 1) {
    offsets.set(families[0], 0);
    return offsets;
  }

  let rightCursor = 0;
  let leftCursor = 0;

  families.forEach((familyId, index) => {
    const family = graph.families[familyId];
    if (!family) return;

    const childIds = sortChildrenForFamily(family.childIds, family.parentIds, people)
      .filter((childId) => semantics.personRoles[childId]?.role !== 'hidden');
    
    let childrenWidth = 0;
    if (childIds.length > 0) {
      const childBounds = childIds.map(childId => computePersonFootprintBounds(childId, graph, semantics, people, memo, visiting));
      childrenWidth = childBounds.reduce((sum, child) => sum + footprintWidth(child), 0)
        + Math.max(0, childBounds.length - 1) * V3_INTER_FAMILY_GAP;
    }
    
    const requiredHalfWidth = Math.max(0, childrenWidth / 2 + V3_CARD_CLEARANCE);

    if (index % 2 === 0) {
      const offset = Math.max(rightCursor + requiredHalfWidth, requiredHalfWidth);
      offsets.set(familyId, offset);
      rightCursor = offset + requiredHalfWidth;
    } else {
      const offset = Math.min(leftCursor - requiredHalfWidth, -requiredHalfWidth);
      offsets.set(familyId, offset);
      leftCursor = offset - requiredHalfWidth;
    }
  });

  return offsets;
}

function computePersonFootprintBounds(
  personId: string,
  graph: FamilyGraph,
  semantics: LayoutSemanticsSnapshot,
  people: Record<string, Person> | undefined,
  memo: Map<string, FootprintBounds>,
  visiting = new Set<string>()
): FootprintBounds {
  const memoized = memo.get(personId);
  if (memoized !== undefined) return memoized;
  if (visiting.has(personId)) return { left: -V3_HALF_CARD_W, right: V3_HALF_CARD_W };

  visiting.add(personId);

  const canonicalFamiliesByOwner = getCanonicalFamiliesByOwner(semantics);
  let bounds: FootprintBounds = { left: -V3_HALF_CARD_W, right: V3_HALF_CARD_W };

  const families = sortFamiliesForOwner(
    personId,
    canonicalFamiliesByOwner.get(personId) ?? [],
    graph,
    people
  );
  
  const childBandOffsets = computeChildBandOffsets(personId, families, graph, semantics, people, memo, visiting);

  families.forEach((familyId, familyIndex) => {
    const family = graph.families[familyId];
    if (!family) return;

    const parentIds = semantics.familyDecisions[familyId]?.parentDisplayOrder ?? [...family.parentIds];
    const partnerId = parentIds.find((parentId) => parentId !== personId) ?? null;
    const partnerOffset = partnerId ? alternatingPartnerOffset(familyIndex) : 0;
    const marriageX = partnerOffset / 2;
    const childBandOffset = childBandOffsets.get(familyId) ?? 0;
    const childBandX = marriageX + childBandOffset;
    const childBounds = sortChildrenForFamily(family.childIds, family.parentIds, people)
      .filter((childId) => semantics.personRoles[childId]?.role !== 'hidden')
      .map((childId) => computePersonFootprintBounds(childId, graph, semantics, people, memo, visiting));

    bounds = {
      left: Math.min(bounds.left, partnerOffset - V3_HALF_CARD_W),
      right: Math.max(bounds.right, partnerOffset + V3_HALF_CARD_W),
    };

    if (childBounds.length === 0) return;

    const totalChildrenWidth = childBounds.reduce((sum, child) => sum + footprintWidth(child), 0)
      + Math.max(0, childBounds.length - 1) * V3_INTER_FAMILY_GAP;
    let cursorLeft = childBandX - totalChildrenWidth / 2;
    childBounds.forEach((child) => {
      const childCenter = cursorLeft - child.left;
      bounds.left = Math.min(bounds.left, childCenter + child.left);
      bounds.right = Math.max(bounds.right, childCenter + child.right);
      cursorLeft = childCenter + child.right + V3_INTER_FAMILY_GAP;
    });
  });

  visiting.delete(personId);
  memo.set(personId, bounds);
  return bounds;
}

function computeChildSlots(
  childIds: string[],
  semantics: LayoutSemanticsSnapshot,
  graph: FamilyGraph,
  people: Record<string, Person> | undefined,
  footprintMemo: Map<string, FootprintBounds>,
  direction = 0
): Map<string, number> {
  const positions = new Map<string, number>();
  const childBounds = childIds.map((childId) =>
    computePersonFootprintBounds(childId, graph, semantics, people, footprintMemo)
  );
  const shouldFanToOneSide = direction !== 0 && childIds.length > 0;
  const gap = V3_INTER_FAMILY_GAP;

  if (shouldFanToOneSide) {
    const firstChildOffset = direction * (V3_HALF_CARD_W + V3_CARD_CLEARANCE);
    let cursor = firstChildOffset;

    childIds.forEach((childId, index) => {
      positions.set(childId, normalizeZero(cursor));

      const current = childBounds[index];
      const next = childBounds[index + 1];
      if (!next) return;

      cursor = direction > 0
        ? cursor + current.right + gap - next.left
        : cursor + current.left - gap - next.right;
    });
    return positions;
  }

  const totalWidth = childBounds.reduce((sum, child) => sum + footprintWidth(child), 0)
    + Math.max(0, childBounds.length - 1) * gap;
  let cursorLeft = -totalWidth / 2;
  childIds.forEach((childId, index) => {
    const current = childBounds[index];
    const childCenter = cursorLeft - current.left;
    positions.set(childId, normalizeZero(childCenter));
    cursorLeft = childCenter + current.right + gap;
  });

  return positions;
}

function addCluster(
  state: MutableClusterLayoutState,
  graph: FamilyGraph,
  semantics: LayoutSemanticsSnapshot,
  familyId: string,
  ownerId: string,
  familyIndex: number,
  _familyCount: number,
  ownerX: number,
  ownerGeneration: number,
  childBandOffsets: Map<string, number>,
  people?: Record<string, Person>
): void {
  const family = graph.families[familyId];
  if (!family) return;

  const familyGeneration = ownerGeneration + 1;
  const childGeneration = ownerGeneration + 2;
  const parentIds = semantics.familyDecisions[familyId]?.parentDisplayOrder ?? [...family.parentIds];
  const partnerId = parentIds.find((parentId) => parentId !== ownerId) ?? null;
  const partnerOffset = partnerId ? alternatingPartnerOffset(familyIndex) : 0;
  const partnerX = partnerId ? ownerX + partnerOffset : ownerX;
  const marriagePoint = {
    x: normalizeZero((ownerX + partnerX) / 2),
    y: familyY(familyGeneration),
  };
  const childBandOffset = childBandOffsets.get(familyId) ?? 0;
  const childBandCenter = {
    x: normalizeZero(marriagePoint.x + childBandOffset),
    y: childBandY(familyGeneration),
  };

  const parentNodes = [
    getOrCreateParentNode(state, graph, semantics, familyId, ownerId, ownerGeneration, ownerX, people),
  ];

  if (partnerId) {
    parentNodes.push(
      getOrCreateParentNode(state, graph, semantics, familyId, partnerId, ownerGeneration, partnerX, people)
    );
  }

  const visibleChildren = sortChildrenForFamily(family.childIds, family.parentIds, people)
    .filter((childId) =>
      semantics.personRoles[childId]?.role === 'canonical' &&
      graph.persons[childId]?.parentUnitId === familyId
    );
  const childSlots = computeChildSlots(
    visibleChildren,
    semantics,
    graph,
    people,
    state.footprintMemo,
    0
  );
  const childSlotValues = [...childSlots.values()];
  const firstChildX = childSlotValues.length > 0 ? childBandCenter.x + Math.min(...childSlotValues) : childBandCenter.x;
  const lastChildX = childSlotValues.length > 0 ? childBandCenter.x + Math.max(...childSlotValues) : childBandCenter.x;
  const bandWidth = visibleChildren.length > 0
    ? (lastChildX - firstChildX) + (V3_HALF_CARD_W * 2)
    : childBandWidth(visibleChildren.length);
  const childNodes = visibleChildren.map((childId, childIndex) =>
    getOrCreateChildNode(
      state,
      graph,
      semantics,
      familyId,
      childId,
      childGeneration,
      childBandCenter.x + (childSlots.get(childId) ?? childIndex * V3_SIBLING_GAP)
    )
  );

  const xs = [
    ...parentNodes.map((node) => node.x),
    ...childNodes.map((node) => node.x),
    marriagePoint.x,
  ];
  const left = Math.min(...xs) - V3_HALF_CARD_W;
  const right = Math.max(...xs) + V3_HALF_CARD_W;
  const top = personY(ownerGeneration) - V3_HALF_VISUAL_CARD_H;
  const bottom = personY(childGeneration) + V3_HALF_VISUAL_CARD_H;

  const sortedParentNodes = [...parentNodes].sort((leftNode, rightNode) => leftNode.x - rightNode.x);
  const partnerStart = sortedParentNodes.length >= 2
    ? { x: sortedParentNodes[0].x + V3_HALF_CARD_W, y: sortedParentNodes[0].y }
    : undefined;
  const partnerEnd = sortedParentNodes.length >= 2
    ? { x: sortedParentNodes[1].x - V3_HALF_CARD_W, y: sortedParentNodes[1].y }
    : undefined;

  state.clusters.set(familyId, {
    familyId,
    generation: familyGeneration,
    parentEntityIds: parentNodes.map((node) => node.entityId),
    childEntityIds: childNodes.map((node) => node.entityId),
    marriagePoint,
    childBandCenter,
    bounds: {
      left: Math.min(left, marriagePoint.x - bandWidth / 2),
      right: Math.max(right, marriagePoint.x + bandWidth / 2),
      top,
      bottom,
    },
    edgePoints: {
      partnerStart,
      partnerEnd,
      marriagePoint,
      childBandStart: visibleChildren.length > 0 ? { x: firstChildX, y: childBandCenter.y } : undefined,
      childBandEnd: visibleChildren.length > 0
        ? { x: lastChildX, y: childBandCenter.y }
        : undefined,
    },
  });
}

function refreshClusterGeometry(
  state: MutableClusterLayoutState,
  cluster: FamilyClusterLayout
): void {
  const parentNodes = cluster.parentEntityIds
    .map((entityId) => state.nodes.get(entityId))
    .filter((node): node is ClusterLayoutNode => Boolean(node));
  const childNodes = cluster.childEntityIds
    .map((entityId) => state.nodes.get(entityId))
    .filter((node): node is ClusterLayoutNode => Boolean(node));
  const sortedParentNodes = [...parentNodes].sort((leftNode, rightNode) => leftNode.x - rightNode.x);
  const childXs = childNodes.map((node) => node.x).sort((left, right) => left - right);
  const anchorXs = [
    ...parentNodes.map((node) => node.x),
    ...childNodes.map((node) => node.x),
  ];

  const marriageX = sortedParentNodes.length >= 2
    ? (sortedParentNodes[0].x + sortedParentNodes[1].x) / 2
    : sortedParentNodes[0]?.x ?? childXs[0] ?? cluster.marriagePoint.x;
  const marriagePoint = {
    x: normalizeZero(marriageX),
    y: cluster.marriagePoint.y,
  };
  const childBandCenter = {
    x: marriagePoint.x + (cluster.childBandCenter.x - cluster.marriagePoint.x),
    y: cluster.childBandCenter.y,
  };
  const childBandStart = childXs.length > 0
    ? { x: Math.min(childXs[0], childBandCenter.x), y: childBandCenter.y }
    : undefined;
  const childBandEnd = childXs.length > 0
    ? { x: Math.max(childXs[childXs.length - 1], childBandCenter.x), y: childBandCenter.y }
    : undefined;

  cluster.marriagePoint = marriagePoint;
  cluster.childBandCenter = childBandCenter;
  cluster.edgePoints = {
    partnerStart: sortedParentNodes.length >= 2
      ? { x: sortedParentNodes[0].x + V3_HALF_CARD_W, y: sortedParentNodes[0].y }
      : undefined,
    partnerEnd: sortedParentNodes.length >= 2
      ? { x: sortedParentNodes[1].x - V3_HALF_CARD_W, y: sortedParentNodes[1].y }
      : undefined,
    marriagePoint,
    childBandStart,
    childBandEnd,
  };

  const minX = anchorXs.length > 0 ? Math.min(...anchorXs, marriagePoint.x) : marriagePoint.x;
  const maxX = anchorXs.length > 0 ? Math.max(...anchorXs, marriagePoint.x) : marriagePoint.x;
  const bandLeft = childBandStart?.x ?? marriagePoint.x;
  const bandRight = childBandEnd?.x ?? marriagePoint.x;
  cluster.bounds = {
    left: Math.min(minX - V3_HALF_CARD_W, bandLeft),
    right: Math.max(maxX + V3_HALF_CARD_W, bandRight),
    top: cluster.bounds.top,
    bottom: cluster.bounds.bottom,
  };
}



function placePersonSubtreeAt(
  state: MutableClusterLayoutState,
  graph: FamilyGraph,
  semantics: LayoutSemanticsSnapshot,
  canonicalFamiliesByOwner: Map<string, string[]>,
  placedPersons: Set<string>,
  personId: string,
  generation: number,
  absoluteX: number,
  people?: Record<string, Person>,
): void {
  if (placedPersons.has(personId)) return;
  placedPersons.add(personId);

  upsertCanonicalNode(state, personId, generation, absoluteX);

  const families = sortFamiliesForOwner(
    personId,
    canonicalFamiliesByOwner.get(personId) ?? [],
    graph,
    people,
  );

  const childBandOffsets = computeChildBandOffsets(personId, families, graph, semantics, people, state.footprintMemo, new Set());

  families.forEach((familyId, familyIndex) => {
    addCluster(
      state,
      graph,
      semantics,
      familyId,
      personId,
      familyIndex,
      families.length,
      absoluteX,
      generation,
      childBandOffsets,
      people,
    );

    const family = graph.families[familyId];
    if (!family) return;

    sortChildrenForFamily(family.childIds, family.parentIds, people).forEach((childId) => {
      if (semantics.personRoles[childId]?.role !== 'canonical') return;
      const childNode = state.nodes.get(childId);
      if (!childNode) return;
      placePersonSubtreeAt(
        state,
        graph,
        semantics,
        canonicalFamiliesByOwner,
        placedPersons,
        childId,
        generation + 2,
        childNode.x,
        people,
      );
    });
  });
}

function refreshAllClusterGeometry(state: MutableClusterLayoutState): void {
  state.clusters.forEach((cluster) => refreshClusterGeometry(state, cluster));
}

export function buildFamilyGraphClusterLayout(
  graph: FamilyGraph,
  semantics: LayoutSemanticsSnapshot,
  rootPersonId: string,
  people?: Record<string, Person>
): ClusterLayoutSnapshot {
  const generationByPerson = computeCanonicalGenerations(graph, semantics, rootPersonId, people);
  const state: MutableClusterLayoutState = {
    nodes: new Map(),
    clusters: new Map(),
    generationByPerson,
    footprintMemo: new Map(),
  };

  const canonicalFamiliesByOwner = getCanonicalFamiliesByOwner(semantics);
  const placedPersons = new Set<string>();
  const rootGeneration = generationByPerson.get(rootPersonId) ?? 0;

  // Pass A: top-down, footprint-based absolute placement
  placePersonSubtreeAt(
    state,
    graph,
    semantics,
    canonicalFamiliesByOwner,
    placedPersons,
    rootPersonId,
    rootGeneration,
    0,
    people,
  );

  // Rebuild all cluster geometry from final node positions
  refreshAllClusterGeometry(state);

  return {
    nodes: Object.fromEntries(state.nodes),
    clusters: Object.fromEntries(state.clusters),
  };
}

export function generateClusterLayoutEdges(layout: ClusterLayoutSnapshot): EdgeEntity[] {
  const edges: EdgeEntity[] = [];

  Object.values(layout.clusters)
    .sort((left, right) => left.familyId.localeCompare(right.familyId))
    .forEach((cluster) => {
      const parentIds = cluster.parentEntityIds.map(
        (entityId) => layout.nodes[entityId]?.personId ?? entityId
      );

      if (cluster.edgePoints.partnerStart && cluster.edgePoints.partnerEnd) {
        edges.push({
          id: `partner-link:${cluster.familyId}:${cluster.parentEntityIds.join(':')}`,
          type: 'partner-link',
          pathData: linePath(cluster.edgePoints.partnerStart, cluster.edgePoints.partnerEnd),
          metadata: {
            familyId: cluster.familyId,
            sourcePersonId: parentIds[0] ?? null,
            targetPersonId: parentIds[1] ?? null,
          },
        });
      }

      const hasPartnerLink = Boolean(cluster.edgePoints.partnerStart && cluster.edgePoints.partnerEnd);

      if (!hasPartnerLink) {
        cluster.parentEntityIds.forEach((entityId) => {
          const node = layout.nodes[entityId];
          if (!node) return;
          const parentBottom = { x: node.x, y: node.y + V3_HALF_CARD_H };
          edges.push({
            id: `parent-to-family:${cluster.familyId}:${entityId}`,
            type: 'parent-to-family',
            pathData: orthogonalPath(parentBottom, cluster.marriagePoint),
            metadata: {
              familyId: cluster.familyId,
              sourcePersonId: node.personId,
              targetPersonId: null,
            },
          });
        });
      }

      if (!cluster.edgePoints.childBandStart || !cluster.edgePoints.childBandEnd) return;

      edges.push({
        id: `family-trunk:${cluster.familyId}`,
        type: 'family-trunk',
        pathData: orthogonalPath(cluster.marriagePoint, cluster.childBandCenter, cluster.marriagePoint.y + V3_TRUNK_ROUTE_OFFSET),
        metadata: {
          familyId: cluster.familyId,
          sourcePersonId: parentIds[0] ?? null,
          targetPersonId: null,
        },
      });

      edges.push({
        id: `sibling-bar:${cluster.familyId}`,
        type: 'sibling-bar',
        pathData: linePath(cluster.edgePoints.childBandStart, cluster.edgePoints.childBandEnd),
        metadata: {
          familyId: cluster.familyId,
          sourcePersonId: null,
          targetPersonId: null,
        },
      });

      cluster.childEntityIds.forEach((entityId) => {
        const node = layout.nodes[entityId];
        if (!node) return;
        const dropStart = { x: node.x, y: cluster.childBandCenter.y };
        const dropEnd = { x: node.x, y: node.y - V3_HALF_CARD_H };
        edges.push({
          id: `child-drop:${cluster.familyId}:${entityId}`,
          type: 'child-drop',
          pathData: linePath(dropStart, dropEnd),
          metadata: {
            familyId: cluster.familyId,
            sourcePersonId: null,
            targetPersonId: node.personId,
          },
        });
      });
    });

  return edges;
}
