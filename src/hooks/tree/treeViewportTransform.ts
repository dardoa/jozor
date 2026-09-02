import type { FanArc, TreeNode } from '../../types';

export type TreeViewportMode = 'focus' | 'fit';

export interface TreeCanvasBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface TreeViewportTransform {
  scale: number;
  x: number;
  y: number;
}

interface TreeViewportTransformRequest {
  mode: TreeViewportMode;
  viewportWidth: number;
  viewportHeight: number;
  viewportOffsetY?: number;
  focusId: string;
  nodes: TreeNode[];
  fanArcs: FanArc[];
  isFanChart: boolean;
  isForce: boolean;
  nodeWidth: number;
  nodeHeight: number;
}

const VIEWPORT_PADDING = 32;
const CONTENT_PADDING = 48;
const MIN_ZOOM = 0.05;
const MAX_FIT_ZOOM = 1.2;

export const getTreeContentBounds = ({
  nodes,
  fanArcs,
  isFanChart,
  nodeWidth,
  nodeHeight,
}: Pick<
  TreeViewportTransformRequest,
  'nodes' | 'fanArcs' | 'isFanChart' | 'nodeWidth' | 'nodeHeight'
>): TreeCanvasBounds | null => {
  if (isFanChart) {
    const outerRadius = fanArcs.reduce(
      (largestRadius, fanArc) => Math.max(largestRadius, fanArc.outerRadius),
      0,
    );
    if (outerRadius <= 0) return null;

    const paddedRadius = outerRadius + CONTENT_PADDING;
    return {
      minX: -paddedRadius,
      minY: -paddedRadius,
      maxX: paddedRadius,
      maxY: paddedRadius,
    };
  }

  if (nodes.length === 0) return null;

  const halfNodeWidth = nodeWidth / 2;
  const halfNodeHeight = nodeHeight / 2;
  return nodes.reduce<TreeCanvasBounds>(
    (bounds, node) => ({
      minX: Math.min(bounds.minX, node.x - halfNodeWidth - CONTENT_PADDING),
      minY: Math.min(bounds.minY, node.y - halfNodeHeight - CONTENT_PADDING),
      maxX: Math.max(bounds.maxX, node.x + halfNodeWidth + CONTENT_PADDING),
      maxY: Math.max(bounds.maxY, node.y + halfNodeHeight + CONTENT_PADDING),
    }),
    {
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY,
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
    },
  );
};

const fitBoundsToViewport = (
  bounds: TreeCanvasBounds,
  viewportWidth: number,
  viewportHeight: number,
  viewportOffsetY: number,
): TreeViewportTransform => {
  const contentWidth = Math.max(1, bounds.maxX - bounds.minX);
  const contentHeight = Math.max(1, bounds.maxY - bounds.minY);
  const availableWidth = Math.max(1, viewportWidth - VIEWPORT_PADDING * 2);
  const availableHeight = Math.max(
    1,
    viewportHeight - VIEWPORT_PADDING * 2 - Math.abs(viewportOffsetY),
  );
  const scale = Math.max(
    MIN_ZOOM,
    Math.min(availableWidth / contentWidth, availableHeight / contentHeight, MAX_FIT_ZOOM),
  );
  const contentCenterX = (bounds.minX + bounds.maxX) / 2;
  const contentCenterY = (bounds.minY + bounds.maxY) / 2;

  return {
    scale,
    x: viewportWidth / 2 - contentCenterX * scale,
    y: viewportHeight / 2 + viewportOffsetY - contentCenterY * scale,
  };
};

export const calculateTreeViewportTransform = ({
  mode,
  viewportWidth,
  viewportHeight,
  viewportOffsetY = 0,
  focusId,
  nodes,
  fanArcs,
  isFanChart,
  isForce,
  nodeWidth,
  nodeHeight,
}: TreeViewportTransformRequest): TreeViewportTransform | null => {
  if (viewportWidth <= 0 || viewportHeight <= 0) return null;

  if (mode === 'fit') {
    const bounds = getTreeContentBounds({
      nodes,
      fanArcs,
      isFanChart,
      nodeWidth,
      nodeHeight,
    });
    return bounds
      ? fitBoundsToViewport(bounds, viewportWidth, viewportHeight, viewportOffsetY)
      : null;
  }

  if (isFanChart || isForce) {
    return {
      scale: isForce ? 0.6 : 0.8,
      x: viewportWidth / 2,
      y: viewportHeight / 2 + viewportOffsetY,
    };
  }

  const focusNode = nodes.find(node => node.id === focusId) ?? nodes[0];
  if (!focusNode) return null;

  const scale = 0.85;
  return {
    scale,
    x: viewportWidth / 2 - focusNode.x * scale,
    y: viewportHeight / 2 + viewportOffsetY - focusNode.y * scale,
  };
};
