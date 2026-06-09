import type { Person, TreeSettings } from '../../types';
import type { CollapsePoint } from './constants';
import type { FamilyGraph, FamilyUnit } from '../../domain/familyGraph';
import type { LayoutSemanticsSnapshot } from '../../domain/familyGraphSemantics';
import { V3_HALF_VISUAL_CARD_H } from './constants';
import { extractPathPoints } from '../svgUtils';

import { buildFamilyGraph } from '../../domain/familyGraph';
import { buildLayoutSemanticsSnapshot } from '../../domain/familyGraphSemantics';
import {
  buildFamilyGraphClusterLayout,
  type EdgeBounds,
  type EdgeEntity,
  generateClusterLayoutEdges,
} from '../../domain/familyGraphClusterLayout';

const DEFAULT_HORIZONTAL_SPREAD = 120;
const DEFAULT_VERTICAL_SPREAD = 400;

export interface V3ProjectedNode {
  uniqueEntityId: string;
  personId: string;
  x: number;
  y: number;
  isCanonical: boolean;
  isReference: boolean;
}

export interface V3ProjectedFamily {
  familyId: string;
  x: number;
  y: number;
}

export interface V3CollapseControl {
  uniqueKey: string;
  personId: string;
  isCollapsed: boolean;
  direction: 'up' | 'down';
  x: number;
  y: number;
  originX: number;
  originY: number;
}

export interface V3RendererPipeline {
  projectedNodes: V3ProjectedNode[];
  familyNodes: V3ProjectedFamily[];
  edgeEntities: EdgeEntity[];
  collapseControls: V3CollapseControl[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

export type PipelineSettings = Pick<TreeSettings, 'nodeSpacingX' | 'nodeSpacingY'> & {
  generationLimit?: TreeSettings['generationLimit'] | null;
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export function resolveLayoutScale(settings?: Pick<TreeSettings, 'nodeSpacingX' | 'nodeSpacingY'>) {
  const horizontalSpread = Number.isFinite(settings?.nodeSpacingX)
    ? Number(settings?.nodeSpacingX)
    : DEFAULT_HORIZONTAL_SPREAD;
  const verticalSpread = Number.isFinite(settings?.nodeSpacingY)
    ? Number(settings?.nodeSpacingY)
    : DEFAULT_VERTICAL_SPREAD;

  return {
    x: clamp(horizontalSpread / DEFAULT_HORIZONTAL_SPREAD, 0.5, 2.5),
    y: clamp(verticalSpread / DEFAULT_VERTICAL_SPREAD, 0.45, 1.75),
  };
}

export function resolveMaxDepth(settings?: { generationLimit?: number | null }): number | undefined {
  if (!Number.isFinite(settings?.generationLimit)) return undefined;
  return Math.max(0, Math.floor(Number(settings?.generationLimit)) - 1);
}

export function scalePathXY(pathData: string, scale: { x: number; y: number }): string {
  return pathData.replace(
    /([ML])\s*([-\d.]+)\s+([-\d.]+)/g,
    (_match, command: string, x: string, y: string) =>
      `${command} ${parseFloat(x) * scale.x} ${parseFloat(y) * scale.y}`,
  );
}

export function deriveCollapsedOwnerIds(
  collapsePoints: CollapsePoint[],
  focusId: string,
): Set<string> {
  return new Set(
    collapsePoints
      .filter(
        (pt) =>
          pt.isCollapsed &&
          pt.uniqueKey === pt.id &&
          pt.id !== `${focusId}_up`,
      )
      .map((pt) => pt.id),
  );
}

export function applyCollapseSemantics(
  familyGraph: FamilyGraph,
  semanticsSnapshot: LayoutSemanticsSnapshot,
  collapsedOwnerIds: Set<string>,
): LayoutSemanticsSnapshot {
  if (collapsedOwnerIds.size === 0) return semanticsSnapshot;

  const familyDecisions = Object.fromEntries(
    Object.entries(semanticsSnapshot.familyDecisions).map(([id, d]) => [
      id,
      { ...d, parentDisplayOrder: d.parentDisplayOrder ? [...d.parentDisplayOrder] : null },
    ]),
  );
  const personRoles = Object.fromEntries(
    Object.entries(semanticsSnapshot.personRoles).map(([id, r]) => [id, { ...r }]),
  );

  const canonicalFamiliesByOwner = new Map<string, string[]>();
  Object.values(familyDecisions).forEach((decision) => {
    if (decision.renderMode !== 'canonical' || !decision.branchOwnerPersonId) return;
    const owned = canonicalFamiliesByOwner.get(decision.branchOwnerPersonId) ?? [];
    owned.push(decision.familyId);
    canonicalFamiliesByOwner.set(decision.branchOwnerPersonId, owned);
  });

  const hiddenPersons = new Set<string>();
  const hiddenFamilies = new Set<string>();

  const hidePersonSubtree = (personId: string): void => {
    if (hiddenPersons.has(personId)) return;
    hiddenPersons.add(personId);
    const role = personRoles[personId];
    if (role) { role.role = 'hidden'; role.reason = 'collapsed-subtree-hidden'; }

    const ownedFamilies = canonicalFamiliesByOwner.get(personId) ?? [];
    ownedFamilies.forEach((familyId) => {
      if (hiddenFamilies.has(familyId)) return;
      hiddenFamilies.add(familyId);
      const decision = familyDecisions[familyId];
      if (decision) {
        decision.renderMode = 'hidden';
        decision.reason = 'collapsed-subtree-hidden';
        decision.branchOwnerPersonId = null;
        decision.canonicalBranchPersonId = null;
        decision.ownerReason = undefined;
        decision.parentDisplayOrder = null;
      }
      const family: FamilyUnit | undefined = familyGraph.families[familyId];
      family?.childIds.forEach(hidePersonSubtree);
    });
  };

  collapsedOwnerIds.forEach((ownerId) => {
    const ownedFamilies = canonicalFamiliesByOwner.get(ownerId) ?? [];
    ownedFamilies.forEach((familyId) => {
      const family: FamilyUnit | undefined = familyGraph.families[familyId];
      family?.childIds.forEach(hidePersonSubtree);
    });
  });

  return { rootPersonId: semanticsSnapshot.rootPersonId, familyDecisions, personRoles };
}


function getPathBounds(pathData: string): EdgeBounds | null {
  const points = extractPathPoints(pathData);
  if (points.length === 0) return null;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function computePipelineBounds(
  projectedNodes: V3ProjectedNode[],
  familyNodes: V3ProjectedFamily[],
  edgeEntities: EdgeEntity[],
): V3RendererPipeline['bounds'] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasData = false;

  const update = (x: number, y: number) => {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
    hasData = true;
  };

  for (const n of projectedNodes) update(n.x, n.y);
  for (const f of familyNodes) update(f.x, f.y);

  for (const e of edgeEntities) {
    const b = e.bounds || (e.pathData ? getPathBounds(e.pathData) : null);
    if (b) {
      update(b.minX, b.minY);
      update(b.maxX, b.maxY);
    }
  }

  return hasData
    ? { minX, minY, maxX, maxY }
    : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
}

export function buildPeopleLayoutSignature(people: Record<string, Person>): string {
  const keys = Object.keys(people).sort();
  let hash = 0;

  for (let i = 0; i < keys.length; i++) {
    const p = people[keys[i]];
    const str = [
      p.id,
      p.gender,
      p.birthDate ?? '',
      p.deathDate ?? '',
      p.isDeceased ? '1' : '0',
      (p.parents ?? []).join(','),
      (p.spouses ?? []).join(','),
      (p.children ?? []).join(','),
    ].join(':');
    
    for (let j = 0; j < str.length; j++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(j);
      hash |= 0;
    }
  }
  return hash.toString(36);
}

export function buildCollapseSignature(
  collapsePoints: CollapsePoint[],
  focusId: string,
): string {
  return JSON.stringify([
    focusId,
    collapsePoints.map((point) => [
      point.id,
      point.uniqueKey,
      point.isCollapsed,
    ]),
  ]);
}

export function buildSettingsSignature(
  settings?: Pick<TreeSettings, 'nodeSpacingX' | 'nodeSpacingY' | 'generationLimit'>,
): string {
  return JSON.stringify([
    settings?.nodeSpacingX ?? DEFAULT_HORIZONTAL_SPREAD,
    settings?.nodeSpacingY ?? DEFAULT_VERTICAL_SPREAD,
    settings?.generationLimit ?? null,
  ]);
}

export function computeV3PipelineData({
  people,
  focusId,
  collapsePoints,
  settings,
}: {
  people: Record<string, Person>;
  focusId: string;
  collapsePoints: CollapsePoint[];
  settings: PipelineSettings;
}): V3RendererPipeline | null {
  if (!focusId || !people[focusId]) return null;

  const pipelineSettings: PipelineSettings = {
    nodeSpacingX: settings.nodeSpacingX,
    nodeSpacingY: settings.nodeSpacingY,
    generationLimit: settings.generationLimit,
  };

  // ── 1. Build graph ────────────────────────────────────────────────────
  const graph = buildFamilyGraph(people);
  if (!graph.persons[focusId]) return null;

  // ── 2. Semantics + collapse mask ──────────────────────────────────────
  const layoutScale = resolveLayoutScale(pipelineSettings);
  const baseSemanticsSnapshot = buildLayoutSemanticsSnapshot(
    graph,
    focusId,
    people,
    { maxDepth: resolveMaxDepth(pipelineSettings) },
  );
  const collapsedOwnerIds = deriveCollapsedOwnerIds(collapsePoints, focusId);
  const semanticsSnapshot = applyCollapseSemantics(
    graph,
    baseSemanticsSnapshot,
    collapsedOwnerIds,
  );

  // ── 3. Cluster layout → global projection → SVG edge geometry ─────────
  const clusterLayout = buildFamilyGraphClusterLayout(graph, semanticsSnapshot, focusId, people);

  const edgeEntities = generateClusterLayoutEdges(clusterLayout).map((edge) => {
    const scaledPath = scalePathXY(edge.pathData, layoutScale);
    return {
      ...edge,
      pathData: scaledPath,
      bounds: getPathBounds(scaledPath),
    };
  });
  const projectedNodes: V3ProjectedNode[] = Object.values(clusterLayout.nodes).map((node) => ({
    uniqueEntityId: node.entityId,
    personId: node.personId,
    x: node.x * layoutScale.x,
    y: node.y * layoutScale.y,
    isCanonical: node.renderRole === 'canonical',
    isReference: node.renderRole === 'reference',
  }));
  const familyNodes: V3ProjectedFamily[] = Object.values(clusterLayout.clusters).map((cluster) => ({
    familyId: cluster.familyId,
    x: cluster.marriagePoint.x * layoutScale.x,
    y: cluster.marriagePoint.y * layoutScale.y,
  }));

  // ── 4. Collapse controls ──────────────────────────────────────────────
  const collapseControls: V3CollapseControl[] = collapsePoints
    .filter((pt) => Boolean(clusterLayout.nodes[pt.id]))
    .map((pt) => {
      const node = clusterLayout.nodes[pt.id];
      const pos = { x: node.x * layoutScale.x, y: node.y * layoutScale.y };
      const isUp = pt.uniqueKey === `${pt.id}_up`;
      const visualHalfHeight = V3_HALF_VISUAL_CARD_H * layoutScale.y;
      return {
        uniqueKey: pt.uniqueKey,
        personId: pt.id,
        isCollapsed: pt.isCollapsed,
        direction: isUp ? 'up' : 'down',
        x: pos.x,
        y: isUp ? (pos.y - visualHalfHeight) - 18 : (pos.y + visualHalfHeight) + 18,
        originX: pos.x,
        originY: isUp ? pos.y - visualHalfHeight : pos.y + visualHalfHeight,
      };
    });

  return {
    projectedNodes,
    familyNodes,
    edgeEntities,
    collapseControls,
    bounds: computePipelineBounds(projectedNodes, familyNodes, edgeEntities),
  };
}
