import * as d3 from 'd3';
import { Person, FanArc, TreeNode, TreeLink } from '../types';

interface FanChartDatum {
  id: string;
  person: Person;
  depth: number;
  children?: FanChartDatum[];
}

interface D3PartitionArcDatum extends d3.HierarchyNode<FanChartDatum> {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  value: number;
}

/**
 * Calculates the layout for the Fan Chart visualization.
 * Uses d3.partition to generate arc paths for ancestor visualization.
 */
export const calculateFanChartLayout = (
  people: Record<string, Person>,
  focusId: string
): FanArc[] => {
  const depthLimit = 6;

  // Recursive function to build ancestry tree
  // Recursive function to build ancestry tree with placeholders for missing data
  const buildAncestry = (id: string | undefined, depth: number): FanChartDatum | null => {
    if (depth > depthLimit) return null;

    const p = id ? people[id] : null;
    const node: FanChartDatum = {
      id: id || `placeholder-${depth}-${Math.random()}`,
      person: p || {
        id: '',
        firstName: 'Unknown',
        lastName: '',
        gender: depth === 0 ? 'male' : (Math.random() > 0.5 ? 'male' : 'female'),
        parents: [],
        spouses: [],
        children: [],
      } as any,
      depth
    };

    if (depth < depthLimit) {
      const fatherId = p?.parents.find((pid) => people[pid]?.gender === 'male');
      const motherId = p?.parents.find((pid) => people[pid]?.gender === 'female');

      // Always add two children slots for symmetry, even if empty
      const fNode = buildAncestry(fatherId, depth + 1);
      const mNode = buildAncestry(motherId, depth + 1);

      node.children = [];
      if (fNode) node.children.push(fNode);
      if (mNode) node.children.push(mNode);
    }

    return node;
  };

  const rootData = buildAncestry(focusId, 0);
  if (!rootData) return [];

  const hierarchy = d3.hierarchy<FanChartDatum>(rootData).count();

  const radius = 900;
  const partition = d3.partition<FanChartDatum>().size([2 * Math.PI, radius]);
  partition(hierarchy);

  const arcs: FanArc[] = [];
  const centerRadius = 80;
  const ringWidth = 100;

  hierarchy.descendants().forEach((d: d3.HierarchyNode<FanChartDatum>) => {
    const partitionDatum = d as D3PartitionArcDatum;
    const innerR =
      partitionDatum.depth === 0 ? 0 : centerRadius + (partitionDatum.depth - 1) * ringWidth;
    const outerR =
      partitionDatum.depth === 0 ? centerRadius : centerRadius + partitionDatum.depth * ringWidth;

    arcs.push({
      id: partitionDatum.data.id,
      person: partitionDatum.data.person,
      startAngle: isNaN(partitionDatum.x0) ? 0 : partitionDatum.x0,
      endAngle: isNaN(partitionDatum.x1) ? 0 : partitionDatum.x1,
      innerRadius: isNaN(innerR) ? 0 : innerR,
      outerRadius: isNaN(outerR) ? 0 : outerR,
      depth: partitionDatum.depth,
      value: partitionDatum.value || 0,
      hasChildren: !!partitionDatum.children && partitionDatum.children.length > 0,
    });
  });

  return arcs.filter(a => !isNaN(a.startAngle) && !isNaN(a.endAngle));
};

/**
 * Prepares nodes and links for the Force Graph visualization.
 */
export const calculateForceLayout = (
  people: Record<string, Person>
): { nodes: TreeNode[]; links: TreeLink[] } => {
  const forceNodes: TreeNode[] = [];
  const forceLinks: TreeLink[] = [];
  const processedLinkPairs = new Set<string>();

  Object.values(people).forEach((p: Person) => {
    // Give nodes initial random positions to prevent "explosion" from 0,0
    forceNodes.push({
      id: p.id,
      x: (Math.random() - 0.5) * 500,
      y: (Math.random() - 0.5) * 500,
      data: p,
      type: 'descendant'
    });

    p.parents.forEach((pid) => {
      if (people[pid]) forceLinks.push({ source: pid, target: p.id, type: 'parent-child' });
    });

    p.spouses.forEach((sid) => {
      // Ensure spouse links are added only once per pair to prevent duplicates
      const pairKey = [p.id, sid].sort().join('-');
      if (people[sid] && !processedLinkPairs.has(pairKey)) {
        forceLinks.push({ source: p.id, target: sid, type: 'marriage' });
        processedLinkPairs.add(pairKey);
      }
    });
  });

  return { nodes: forceNodes, links: forceLinks };
};
