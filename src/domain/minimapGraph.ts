import type { TreeLink, TreeNode } from '../types';

export interface MinimapNode {
  id: string;
  personId: string;
  x: number;
  y: number;
  isFocus: boolean;
}

export interface MinimapLink {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  sourcePersonId: string;
  targetPersonId: string;
}

export interface MinimapGraph {
  source: 'layout';
  chartType: any;
  focusPersonId: string;
  nodes: MinimapNode[];
  links: MinimapLink[];
}

const sortNodes = (nodes: MinimapNode[]) =>
  [...nodes].sort((a, b) => a.id.localeCompare(b.id));

const sortLinks = (links: MinimapLink[]) =>
  [...links].sort((a, b) => a.id.localeCompare(b.id));

const makeSemanticLinkId = (sourcePersonId: string, targetPersonId: string) =>
  `parent-child:${sourcePersonId}->${targetPersonId}`;

export const buildMinimapGraphFromLayout = ({
  chartType,
  nodes,
  links,
  focusId,
}: {
  chartType: any;
  nodes: TreeNode[];
  links: TreeLink[];
  focusId: string;
}): MinimapGraph => {
  const minimapNodes = nodes.map<MinimapNode>((node) => ({
    id: node.id,
    personId: node.id,
    x: node.x,
    y: node.y,
    isFocus: node.id === focusId,
  }));

  const nodeIds = new Set(minimapNodes.map((node) => node.id));
  const minimapLinks = links
    .map((link) => {
      const sourceNodeId = typeof link.source === 'string' ? link.source : link.source.id;
      const targetNodeId = typeof link.target === 'string' ? link.target : link.target.id;

      if (!nodeIds.has(sourceNodeId) || !nodeIds.has(targetNodeId)) {
        return null;
      }

      return {
        id: makeSemanticLinkId(sourceNodeId, targetNodeId),
        sourceNodeId,
        targetNodeId,
        sourcePersonId: sourceNodeId,
        targetPersonId: targetNodeId,
      } satisfies MinimapLink;
    })
    .filter((link): link is MinimapLink => Boolean(link));

  return {
    source: 'layout',
    chartType,
    focusPersonId: focusId,
    nodes: sortNodes(minimapNodes),
    links: sortLinks(minimapLinks),
  };
};
