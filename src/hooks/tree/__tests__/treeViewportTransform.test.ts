import { describe, expect, it } from 'vitest';

import { DEFAULT_PERSON_TEMPLATE } from '../../../constants';
import type { FanArc, TreeNode } from '../../../types';
import {
  calculateTreeViewportTransform,
  getTreeContentBounds,
} from '../treeViewportTransform';

const createNode = (id: string, x: number, y: number): TreeNode => ({
  id,
  x,
  y,
  data: { ...DEFAULT_PERSON_TEMPLATE, id, firstName: id, gender: 'male' },
  type: 'descendant',
});

const createFanArc = (outerRadius: number): FanArc => ({
  id: `arc-${outerRadius}`,
  person: {
    ...DEFAULT_PERSON_TEMPLATE,
    id: `person-${outerRadius}`,
    firstName: 'Root',
    gender: 'male',
  },
  startAngle: 0,
  endAngle: Math.PI * 2,
  innerRadius: 0,
  outerRadius,
  depth: 0,
  value: 1,
  hasChildren: false,
});

const commonRequest = {
  viewportWidth: 1280,
  viewportHeight: 720,
  viewportOffsetY: 0,
  focusId: 'focus',
  fanArcs: [] as FanArc[],
  isFanChart: false,
  isForce: false,
  nodeWidth: 160,
  nodeHeight: 306,
};

describe('tree viewport transforms', () => {
  it('fits asymmetric node bounds using rendered card dimensions', () => {
    const nodes = [
      createNode('focus', -900, -500),
      createNode('right', 1700, 1200),
    ];
    const bounds = getTreeContentBounds({
      nodes,
      fanArcs: [],
      isFanChart: false,
      nodeWidth: 160,
      nodeHeight: 306,
    });
    const transform = calculateTreeViewportTransform({
      ...commonRequest,
      mode: 'fit',
      nodes,
    });

    expect(bounds).toEqual({
      minX: -1028,
      minY: -701,
      maxX: 1828,
      maxY: 1401,
    });
    expect(transform).not.toBeNull();
    expect(transform!.scale).toBeGreaterThanOrEqual(0.05);
    expect(transform!.scale).toBeLessThan(0.5);
  });

  it('derives radial fit from the actual largest arc rather than a fixed radius', () => {
    const compact = calculateTreeViewportTransform({
      ...commonRequest,
      mode: 'fit',
      nodes: [],
      fanArcs: [createFanArc(300)],
      isFanChart: true,
    });
    const deep = calculateTreeViewportTransform({
      ...commonRequest,
      mode: 'fit',
      nodes: [],
      fanArcs: [createFanArc(740)],
      isFanChart: true,
    });

    expect(compact).not.toBeNull();
    expect(deep).not.toBeNull();
    expect(compact!.scale).toBeGreaterThan(deep!.scale);
    expect(compact!.x).toBe(640);
    expect(deep!.y).toBe(360);
  });

  it('keeps reset focused and distinct from the all-content fit transform', () => {
    const nodes = [createNode('focus', 400, 300), createNode('far', 4000, 3000)];
    const reset = calculateTreeViewportTransform({
      ...commonRequest,
      mode: 'focus',
      nodes,
    });
    const fit = calculateTreeViewportTransform({
      ...commonRequest,
      mode: 'fit',
      nodes,
    });

    expect(reset).toEqual({ scale: 0.85, x: 300, y: 105 });
    expect(fit).not.toBeNull();
    expect(fit!.scale).toBeLessThan(reset!.scale);
    expect(fit).not.toEqual(reset);
  });

  it('fits a 90-person grid inside a standard desktop viewport', () => {
    const nodes = Array.from({ length: 90 }, (_, index) =>
      createNode(`person-${index}`, (index % 10) * 400, Math.floor(index / 10) * 500),
    );
    const bounds = getTreeContentBounds({
      nodes,
      fanArcs: [],
      isFanChart: false,
      nodeWidth: 160,
      nodeHeight: 306,
    });
    const transform = calculateTreeViewportTransform({
      ...commonRequest,
      mode: 'fit',
      nodes,
    });

    expect(bounds).not.toBeNull();
    expect(transform).not.toBeNull();
    expect(bounds!.minX * transform!.scale + transform!.x).toBeGreaterThanOrEqual(31.9);
    expect(bounds!.maxX * transform!.scale + transform!.x).toBeLessThanOrEqual(1248.1);
    expect(bounds!.minY * transform!.scale + transform!.y).toBeGreaterThanOrEqual(31.9);
    expect(bounds!.maxY * transform!.scale + transform!.y).toBeLessThanOrEqual(688.1);
  });
});
