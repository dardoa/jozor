/**
 * radialLayout.ts
 *
 * Calculates the "Radial Mode" tree layout.
 *
 * Philosophy: A pure function that converts a people map into a set of fan
 * arcs suitable for SVG rendering. Built on d3-hierarchy / d3-partition for
 * stable, well-tested angular math.
 *
 * Output contract:
 *  - Returns `FanArc[]` — the same data structure already consumed by the
 *    existing `FanChart.tsx` renderer, so no renderer changes are needed.
 *  - The root person is placed at the centre (depth 0).
 *  - Each generation ring expands outward by a fixed ring width.
 */

import { hierarchy, partition, type HierarchyNode } from 'd3-hierarchy';
import type { FanArc, Person, TreeSettings } from '../../types';

// ---------------------------------------------------------------------------
// Internal datum type for d3 hierarchy
// ---------------------------------------------------------------------------

interface RadialDatum {
  id: string;
  person: Person;
  children?: RadialDatum[];
}

// ---------------------------------------------------------------------------
// Tree building (simple descendant walk)
// ---------------------------------------------------------------------------

function buildRadialTree(
  rootId: string,
  people: Record<string, Person>,
  depthLimit: number,
  visited: Set<string> = new Set()
): RadialDatum | null {
  const person = people[rootId];
  if (!person || visited.has(rootId)) return null;

  visited.add(rootId);

  const childNodes: RadialDatum[] = [];

  if (depthLimit > 0) {
    for (const childId of person.children ?? []) {
      const childNode = buildRadialTree(childId, people, depthLimit - 1, visited);
      if (childNode) childNodes.push(childNode);
    }
  }

  return {
    id: rootId,
    person,
    children: childNodes.length > 0 ? childNodes : undefined,
  };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CENTER_RADIUS = 80;
const RING_WIDTH = 110;
const FULL_CIRCLE = 2 * Math.PI;

// ---------------------------------------------------------------------------
// Main layout function
// ---------------------------------------------------------------------------

interface D3PartitionNode extends HierarchyNode<RadialDatum> {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * Builds a fully positioned Radial Mode layout.
 *
 * @param rootPersonId - The person displayed at the centre of the chart.
 * @param people - The complete people map from the application store.
 * @param settings - Current TreeSettings for generation limit.
 * @returns An array of FanArc objects ready for SVG rendering by FanChart.tsx.
 */
export function calculateRadialLayout(
  rootPersonId: string,
  people: Record<string, Person>,
  settings: TreeSettings
): FanArc[] {
  if (!people[rootPersonId]) return [];

  const depthLimit = Math.max(1, settings.generationLimit ?? 6);
  const rootDatum = buildRadialTree(rootPersonId, people, depthLimit);
  if (!rootDatum) return [];

  const rootHierarchy = hierarchy<RadialDatum>(rootDatum).count();

  // Use d3.partition to compute angular positions for all nodes
  const radius = CENTER_RADIUS + depthLimit * RING_WIDTH;
  const partitionLayout = partition<RadialDatum>().size([FULL_CIRCLE, radius]);
  partitionLayout(rootHierarchy);

  const arcs: FanArc[] = [];

  rootHierarchy.descendants().forEach((node) => {
    const d = node as D3PartitionNode;

    const innerR =
      d.depth === 0 ? 0 : CENTER_RADIUS + (d.depth - 1) * RING_WIDTH;
    const outerR =
      d.depth === 0 ? CENTER_RADIUS : CENTER_RADIUS + d.depth * RING_WIDTH;

    arcs.push({
      id: `${d.data.id}-${d.depth}-${arcs.length}`,
      person: d.data.person,
      startAngle: d.x0,
      endAngle: d.x1,
      innerRadius: innerR,
      outerRadius: outerR,
      depth: d.depth,
      value: d.value ?? 0,
      hasChildren: !!d.children && d.children.length > 0,
    });
  });

  return arcs;
}
