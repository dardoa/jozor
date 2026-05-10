import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Person } from '../../types';
import {
  V3_CARD_CLEARANCE,
  V3_HALF_CARD_W,
  V3_HALF_VISUAL_CARD_H,
  V3_PARTNER_GAP,
} from '../../utils/layout/constants';
import { buildFamilyGraph } from '../familyGraph';
import {
  buildFamilyGraphClusterLayout,
  generateClusterLayoutEdges,
  type ClusterLayoutNode,
} from '../familyGraphClusterLayout';
import { buildLayoutSemanticsSnapshot } from '../familyGraphSemantics';

const REAL_TREE_PATH = 'C:/Users/dardoa/Desktop/tree.json';
const MIN_VISIBLE_GAP = 12;
const MAX_REASONABLE_ROW_GAP = 900;
const MAX_REASONABLE_CLUSTER_GAP = 1100;
const MAX_WIDTH_PER_NODE = 380;

interface TreeJsonPayload {
  people?: Record<string, Person>;
}

interface VisualIssue {
  focusId: string;
  type: string;
  details: Record<string, unknown>;
}

function loadRealTreePeople(): Record<string, Person> {
  const raw = JSON.parse(readFileSync(REAL_TREE_PATH, 'utf8')) as TreeJsonPayload | Record<string, Person>;
  return 'people' in raw && raw.people ? raw.people : raw as Record<string, Person>;
}

function boxesOverlap(a: ClusterLayoutNode, b: ClusterLayoutNode): boolean {
  return Math.abs(a.x - b.x) < (V3_HALF_CARD_W * 2 + MIN_VISIBLE_GAP)
    && Math.abs(a.y - b.y) < (V3_HALF_VISUAL_CARD_H * 2 + MIN_VISIBLE_GAP);
}

describe.skip('real tree visual invariants', () => {
  it('keeps cards, couples, family dots, and child bands visually coherent', () => {
    const people = loadRealTreePeople();
    const graph = buildFamilyGraph(people);
    const focusIds = Object.values(people)
      .filter((person) => (person.children?.length ?? 0) > 0 || (person.spouses?.length ?? 0) > 1)
      .map((person) => person.id);
    const issues: VisualIssue[] = [];

    focusIds.forEach((focusId) => {
      const semantics = buildLayoutSemanticsSnapshot(graph, focusId, people);
      const layout = buildFamilyGraphClusterLayout(graph, semantics, focusId, people);
      const nodes = Object.values(layout.nodes);
      const edges = generateClusterLayoutEdges(layout);
      const xs = nodes.map((node) => node.x);
      const layoutWidth = xs.length > 0 ? Math.max(...xs) - Math.min(...xs) : 0;

      if (nodes.length > 0 && layoutWidth > nodes.length * MAX_WIDTH_PER_NODE) {
        issues.push({
          focusId,
          type: 'excessive-layout-width',
          details: {
            nodeCount: nodes.length,
            width: Math.round(layoutWidth),
            allowed: nodes.length * MAX_WIDTH_PER_NODE,
          },
        });
      }

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const first = nodes[i];
          const second = nodes[j];
          if (first.personId === second.personId) continue;
          if (!boxesOverlap(first, second)) continue;
          issues.push({
            focusId,
            type: 'card-overlap',
            details: {
              first: first.entityId,
              second: second.entityId,
              dx: Math.round(Math.abs(first.x - second.x)),
              dy: Math.round(Math.abs(first.y - second.y)),
            },
          });
        }
      }

      const nodesByGeneration = new Map<number, ClusterLayoutNode[]>();
      nodes.forEach((node) => {
        const row = nodesByGeneration.get(node.generation) ?? [];
        row.push(node);
        nodesByGeneration.set(node.generation, row);
      });

      nodesByGeneration.forEach((rowNodes, generation) => {
        const sorted = [...rowNodes].sort((left, right) => left.x - right.x);
        for (let index = 1; index < sorted.length; index += 1) {
          const gap = sorted[index].x - sorted[index - 1].x;
          if (gap <= MAX_REASONABLE_ROW_GAP) continue;
          issues.push({
            focusId,
            type: 'excessive-row-gap',
            details: {
              generation,
              left: sorted[index - 1].entityId,
              right: sorted[index].entityId,
              gap: Math.round(gap),
            },
          });
        }
      });

      const clustersByGeneration = new Map<number, Array<typeof layout.clusters[string]>>();
      Object.values(layout.clusters).forEach((cluster) => {
        const row = clustersByGeneration.get(cluster.generation) ?? [];
        row.push(cluster);
        clustersByGeneration.set(cluster.generation, row);
      });

      clustersByGeneration.forEach((rowClusters, generation) => {
        const sorted = [...rowClusters].sort((left, right) => left.bounds.left - right.bounds.left);
        for (let index = 1; index < sorted.length; index += 1) {
          const gap = sorted[index].bounds.left - sorted[index - 1].bounds.right;
          if (gap <= MAX_REASONABLE_CLUSTER_GAP) continue;
          issues.push({
            focusId,
            type: 'excessive-cluster-gap',
            details: {
              generation,
              leftFamilyId: sorted[index - 1].familyId,
              rightFamilyId: sorted[index].familyId,
              gap: Math.round(gap),
            },
          });
        }
      });

      Object.values(layout.clusters).forEach((cluster) => {
        const parents = cluster.parentEntityIds.map((entityId) => layout.nodes[entityId]).filter(Boolean);
        const children = cluster.childEntityIds.map((entityId) => layout.nodes[entityId]).filter(Boolean);

        if (parents.length === 2) {
          const [firstParent, secondParent] = parents;
          const distance = Math.abs(firstParent.x - secondParent.x);
          if (Math.abs(distance - V3_PARTNER_GAP) > 0.01) {
            issues.push({
              focusId,
              type: 'spouse-distance-drift',
              details: { familyId: cluster.familyId, distance },
            });
          }

          const expectedMarriageX = (firstParent.x + secondParent.x) / 2;
          const expectedMarriageY = firstParent.y;
          if (
            Math.abs(cluster.marriagePoint.x - expectedMarriageX) > 0.01
            || Math.abs(cluster.marriagePoint.y - expectedMarriageY) > 0.01
          ) {
            issues.push({
              focusId,
              type: 'floating-family-dot',
              details: {
                familyId: cluster.familyId,
                actualX: cluster.marriagePoint.x,
                expectedX: expectedMarriageX,
                actualY: cluster.marriagePoint.y,
                expectedY: expectedMarriageY,
              },
            });
          }
        }

        children.forEach((child) => {
          if (child.y <= cluster.childBandCenter.y + V3_HALF_VISUAL_CARD_H + V3_CARD_CLEARANCE) {
            issues.push({
              focusId,
              type: 'child-not-below-family',
              details: {
                familyId: cluster.familyId,
                child: child.entityId,
                childY: child.y,
                childBandY: cluster.childBandCenter.y,
              },
            });
          }
        });

        const childDrops = edges.filter((edge) => (
          edge.type === 'child-drop' && edge.metadata.familyId === cluster.familyId
        ));
        if (childDrops.length !== children.length) {
          issues.push({
            focusId,
            type: 'child-drop-count-mismatch',
            details: {
              familyId: cluster.familyId,
              childCount: children.length,
              dropCount: childDrops.length,
            },
          });
        }
      });
    });

    expect(issues.slice(0, 30)).toEqual([]);
  });
});
