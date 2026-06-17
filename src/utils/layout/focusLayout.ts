/**
 * focusLayout.ts
 *
 * Calculates the "Focus Mode" tree layout.
 *
 * Philosophy: A pure function. No class instances, no global state, no
 * dependency on archived rendering pipelines. Given raw people data and a
 * selected person ID, it returns the complete set of positioned nodes and
 * links needed to render the tree.
 *
 * Layout contract:
 *  - The focused person is always placed at (0, 0) — the Anchor Protocol.
 *  - Ancestors expand upward (negative y), descendants expand downward
 *    (positive y), and spouses are placed horizontally beside the focus node.
 *  - The generation limit from TreeSettings is respected for both ancestors
 *    and descendants.
 */

import type { Person, TreeNode, TreeLink, TreeSettings } from '../../types';
import { CollapsePoint, NODE_HEIGHT_DEFAULT, NODE_HEIGHT_COMPACT, NODE_WIDTH_DEFAULT, NODE_WIDTH_COMPACT } from './constants';
import { buildFamilyGraph } from '../../domain/familyGraph';
import { buildLayoutSemanticsSnapshot } from '../../domain/familyGraphSemantics';
import {
  buildFamilyGraphClusterLayout,
  generateClusterLayoutEdges,
} from '../../domain/familyGraphClusterLayout';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Fallback spacing values — must stay in sync with DEFAULT_TREE_SETTINGS in constants.ts.
const DEFAULT_SPACING_X = 120;
const DEFAULT_SPACING_Y = 400;

function spacingX(settings: TreeSettings): number {
  return settings.nodeSpacingX ?? DEFAULT_SPACING_X;
}

function spacingY(settings: TreeSettings): number {
  return settings.nodeSpacingY ?? DEFAULT_SPACING_Y;
}

/**
 * Orientation-aware coordinate transform.
 * In vertical mode (default): x=horizontal slot, y=generation depth → unchanged.
 * In horizontal mode: axes are swapped so that
 *   ancestors extend left (negative X), descendants extend right (positive X),
 *   and sibling spread runs vertically.
 */
function orient(
  rawX: number,
  rawY: number,
  isHorizontal: boolean
): { x: number; y: number } {
  return isHorizontal ? { x: rawY, y: rawX } : { x: rawX, y: rawY };
}

function safeGet(people: Record<string, Person>, id: string): Person | null {
  return people[id] ?? null;
}

// ---------------------------------------------------------------------------
// Ancestor collection (walks UP the tree)
// ---------------------------------------------------------------------------

interface AncestorEntry {
  personId: string;
  /** Generation above focus. Focus = 0, parents = 1, grandparents = 2 … */
  generation: number;
  /** Horizontal slot within the generation row. */
  slot: number;
}

function collectAncestors(
  focusId: string,
  people: Record<string, Person>,
  limit: number,
  collapsedIds: Set<string>
): AncestorEntry[] {
  const result: AncestorEntry[] = [];
  const visited = new Set<string>();

  // BFS upward
  let currentLevel: Array<{ id: string; slot: number }> = [{ id: focusId, slot: 0 }];

  for (let gen = 1; gen <= limit; gen++) {
    const nextLevel: Array<{ id: string; slot: number }> = [];
    let slot = 0;

    for (const { id } of currentLevel) {
      const person = safeGet(people, id);
      if (!person) continue;

      // Pruning: skip yielding parents if this node is collapsed upwards
      const uniqueKey = id === focusId ? `${id}_up` : id;
      if (collapsedIds.has(uniqueKey)) continue;

      for (const parentId of person.parents ?? []) {
        if (visited.has(parentId)) continue;
        visited.add(parentId);
        result.push({ personId: parentId, generation: gen, slot });
        nextLevel.push({ id: parentId, slot });
        slot++;
      }
    }

    if (nextLevel.length === 0) break;
    currentLevel = nextLevel;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Descendant collection (walks DOWN the tree)
// ---------------------------------------------------------------------------

interface DescendantEntry {
  personId: string;
  generation: number;
  slot: number;
}

function collectDescendants(
  focusId: string,
  people: Record<string, Person>,
  limit: number,
  collapsedIds: Set<string>
): DescendantEntry[] {
  const result: DescendantEntry[] = [];
  const visited = new Set<string>([focusId]);

  let currentLevel: Array<{ id: string; slot: number }> = [{ id: focusId, slot: 0 }];

  for (let gen = 1; gen <= limit; gen++) {
    const nextLevel: Array<{ id: string; slot: number }> = [];
    let slot = 0;

    for (const { id } of currentLevel) {
      const person = safeGet(people, id);
      if (!person) continue;

      // Pruning: skip yielding children if this node is collapsed downwards
      if (collapsedIds.has(id)) continue;

      for (const childId of person.children ?? []) {
        if (visited.has(childId)) continue;
        visited.add(childId);
        result.push({ personId: childId, generation: gen, slot });
        nextLevel.push({ id: childId, slot });
        slot++;
      }
    }

    if (nextLevel.length === 0) break;
    currentLevel = nextLevel;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Spouse collection (single level — direct spouses of focus only)
// ---------------------------------------------------------------------------

function collectSpouses(
  focusId: string,
  people: Record<string, Person>
): string[] {
  const person = safeGet(people, focusId);
  if (!person) return [];
  return (person.spouses ?? []).filter((id) => !!people[id]);
}

// ---------------------------------------------------------------------------
// Main layout function
// ---------------------------------------------------------------------------

export interface FocusLayoutResult {
  nodes: TreeNode[];
  links: TreeLink[];
  collapsePoints: CollapsePoint[];
}

/**
 * Builds a fully positioned Focus Mode layout.
 *
 * @param selectedPersonId - The person whose subtree is centred on screen.
 * @param people - The complete people map from the application store.
 * @param settings - Current TreeSettings for spacing and generation limits.
 */
export function calculateFocusLayout(
  selectedPersonId: string,
  people: Record<string, Person>,
  settings: TreeSettings,
  collapsedIds: Set<string> = new Set()
): FocusLayoutResult {
  if (!people[selectedPersonId]) {
    return { nodes: [], links: [], collapsePoints: [] };
  }

  const sx = spacingX(settings);
  const sy = spacingY(settings);
  const limit = Math.max(1, settings.generationLimit ?? 4);
  const isHorizontal = settings.layoutMode === 'horizontal';

  // Node-size-aware sibling stride.
  // sx (nodeSpacingX) is the GAP between cards, not center-to-center.
  // stride = physical card width + gap so sibling slots never overlap.
  const cardW = settings.isCompact ? NODE_WIDTH_COMPACT : NODE_WIDTH_DEFAULT;
  const stride = cardW + sx;

  const nodesMap = new Map<string, TreeNode>();
  const links: TreeLink[] = [];

  // ------------------------------------------------------------------
  // 1. Place the focus node at the origin (Anchor Protocol)
  // ------------------------------------------------------------------
  const focusPerson = people[selectedPersonId]!;
  const focusNode: TreeNode = {
    id: selectedPersonId,
    x: 0,
    y: 0,
    data: focusPerson,
    type: 'focus',
  };
  nodesMap.set(selectedPersonId, focusNode);

  // ------------------------------------------------------------------
  // 2. Ancestors — placed above the focus node
  // ------------------------------------------------------------------
  const ancestors = collectAncestors(selectedPersonId, people, limit, collapsedIds);

  for (const { personId, generation, slot } of ancestors) {
    const person = safeGet(people, personId);
    if (!person) continue;

    // Centre the generation row around x=0 using the slot index
    const genCount = ancestors.filter((a) => a.generation === generation).length;
    const rowWidth = (genCount - 1) * stride;
    const rawX = slot * stride - rowWidth / 2;
    const rawY = -generation * sy;
    const { x, y } = orient(rawX, rawY, isHorizontal);

    nodesMap.set(personId, {
      id: personId,
      x,
      y,
      data: person,
      type: 'ancestor',
      depth: generation,
    });
  }

  // ------------------------------------------------------------------
  // 3. Descendants — placed below the focus node
  // ------------------------------------------------------------------
  const descendants = collectDescendants(selectedPersonId, people, limit, collapsedIds);

  for (const { personId, generation, slot } of descendants) {
    const person = safeGet(people, personId);
    if (!person) continue;

    const genCount = descendants.filter((d) => d.generation === generation).length;
    const rowWidth = (genCount - 1) * stride;
    const rawX = slot * stride - rowWidth / 2;
    const rawY = generation * sy;
    const { x, y } = orient(rawX, rawY, isHorizontal);

    nodesMap.set(personId, {
      id: personId,
      x,
      y,
      data: person,
      type: 'descendant',
      depth: generation,
    });
  }

  // ------------------------------------------------------------------
  // 4. Direct spouses — placed beside the focus node
  // ------------------------------------------------------------------
  const spouseIds = collectSpouses(selectedPersonId, people);

  spouseIds.forEach((spouseId, index) => {
    const person = safeGet(people, spouseId);
    if (!person) return;

    // Vertical: spouses beside focus with node-size-aware stride. Horizontal: stacked vertically.
    const side = index % 2 === 0 ? 1 : -1;
    const offset = Math.ceil((index + 1) / 2);
    const { x: sx_, y: sy_ } = isHorizontal
      ? { x: 0, y: side * offset * sy }
      : { x: side * offset * stride, y: 0 };

    nodesMap.set(spouseId, {
      id: spouseId,
      x: sx_,
      y: sy_,
      data: person,
      type: 'spouse',
    });

    links.push({ source: selectedPersonId, target: spouseId, type: 'marriage' });
  });

  // ------------------------------------------------------------------
  // 5. Build links from the collected nodes
  // ------------------------------------------------------------------
  for (const node of nodesMap.values()) {
    const person = node.data;

    for (const childId of person.children ?? []) {
      // Only link if both parent and child are in the visible set
      if (nodesMap.has(childId)) {
        links.push({ source: node.id, target: childId, type: 'parent-child' });
      }
    }
  }
  // ------------------------------------------------------------------
  // 6. Generate CollapsePoints
  // ------------------------------------------------------------------
  const collapsePoints: CollapsePoint[] = [];
  const nodeH = settings.isCompact ? NODE_HEIGHT_COMPACT : NODE_HEIGHT_DEFAULT;
  const dy = nodeH / 2;

  for (const node of nodesMap.values()) {
    const person = node.data;

    // Upward collapse points (Ancestors & Focus node)
    if ((node.type === 'ancestor' || node.type === 'focus') && (person.parents?.length ?? 0) > 0) {
      // Focus node upward key is distinct from downward key
      const uniqueKey = node.type === 'focus' ? `${node.id}_up` : node.id;
      
      // We render the point if it has parents, regardless of un-seen, so the user can toggle
      collapsePoints.push({
        id: node.id,
        spouseId: '',
        uniqueKey,
        x: node.x,
        y: node.y - dy,
        originX: node.x,
        originY: node.y,
        isCollapsed: collapsedIds.has(uniqueKey),
      });
    }

    // Downward collapse points (Descendants & Focus node)
    if ((node.type === 'descendant' || node.type === 'focus') && (person.children?.length ?? 0) > 0) {
      const uniqueKey = node.id;

      collapsePoints.push({
        id: node.id,
        spouseId: '',
        uniqueKey,
        x: node.x,
        y: node.y + dy,
        originX: node.x,
        originY: node.y,
        isCollapsed: collapsedIds.has(uniqueKey),
      });
    }
  }

  return { nodes: Array.from(nodesMap.values()), links, collapsePoints };
}

// ── V3 Adapter ──────────────────────────────────────────────────────────────
export function calculateV3FocusLayout(
  focusId: string,
  people: Record<string, Person>,
  settings: TreeSettings,
  collapsedIds: Set<string>
): { nodes: TreeNode[]; links: TreeLink[]; collapsePoints: CollapsePoint[] } {
  const graph = buildFamilyGraph(people);
  const semanticsSnapshot = buildLayoutSemanticsSnapshot(graph, focusId, people);
  const clusterLayout = buildFamilyGraphClusterLayout(graph, semanticsSnapshot, focusId, people);
  const edgeEntities = generateClusterLayoutEdges(clusterLayout);

  const canonicalEntityIdByPersonId = new Map<string, string>();
  Object.values(clusterLayout.nodes).forEach((entity) => {
    if (entity.renderRole === 'canonical') {
      canonicalEntityIdByPersonId.set(entity.personId, entity.entityId);
    }
  });

  const nodes = Object.values(clusterLayout.nodes)
    .map((entity) => {
      const personData = people[entity.personId];
      if (!personData) return null;

      return {
        id: entity.entityId,
        x: entity.x,
        y: entity.y,
        data: personData,
        type: (entity.personId === focusId ? 'focus' : 'ancestor') as TreeNode['type'],
        depth: Math.abs(entity.generation),
        isReference: entity.renderRole === 'reference',
      } satisfies TreeNode;
    })
    .filter((node) => Boolean(node)) as unknown as TreeNode[];

  const resolveEntityId = (
    personId: string | null | undefined,
    familyId: string,
  ): string | null => {
    if (!personId) return null;
    const cluster = clusterLayout.clusters[familyId];
    const scopedEntityId = [...(cluster?.parentEntityIds ?? []), ...(cluster?.childEntityIds ?? [])]
      .find((entityId) => clusterLayout.nodes[entityId]?.personId === personId);
    if (scopedEntityId) return scopedEntityId;

    return canonicalEntityIdByPersonId.get(personId) ?? null;
  };

  const links = edgeEntities
    .map((edge) => {
      const familyId = edge.metadata.familyId;
      const cluster = clusterLayout.clusters[familyId];
      const parentIds = cluster?.parentEntityIds ?? [];
      const childIds = cluster?.childEntityIds ?? [];

      let sourceId = resolveEntityId(edge.metadata.sourcePersonId, familyId);
      let targetId = resolveEntityId(edge.metadata.targetPersonId, familyId);

      if (edge.type === 'partner-link') {
        sourceId ??= parentIds[0] ?? childIds[0] ?? null;
        targetId ??= parentIds[1] ?? parentIds[0] ?? childIds[childIds.length - 1] ?? null;
      } else if (edge.type === 'parent-to-family') {
        sourceId ??= parentIds[0] ?? null;
        targetId ??= childIds[0] ?? parentIds.find((id) => id !== sourceId) ?? null;
      } else if (edge.type === 'family-trunk') {
        sourceId ??= parentIds[0] ?? childIds[0] ?? null;
        targetId ??= childIds[0] ?? parentIds[parentIds.length - 1] ?? null;
      } else if (edge.type === 'sibling-bar') {
        sourceId ??= childIds[0] ?? parentIds[0] ?? null;
        targetId ??= childIds[childIds.length - 1] ?? childIds[0] ?? parentIds[parentIds.length - 1] ?? null;
      } else if (edge.type === 'child-drop') {
        sourceId ??= parentIds[0] ?? childIds[0] ?? null;
        targetId ??= childIds.find((id) => id !== sourceId) ?? childIds[0] ?? null;
      }

      if (!sourceId || !targetId) {
        return null;
      }

      return {
        source: sourceId,
        target: targetId,
        type: edge.type === 'partner-link' ? 'marriage' : 'parent-child',
        pathData: edge.pathData,
      };
    })
    .filter((link) => Boolean(link)) as unknown as TreeLink[];

  const fallbackLayout = calculateFocusLayout(focusId, people, settings, collapsedIds);

  return { nodes, links, collapsePoints: fallbackLayout.collapsePoints };
}
