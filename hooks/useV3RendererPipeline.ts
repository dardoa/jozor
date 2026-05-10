/**
 * useV3RendererPipeline
 *
 * Encapsulates the complete Jozor cluster layout + edge-geometry pipeline in a
 * single memoised computation.  The hook is the canonical bridge between raw
 * people data and the SVG renderer: everything downstream is read-only data.
 *
 * Pipeline order (each layer is pure / referentially transparent):
 *
 *   buildFamilyGraph(people)
 *     → buildLayoutSemanticsSnapshot(graph, focusId, people)
 *       → applyCollapseSemantics(graph, semantics, collapsedOwnerIds)
 *         → buildFamilyGraphClusterLayout(graph, semantics, focusId)
 *           → projectClusterLayoutToPositions(layout)        [final global x,y]
 *             → generateClusterLayoutEdges(layout)           [SVG pathData]
 *
 * Returns null when focusId is absent or not in the graph.
 */

import { useMemo } from 'react';
import type { Person, TreeSettings } from '../types';
import type { CollapsePoint } from '../utils/layout/constants';
import type { FamilyGraph, FamilyUnit } from '../domain/familyGraph';
import type { LayoutSemanticsSnapshot } from '../domain/familyGraphSemantics';
import { V3_HALF_VISUAL_CARD_H } from '../utils/layout/constants';

import { buildFamilyGraph } from '../domain/familyGraph';
import { buildLayoutSemanticsSnapshot } from '../domain/familyGraphSemantics';
import {
  buildFamilyGraphClusterLayout,
  type EdgeEntity,
  generateClusterLayoutEdges,
} from '../domain/familyGraphClusterLayout';

const DEFAULT_HORIZONTAL_SPREAD = 120;
const DEFAULT_VERTICAL_SPREAD = 400;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

function resolveLayoutScale(settings?: Pick<TreeSettings, 'nodeSpacingX' | 'nodeSpacingY'>) {
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

function resolveMaxDepth(settings?: Pick<TreeSettings, 'generationLimit'>): number | undefined {
  if (!Number.isFinite(settings?.generationLimit)) return undefined;
  return Math.max(0, Math.floor(Number(settings?.generationLimit)) - 1);
}

function scalePathXY(pathData: string, scale: { x: number; y: number }): string {
  return pathData.replace(
    /([ML])\s*([-\d.]+)\s+([-\d.]+)/g,
    (_match, command: string, x: string, y: string) =>
      `${command} ${parseFloat(x) * scale.x} ${parseFloat(y) * scale.y}`,
  );
}

// ─── Collapse semantics (extracted from the tree renderer bridge) ─────────────

function deriveCollapsedOwnerIds(
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

function applyCollapseSemantics(
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

// ─── Public output types ──────────────────────────────────────────────────────

export interface V3ProjectedNode {
  uniqueEntityId: string;
  personId: string;
  /** Final global X (pixels). Apply directly as SVG translate X. */
  x: number;
  /** Final global Y (pixels). Apply directly as SVG translate Y. */
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
  /** Canonical + reference persons with final global (x, y). */
  projectedNodes: V3ProjectedNode[];
  /** Family connector nodes (circles / dots) with final global (x, y). */
  familyNodes: V3ProjectedFamily[];
  /** Phase E edges — each carries a ready-to-use SVG `d` string. */
  edgeEntities: EdgeEntity[];
  /** Collapse toggle controls, pre-scaled to global coordinates. */
  collapseControls: V3CollapseControl[];
  /** Tight bounding box over all rendered content, for viewBox sizing. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

function computePipelineBounds(
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

  const re = /[ML]\s*([-\d.]+)\s+([-\d.]+)/g;
  for (const e of edgeEntities) {
    let m: RegExpExecArray | null;
    re.lastIndex = 0; // Reset regex
    while ((m = re.exec(e.pathData)) !== null) {
      update(parseFloat(m[1]), parseFloat(m[2]));
    }
  }

  return hasData
    ? { minX, minY, maxX, maxY }
    : { minX: 0, minY: 0, maxX: 0, maxY: 0 };
}

/**
 * Generates a lightweight, stable structural signature for the people object.
 * Uses a fast bit-shift hash on structural fields to detect topology changes.
 */
function buildPeopleLayoutSignature(people: Record<string, Person>): string {
  const keys = Object.keys(people).sort(); // Sort keys for stability
  let hash = 0;

  for (let i = 0; i < keys.length; i++) {
    const p = people[keys[i]];
    // Structural fields: parents, spouses, children, gender
    const str = `${p.id}:${p.gender}:${(p.parents?.length || 0)}:${(p.spouses?.length || 0)}:${(p.children?.length || 0)}`;
    
    // Simple fast DJB2-like hash
    for (let j = 0; j < str.length; j++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(j);
      hash |= 0; // Convert to 32bit integer
    }
  }
  return hash.toString(36);
}

function buildCollapseSignature(
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

function buildSettingsSignature(
  settings?: Pick<TreeSettings, 'nodeSpacingX' | 'nodeSpacingY' | 'generationLimit'>,
): string {
  return JSON.stringify([
    settings?.nodeSpacingX ?? DEFAULT_HORIZONTAL_SPREAD,
    settings?.nodeSpacingY ?? DEFAULT_VERTICAL_SPREAD,
    settings?.generationLimit ?? null,
  ]);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseV3RendererPipelineParams {
  people: Record<string, Person>;
  focusId: string;
  collapsePoints?: CollapsePoint[];
  settings?: Pick<TreeSettings, 'nodeSpacingX' | 'nodeSpacingY' | 'generationLimit'>;
  // halfNodeHeight / halfNodeWidth are intentionally removed.
  // Edge geometry reads V3_HALF_CARD_H/W directly from constants.
  // Callers no longer need to pass these values.
}

/**
 * Runs the full V3 layout pipeline and returns renderer-ready data.
 * All computation is wrapped in a single useMemo keyed on structural signatures
 * rather than the full people object, so visual-only person edits do not rebuild
 * the layout graph.
 *
 * Returns null when focusId is not found in the graph (empty / invalid state).
 */
export function useV3RendererPipeline({
  people,
  focusId,
  collapsePoints = [],
  settings,
}: UseV3RendererPipelineParams): V3RendererPipeline | null {
  const peopleLayoutSignature = useMemo(
    () => buildPeopleLayoutSignature(people),
    [people],
  );
  const collapseSignature = useMemo(
    () => buildCollapseSignature(collapsePoints, focusId),
    [collapsePoints, focusId],
  );
  const settingsSignature = useMemo(
    () => buildSettingsSignature(settings),
    [settings],
  );

  return useMemo<V3RendererPipeline | null>(() => {
    if (!focusId || !people[focusId]) return null;
    const [nodeSpacingX, nodeSpacingY, generationLimit] = JSON.parse(settingsSignature) as [
      number,
      number,
      number | null,
    ];
    const pipelineSettings = {
      nodeSpacingX,
      nodeSpacingY,
      generationLimit: generationLimit ?? undefined,
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

    const edgeEntities = generateClusterLayoutEdges(clusterLayout).map((edge) => ({
      ...edge,
      pathData: scalePathXY(edge.pathData, layoutScale),
    }));
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
  }, [collapseSignature, focusId, peopleLayoutSignature, settingsSignature]);
}
