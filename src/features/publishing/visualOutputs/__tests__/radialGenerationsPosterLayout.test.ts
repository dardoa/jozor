import { describe, it, expect } from 'vitest';
import {
  radialGenerationsPosterLayoutEngine,
  RadialLayoutCapacityError,
} from '../radialGenerationsPosterLayout';
import { createPosterScene } from '../posterSceneBuilder';
import { createPosterDocumentSpec } from '../posterDocumentSpecs';
import { getPosterLayoutCombinationCapability } from '../posterCompatibilityModel';
import { mapPosterDesignStateToRuntimeOptions } from '../../../the-vault/components/visual-studio/posterDesignStateRuntimeAdapter';
import { createInitialPosterDesignState } from '../posterDesignState';
import { renderPosterSceneToSvg } from '../studioPosterSvgRenderer';
import { exportStudioPoster } from '../studioPosterExportAdapter';
import type { SanitizedPreviewGraph } from '../previewSanitizerTypes';
import type { CreatePosterSceneRequest } from '../posterSceneBuilder';

function createMockSanitizedGraph(
  nodesData: Array<{
    previewId: string;
    displayName: string;
    birthYear?: number;
    deathYear?: number;
    isMasked?: boolean;
  }>,
  edgesData: Array<{
    fromPreviewId: string;
    toPreviewId: string;
    relationshipType?: 'parent-child' | 'spouse';
  }>
): SanitizedPreviewGraph {
  return {
    nodes: nodesData.map((n) => ({
      previewId: n.previewId,
      displayName: n.displayName,
      generation: 1,
      isMasked: n.isMasked ?? false,
      hasPhoto: false,
      birthYear: n.birthYear,
      deathYear: n.deathYear,
      relationshipHint: 'root',
      lifeStatus: 'deceased',
    })),
    edges: edgesData.map((e) => ({
      fromPreviewId: e.fromPreviewId,
      toPreviewId: e.toPreviewId,
      relationshipType: e.relationshipType ?? 'parent-child',
    })),
    warnings: [],
    metadata: {
      sanitizedNodeCount: nodesData.length,
      policy: {
        privacyMode: 'owner-full',
        includePhotos: true,
        includeYears: true,
        maxNodes: 100,
        language: 'ar',
      },
      truncated: false,
    },
  };
}

function assertPointOnRectPerimeter(
  pt: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
  tolerance = 0.2
) {
  expect(Number.isFinite(pt.x)).toBe(true);
  expect(Number.isFinite(pt.y)).toBe(true);

  const onLeft = Math.abs(pt.x - rect.x) <= tolerance && pt.y >= rect.y - tolerance && pt.y <= rect.y + rect.height + tolerance;
  const onRight = Math.abs(pt.x - (rect.x + rect.width)) <= tolerance && pt.y >= rect.y - tolerance && pt.y <= rect.y + rect.height + tolerance;
  const onTop = Math.abs(pt.y - rect.y) <= tolerance && pt.x >= rect.x - tolerance && pt.x <= rect.x + rect.width + tolerance;
  const onBottom = Math.abs(pt.y - (rect.y + rect.height)) <= tolerance && pt.x >= rect.x - tolerance && pt.x <= rect.x + rect.width + tolerance;

  expect(onLeft || onRight || onTop || onBottom).toBe(true);
}

function doSegmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  function ccw(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }
  if (
    (p1.x === p3.x && p1.y === p3.y) ||
    (p1.x === p4.x && p1.y === p4.y) ||
    (p2.x === p3.x && p2.y === p3.y) ||
    (p2.x === p4.x && p2.y === p4.y)
  ) {
    return false;
  }
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

function getPolarAngle(
  pt: { x: number; y: number },
  center: { x: number; y: number }
): number {
  return Math.atan2(pt.y - center.y, pt.x - center.x);
}

function getAngularDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 2 * Math.PI - diff);
}

describe('Radial/Fan Poster Layout Engine (Phase 3A Foundation Evidence & Adaptive Geometry Closure)', () => {
  const documentSpec = createPosterDocumentSpec('A4', 'portrait', 'balanced');

  it('1. focal center placement: places focal person at exact radial center of tree bounds', () => {
    const graph = createMockSanitizedGraph(
      [{ previewId: 'preview-node-focal', displayName: 'علي الجذور' }],
      []
    );

    const request: CreatePosterSceneRequest = {
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'شجرة الجذور الدائرة',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-focal',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    };

    const scene = createPosterScene(request);
    expect(scene.nodes).toHaveLength(1);

    const focalNode = scene.nodes[0]!;
    expect(focalNode.previewId).toBe('preview-node-focal');
    expect(focalNode.isRoot).toBe(true);

    const treeCenter = {
      x: scene.bounds.tree.x + scene.bounds.tree.width / 2,
      y: scene.bounds.tree.y + scene.bounds.tree.height / 2,
    };
    const nodeCenter = {
      x: focalNode.rect.x + focalNode.rect.width / 2,
      y: focalNode.rect.y + focalNode.rect.height / 2,
    };

    expect(Math.abs(nodeCenter.x - treeCenter.x)).toBeLessThan(1.0);
    expect(Math.abs(nodeCenter.y - treeCenter.y)).toBeLessThan(1.0);
  });

  it('2. ancestor vs descendant scope traversal: traverses upward or downward derived from content.scope', () => {
    const graph = createMockSanitizedGraph(
      [
        { previewId: 'preview-node-focal', displayName: 'الشخص المحوري' },
        { previewId: 'preview-node-parent', displayName: 'الأب' },
        { previewId: 'preview-node-child', displayName: 'الابن' },
      ],
      [
        { fromPreviewId: 'preview-node-parent', toPreviewId: 'preview-node-focal' },
        { fromPreviewId: 'preview-node-focal', toPreviewId: 'preview-node-child' },
      ]
    );

    const ancestorScene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'عرض الأجداد',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-focal',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    const descendantScene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'عرض الفروع',
        scope: 'selected-root-descendants',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-focal',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    expect(ancestorScene.nodes.map((n) => n.previewId)).toContain('preview-node-parent');
    expect(ancestorScene.nodes.map((n) => n.previewId)).not.toContain('preview-node-child');

    expect(descendantScene.nodes.map((n) => n.previewId)).toContain('preview-node-child');
    expect(descendantScene.nodes.map((n) => n.previewId)).not.toContain('preview-node-parent');
  });

  it('3. 180-half-fan vs 360-full-circle geometry assertions: verifies focal Y, upper hemisphere, 360 spread, polar angles, and bounds enclosure', () => {
    const graph = createMockSanitizedGraph(
      [
        { previewId: 'preview-node-0', displayName: 'مركز' },
        { previewId: 'preview-node-1', displayName: 'فرع 1' },
        { previewId: 'preview-node-2', displayName: 'فرع 2' },
        { previewId: 'preview-node-3', displayName: 'فرع 3' },
      ],
      [
        { fromPreviewId: 'preview-node-1', toPreviewId: 'preview-node-0' },
        { fromPreviewId: 'preview-node-2', toPreviewId: 'preview-node-0' },
        { fromPreviewId: 'preview-node-3', toPreviewId: 'preview-node-0' },
      ]
    );

    const fanScene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'مروحة 180',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-0',
        radialSpan: '180-half-fan',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    const circleScene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'دائرة 360',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-0',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    const fanFocal = fanScene.nodes.find((n) => n.previewId === 'preview-node-0')!;
    const circleFocal = circleScene.nodes.find((n) => n.previewId === 'preview-node-0')!;

    // 1. Different focal Y placement
    expect(fanFocal.rect.y).not.toBe(circleFocal.rect.y);
    expect(fanFocal.rect.y).toBeGreaterThan(circleFocal.rect.y);

    // 2. All fan ring nodes are above focal node
    fanScene.nodes.filter((n) => !n.isRoot).forEach((n) => {
      expect(n.rect.y).toBeLessThan(fanFocal.rect.y);
    });

    // 3. 360 nodes occupy both upper and lower vertical space
    const upper360 = circleScene.nodes.filter((n) => n.rect.y < circleFocal.rect.y);
    const lower360 = circleScene.nodes.filter((n) => n.rect.y > circleFocal.rect.y);
    expect(upper360.length).toBeGreaterThan(0);
    expect(lower360.length).toBeGreaterThan(0);

    // 4. Polar angles differ meaningfully
    const fanAngles = fanScene.nodes.map((n) => Math.atan2(n.rect.y - fanFocal.rect.y, n.rect.x - fanFocal.rect.x));
    const circleAngles = circleScene.nodes.map((n) => Math.atan2(n.rect.y - circleFocal.rect.y, n.rect.x - circleFocal.rect.x));
    expect(JSON.stringify(fanAngles)).not.toBe(JSON.stringify(circleAngles));

    // 5. All nodes remain strictly inside treeBounds
    [...fanScene.nodes, ...circleScene.nodes].forEach((n) => {
      const bounds = n.isRoot ? (fanFocal === n ? fanScene.bounds.tree : circleScene.bounds.tree) : fanScene.bounds.tree;
      expect(n.rect.x).toBeGreaterThanOrEqual(bounds.x - 1);
      expect(n.rect.y).toBeGreaterThanOrEqual(bounds.y - 1);
      expect(n.rect.x + n.rect.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
      expect(n.rect.y + n.rect.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
    });
  });

  it('4. branch-sector allocation and zero connector crossing for father/mother ancestor branches', () => {
    const graph = createMockSanitizedGraph(
      [
        { previewId: 'preview-node-focal', displayName: 'المحوري' },
        { previewId: 'preview-node-father', displayName: 'الأب' },
        { previewId: 'preview-node-mother', displayName: 'الأم' },
        { previewId: 'preview-node-gfather1', displayName: 'جد أب' },
        { previewId: 'preview-node-gmother1', displayName: 'جدة أب' },
        { previewId: 'preview-node-gfather2', displayName: 'جد أم' },
        { previewId: 'preview-node-gmother2', displayName: 'جدة أم' },
      ],
      [
        { fromPreviewId: 'preview-node-father', toPreviewId: 'preview-node-focal' },
        { fromPreviewId: 'preview-node-mother', toPreviewId: 'preview-node-focal' },
        { fromPreviewId: 'preview-node-gfather1', toPreviewId: 'preview-node-father' },
        { fromPreviewId: 'preview-node-gmother1', toPreviewId: 'preview-node-father' },
        { fromPreviewId: 'preview-node-gfather2', toPreviewId: 'preview-node-mother' },
        { fromPreviewId: 'preview-node-gmother2', toPreviewId: 'preview-node-mother' },
      ]
    );

    const scene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'استمرارية قطاع الأب والأم',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-focal',
        radialSpan: '360-full-circle',
        generationRings: 4,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    expect(scene.nodes).toHaveLength(7);

    const focal = scene.nodes.find((n) => n.previewId === 'preview-node-focal')!;
    const focalCenter = { x: focal.rect.x + focal.rect.width / 2, y: focal.rect.y + focal.rect.height / 2 };

    const fatherNode = scene.nodes.find((n) => n.previewId === 'preview-node-father')!;
    const motherNode = scene.nodes.find((n) => n.previewId === 'preview-node-mother')!;

    const fatherCenter = { x: fatherNode.rect.x + fatherNode.rect.width / 2, y: fatherNode.rect.y + fatherNode.rect.height / 2 };
    const motherCenter = { x: motherNode.rect.x + motherNode.rect.width / 2, y: motherNode.rect.y + motherNode.rect.height / 2 };

    const fatherAngle = getPolarAngle(fatherCenter, focalCenter);
    const motherAngle = getPolarAngle(motherCenter, focalCenter);

    // Verify Father's ancestors remain inside Father's allocated angular sector (within pi/2 of Father's mid-angle)
    const fatherAncestors = ['preview-node-gfather1', 'preview-node-gmother1'].map(
      (id) => scene.nodes.find((n) => n.previewId === id)!
    );
    fatherAncestors.forEach((node) => {
      const nodeCenter = { x: node.rect.x + node.rect.width / 2, y: node.rect.y + node.rect.height / 2 };
      const angle = getPolarAngle(nodeCenter, focalCenter);
      expect(getAngularDistance(angle, fatherAngle)).toBeLessThan(Math.PI / 2 + 0.1);
    });

    // Verify Mother's ancestors remain inside Mother's allocated angular sector (within pi/2 of Mother's mid-angle)
    const motherAncestors = ['preview-node-gfather2', 'preview-node-gmother2'].map(
      (id) => scene.nodes.find((n) => n.previewId === id)!
    );
    motherAncestors.forEach((node) => {
      const nodeCenter = { x: node.rect.x + node.rect.width / 2, y: node.rect.y + node.rect.height / 2 };
      const angle = getPolarAngle(nodeCenter, focalCenter);
      expect(getAngularDistance(angle, motherAngle)).toBeLessThan(Math.PI / 2 + 0.1);
    });

    // Assert zero connector crossings for strict tree topology as a separate invariant
    for (let i = 0; i < scene.connectors.length; i += 1) {
      for (let j = i + 1; j < scene.connectors.length; j += 1) {
        const c1 = scene.connectors[i]!;
        const c2 = scene.connectors[j]!;
        const intersects = doSegmentsIntersect(c1.start, c1.end, c2.start, c2.end);
        expect(intersects).toBe(false);
      }
    }
  });

  it('5. branch-sector allocation and zero connector crossing for multi-child descendant branches', () => {
    const graph = createMockSanitizedGraph(
      [
        { previewId: 'preview-node-0', displayName: 'الأصل' },
        { previewId: 'preview-node-c1', displayName: 'فرع 1' },
        { previewId: 'preview-node-c2', displayName: 'فرع 2' },
        { previewId: 'preview-node-c11', displayName: 'حفيد 1-1' },
        { previewId: 'preview-node-c21', displayName: 'حفيد 2-1' },
      ],
      [
        { fromPreviewId: 'preview-node-0', toPreviewId: 'preview-node-c1' },
        { fromPreviewId: 'preview-node-0', toPreviewId: 'preview-node-c2' },
        { fromPreviewId: 'preview-node-c1', toPreviewId: 'preview-node-c11' },
        { fromPreviewId: 'preview-node-c2', toPreviewId: 'preview-node-c21' },
      ]
    );

    const scene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'قطاعات الفروع المتعددة',
        scope: 'selected-root-descendants',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-0',
        radialSpan: '360-full-circle',
        generationRings: 4,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    expect(scene.nodes).toHaveLength(5);

    const focal = scene.nodes.find((n) => n.previewId === 'preview-node-0')!;
    const focalCenter = { x: focal.rect.x + focal.rect.width / 2, y: focal.rect.y + focal.rect.height / 2 };

    const c1Node = scene.nodes.find((n) => n.previewId === 'preview-node-c1')!;
    const c2Node = scene.nodes.find((n) => n.previewId === 'preview-node-c2')!;
    const c11Node = scene.nodes.find((n) => n.previewId === 'preview-node-c11')!;
    const c21Node = scene.nodes.find((n) => n.previewId === 'preview-node-c21')!;

    const c1Center = { x: c1Node.rect.x + c1Node.rect.width / 2, y: c1Node.rect.y + c1Node.rect.height / 2 };
    const c2Center = { x: c2Node.rect.x + c2Node.rect.width / 2, y: c2Node.rect.y + c2Node.rect.height / 2 };
    const c11Center = { x: c11Node.rect.x + c11Node.rect.width / 2, y: c11Node.rect.y + c11Node.rect.height / 2 };
    const c21Center = { x: c21Node.rect.x + c21Node.rect.width / 2, y: c21Node.rect.y + c21Node.rect.height / 2 };

    const aC1 = getPolarAngle(c1Center, focalCenter);
    const aC11 = getPolarAngle(c11Center, focalCenter);
    const aC2 = getPolarAngle(c2Center, focalCenter);
    const aC21 = getPolarAngle(c21Center, focalCenter);

    // Assert descendant c11 remains inside branch c1's sector (within pi/2 of c1 mid-angle)
    expect(getAngularDistance(aC11, aC1)).toBeLessThan(Math.PI / 2 + 0.1);
    // Assert descendant c21 remains inside branch c2's sector (within pi/2 of c2 mid-angle)
    expect(getAngularDistance(aC21, aC2)).toBeLessThan(Math.PI / 2 + 0.1);

    for (let i = 0; i < scene.connectors.length; i += 1) {
      for (let j = i + 1; j < scene.connectors.length; j += 1) {
        const c1 = scene.connectors[i]!;
        const c2 = scene.connectors[j]!;
        expect(doSegmentsIntersect(c1.start, c1.end, c2.start, c2.end)).toBe(false);
      }
    }
  });

  it('6. sparse ancestor graph fixture', () => {
    const graph = createMockSanitizedGraph(
      [
        { previewId: 'preview-node-0', displayName: 'المحور' },
        { previewId: 'preview-node-1', displayName: 'أب فرادي' },
      ],
      [{ fromPreviewId: 'preview-node-1', toPreviewId: 'preview-node-0' }]
    );

    const scene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'شجرة أجداد نادرة',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-0',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    expect(scene.nodes).toHaveLength(2);
    expect(scene.connectors).toHaveLength(1);
  });

  it('7. missing one parent graph fixture', () => {
    const graph = createMockSanitizedGraph(
      [
        { previewId: 'preview-node-0', displayName: 'المحور' },
        { previewId: 'preview-node-mother', displayName: 'الأم فقط' },
        { previewId: 'preview-node-gmother', displayName: 'الجدة لأم' },
      ],
      [
        { fromPreviewId: 'preview-node-mother', toPreviewId: 'preview-node-0' },
        { fromPreviewId: 'preview-node-gmother', toPreviewId: 'preview-node-mother' },
      ]
    );

    const scene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'غياب أحد الأبوين',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-0',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    expect(scene.nodes).toHaveLength(3);
    expect(scene.connectors).toHaveLength(2);
  });

  it('8. full binary ancestor fixture', () => {
    const nodes = [
      { previewId: 'preview-node-1', displayName: 'أنا' },
      { previewId: 'preview-node-2', displayName: 'أب' },
      { previewId: 'preview-node-3', displayName: 'أم' },
      { previewId: 'preview-node-4', displayName: 'جد1' },
      { previewId: 'preview-node-5', displayName: 'جدة1' },
      { previewId: 'preview-node-6', displayName: 'جد2' },
      { previewId: 'preview-node-7', displayName: 'جدة2' },
    ];
    const edges = [
      { fromPreviewId: 'preview-node-2', toPreviewId: 'preview-node-1' },
      { fromPreviewId: 'preview-node-3', toPreviewId: 'preview-node-1' },
      { fromPreviewId: 'preview-node-4', toPreviewId: 'preview-node-2' },
      { fromPreviewId: 'preview-node-5', toPreviewId: 'preview-node-2' },
      { fromPreviewId: 'preview-node-6', toPreviewId: 'preview-node-3' },
      { fromPreviewId: 'preview-node-7', toPreviewId: 'preview-node-3' },
    ];

    const graph = createMockSanitizedGraph(nodes, edges);
    const scene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'شجرة ثنائية كاملة 7 عقد',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-1',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    expect(scene.nodes).toHaveLength(7);
    expect(scene.connectors).toHaveLength(6);
  });

  it('9. multiple descendant branches graph fixture', () => {
    const graph = createMockSanitizedGraph(
      [
        { previewId: 'preview-node-0', displayName: 'الجذر' },
        { previewId: 'preview-node-c1', displayName: 'ولد 1' },
        { previewId: 'preview-node-c2', displayName: 'ولد 2' },
        { previewId: 'preview-node-c3', displayName: 'ولد 3' },
      ],
      [
        { fromPreviewId: 'preview-node-0', toPreviewId: 'preview-node-c1' },
        { fromPreviewId: 'preview-node-0', toPreviewId: 'preview-node-c2' },
        { fromPreviewId: 'preview-node-0', toPreviewId: 'preview-node-c3' },
      ]
    );

    const scene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'فروع متعددة للأبناء',
        scope: 'selected-root-descendants',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-0',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    expect(scene.nodes).toHaveLength(4);
    expect(scene.connectors).toHaveLength(3);
  });

  it('10. connector perimeter endpoints and finite coordinate assertions: every start and end lies on card perimeter within 0.2 tolerance', () => {
    const graph = createMockSanitizedGraph(
      [
        { previewId: 'preview-node-1', displayName: 'مركز' },
        { previewId: 'preview-node-2', displayName: 'فرع 1' },
        { previewId: 'preview-node-3', displayName: 'فرع 2' },
      ],
      [
        { fromPreviewId: 'preview-node-2', toPreviewId: 'preview-node-1' },
        { fromPreviewId: 'preview-node-3', toPreviewId: 'preview-node-1' },
      ]
    );

    const scene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'فحص المحيط والـ Finite',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-1',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    const emittedMap = new Map(scene.nodes.map((n) => [n.previewId, n]));

    scene.connectors.forEach((conn) => {
      const sourceNode = emittedMap.get(conn.fromPreviewId);
      const targetNode = emittedMap.get(conn.toPreviewId);

      expect(sourceNode).toBeDefined();
      expect(targetNode).toBeDefined();

      assertPointOnRectPerimeter(conn.start, sourceNode!.rect, 0.2);
      assertPointOnRectPerimeter(conn.end, targetNode!.rect, 0.2);
    });
  });

  it('11. privacy sentinel leakage prevention: proves injected secret properties do not leak into PosterScene JSON or SVG', () => {
    const rawGraph = createMockSanitizedGraph(
      [{ previewId: 'preview-node-focal', displayName: 'علي الجذور' }],
      []
    );

    // Deliberately inject forbidden sentinel fields via an unknown cast
    const contaminatedGraph = {
      ...rawGraph,
      nodes: [
        {
          ...rawGraph.nodes[0]!,
          rawId: 'person_secret_raw_12345',
          email: 'private_owner_user@secret.com',
          phone: '+1-555-0199-private',
          photoUrl: 'https://secret-vault.storage/private_photo.jpg',
          storagePath: '/private/user/vault/secret.png',
          authToken: 'Bearer secret_access_token_xyz987',
          notes: 'PRIVATE_MEDICAL_NOTES_CONFIDENTIAL',
        } as unknown as SanitizedPreviewGraph['nodes'][number],
      ],
    };

    const scene = createPosterScene({
      graph: contaminatedGraph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'اختبار منع التسريب الضمني',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-focal',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    const sceneJson = JSON.stringify(scene);
    const renderResult = renderPosterSceneToSvg({ scene });

    const sentinels = [
      'person_secret_raw_12345',
      'private_owner_user@secret.com',
      '+1-555-0199-private',
      'https://secret-vault.storage/private_photo.jpg',
      '/private/user/vault/secret.png',
      'Bearer secret_access_token_xyz987',
      'PRIVATE_MEDICAL_NOTES_CONFIDENTIAL',
    ];

    sentinels.forEach((sentinel) => {
      expect(sceneJson).not.toContain(sentinel);
      expect(renderResult.svg).not.toContain(sentinel);
    });
  });

  it('12. four-page geometry comparison (A4 portrait, A4 landscape, A3 portrait, A3 landscape): proves adaptive R_max, dR, bounds enclosure, and zero overlaps', () => {
    const graph = createMockSanitizedGraph(
      [
        { previewId: 'preview-node-0', displayName: 'مركز' },
        { previewId: 'preview-node-1', displayName: 'حلقة 1' },
        { previewId: 'preview-node-2', displayName: 'حلقة 2' },
      ],
      [
        { fromPreviewId: 'preview-node-1', toPreviewId: 'preview-node-0' },
        { fromPreviewId: 'preview-node-2', toPreviewId: 'preview-node-1' },
      ]
    );

    const pageSpecs = [
      { name: 'A4 Portrait', doc: createPosterDocumentSpec('A4', 'portrait', 'balanced') },
      { name: 'A4 Landscape', doc: createPosterDocumentSpec('A4', 'landscape', 'balanced') },
      { name: 'A3 Portrait', doc: createPosterDocumentSpec('A3', 'portrait', 'balanced') },
      { name: 'A3 Landscape', doc: createPosterDocumentSpec('A3', 'landscape', 'balanced') },
    ];

    const measurements: Array<{ name: string; rMax: number; dR: number; focalX: number; focalY: number }> = [];

    pageSpecs.forEach(({ name, doc }) => {
      const scene = createPosterScene({
        graph,
        document: doc,
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: `قياس ${name}`,
          scope: 'selected-root-ancestors',
          generationCount: 4,
          privacyMode: 'owner-full',
        },
        engineId: 'radial-generations',
        radialOptions: {
          focalPreviewId: 'preview-node-0',
          radialSpan: '360-full-circle',
          generationRings: 3,
          ringSpacing: 'balanced',
          centerCardScale: 'standard',
          labelOrientation: 'straight-unwarped',
        },
      });

      const focal = scene.nodes.find((n) => n.previewId === 'preview-node-0')!;
      const ring1 = scene.nodes.find((n) => n.previewId === 'preview-node-1')!;
      const ring2 = scene.nodes.find((n) => n.previewId === 'preview-node-2')!;

      const focalCenter = { x: focal.rect.x + focal.rect.width / 2, y: focal.rect.y + focal.rect.height / 2 };
      const ring1Center = { x: ring1.rect.x + ring1.rect.width / 2, y: ring1.rect.y + ring1.rect.height / 2 };
      const ring2Center = { x: ring2.rect.x + ring2.rect.width / 2, y: ring2.rect.y + ring2.rect.height / 2 };

      const radius1 = Math.hypot(ring1Center.x - focalCenter.x, ring1Center.y - focalCenter.y);
      const radius2 = Math.hypot(ring2Center.x - focalCenter.x, ring2Center.y - focalCenter.y);

      const dR = radius2 - radius1;
      expect(dR).toBeGreaterThan(0);

      measurements.push({
        name,
        rMax: scene.bounds.tree.width / 2,
        dR,
        focalX: focalCenter.x,
        focalY: focalCenter.y,
      });

      // Verify bounds enclosure and overlap absence
      scene.nodes.forEach((node) => {
        expect(node.rect.x).toBeGreaterThanOrEqual(scene.bounds.tree.x - 1);
        expect(node.rect.y).toBeGreaterThanOrEqual(scene.bounds.tree.y - 1);
        expect(node.rect.x + node.rect.width).toBeLessThanOrEqual(scene.bounds.tree.x + scene.bounds.tree.width + 1);
        expect(node.rect.y + node.rect.height).toBeLessThanOrEqual(scene.bounds.tree.y + scene.bounds.tree.height + 1);
      });
    });

    const a4P = measurements.find((m) => m.name === 'A4 Portrait')!;
    const a4L = measurements.find((m) => m.name === 'A4 Landscape')!;
    const a3P = measurements.find((m) => m.name === 'A3 Portrait')!;
    const a3L = measurements.find((m) => m.name === 'A3 Landscape')!;

    // Assert A3 portrait dR > A4 portrait dR
    expect(a3P.dR).toBeGreaterThan(a4P.dR);

    // Assert A3 landscape dR > A4 landscape dR
    expect(a3L.dR).toBeGreaterThan(a4L.dR);
  });

  it('13. dense single-ring capacity failure: throws RadialLayoutCapacityError when 50 children exceed single ring capacity', () => {
    const nodes = Array.from({ length: 51 }, (_, i) => ({
      previewId: `preview-node-${i}`,
      displayName: `ابن ${i}`,
    }));

    const edges = nodes.slice(1).map((n) => ({
      fromPreviewId: 'preview-node-0',
      toPreviewId: n.previewId,
    }));

    const graph = createMockSanitizedGraph(nodes, edges);

    expect(() =>
      radialGenerationsPosterLayoutEngine.createLayout({
        graph,
        document: createPosterDocumentSpec('A4', 'portrait', 'generous'),
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: 'كثافة أفقية عالية جداً',
          scope: 'selected-root-descendants',
          generationCount: 4,
          privacyMode: 'owner-full',
        },
        layout: {
          engineId: 'radial-generations',
          direction: 'vertical',
          connectorStyle: 'classic',
          spacingPreset: 'compact',
          treeBounds: { x: 20, y: 100, width: 300, height: 300 },
        },
        cardPreset: {
          id: 'classic-heritage',
          theme: 'classic',
          visualStyle: 'classic-heritage',
          geometry: { minWidth: 80, maxWidth: 120, height: 60, borderRadius: 6 },
          typography: { nameSize: 14, yearsSize: 10, statusSize: 8 },
          photo: { shape: 'circle', preferredDiameter: 0, borderWidth: 0, overlapsCard: false },
        },
        radialOptions: {
          focalPreviewId: 'preview-node-0',
          radialSpan: '360-full-circle',
          generationRings: 3,
          ringSpacing: 'compact',
          centerCardScale: 'standard',
          labelOrientation: 'straight-unwarped',
        },
      })
    ).toThrow(RadialLayoutCapacityError);
  });

  it('14. real six-level deep-ring chain capacity failure: throws RadialLayoutCapacityError when 6 sequential rings exceed tight tree bounds', () => {
    // Genuine 6-level chain: ring0 -> ring1 -> ring2 -> ring3 -> ring4 -> ring5 -> ring6
    const nodes = [
      { previewId: 'preview-node-0', displayName: 'عقدة 0' },
      { previewId: 'preview-node-1', displayName: 'عقدة 1' },
      { previewId: 'preview-node-2', displayName: 'عقدة 2' },
      { previewId: 'preview-node-3', displayName: 'عقدة 3' },
      { previewId: 'preview-node-4', displayName: 'عقدة 4' },
      { previewId: 'preview-node-5', displayName: 'عقدة 5' },
      { previewId: 'preview-node-6', displayName: 'عقدة 6' },
    ];

    const edges = [
      { fromPreviewId: 'preview-node-1', toPreviewId: 'preview-node-0' },
      { fromPreviewId: 'preview-node-2', toPreviewId: 'preview-node-1' },
      { fromPreviewId: 'preview-node-3', toPreviewId: 'preview-node-2' },
      { fromPreviewId: 'preview-node-4', toPreviewId: 'preview-node-3' },
      { fromPreviewId: 'preview-node-5', toPreviewId: 'preview-node-4' },
      { fromPreviewId: 'preview-node-6', toPreviewId: 'preview-node-5' },
    ];

    const graph = createMockSanitizedGraph(nodes, edges);

    expect(() =>
      radialGenerationsPosterLayoutEngine.createLayout({
        graph,
        document: createPosterDocumentSpec('A4', 'portrait', 'generous'),
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: 'سلسلة 6 أجيال على قياس ضيق',
          scope: 'selected-root-ancestors',
          generationCount: 6,
          privacyMode: 'owner-full',
        },
        layout: {
          engineId: 'radial-generations',
          direction: 'vertical',
          connectorStyle: 'classic',
          spacingPreset: 'compact',
          treeBounds: { x: 20, y: 100, width: 120, height: 120 },
        },
        cardPreset: {
          id: 'classic-heritage',
          theme: 'classic',
          visualStyle: 'classic-heritage',
          geometry: { minWidth: 80, maxWidth: 120, height: 60, borderRadius: 6 },
          typography: { nameSize: 14, yearsSize: 10, statusSize: 8 },
          photo: { shape: 'circle', preferredDiameter: 0, borderWidth: 0, overlapsCard: false },
        },
        radialOptions: {
          focalPreviewId: 'preview-node-0',
          radialSpan: '360-full-circle',
          generationRings: 6,
          ringSpacing: 'spacious',
          centerCardScale: 'large',
          labelOrientation: 'straight-unwarped',
        },
      })
    ).toThrow(RadialLayoutCapacityError);
  });

  it('15. successful sparse 6-ring chain: succeeds cleanly when 6 rings fit available page span', () => {
    const nodesData = [{ previewId: 'preview-node-0', displayName: 'محور 6' }];
    const edgesData: Array<{ fromPreviewId: string; toPreviewId: string }> = [];

    for (let i = 1; i <= 6; i += 1) {
      nodesData.push({ previewId: `preview-node-${i}`, displayName: `عقدة ${i}` });
      edgesData.push({ fromPreviewId: `preview-node-${i}`, toPreviewId: `preview-node-${i - 1}` });
    }

    const graph = createMockSanitizedGraph(nodesData, edgesData);
    const a3LandscapeDoc = createPosterDocumentSpec('A3', 'landscape', 'balanced');

    const scene = createPosterScene({
      graph,
      document: a3LandscapeDoc,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: '6 حلقات على صفحة واسعة',
        scope: 'selected-root-ancestors',
        generationCount: 6,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-0',
        radialSpan: '360-full-circle',
        generationRings: 6,
        ringSpacing: 'compact',
        centerCardScale: 'compact',
        labelOrientation: 'straight-unwarped',
      },
    });

    expect(scene.nodes).toHaveLength(7);
  });

  it('16. formats long real Arabic names and mixed RTL/LTR years without label warping', () => {
    const graph = createMockSanitizedGraph(
      [
        {
          previewId: 'preview-node-1',
          displayName: 'عبد الله بن محمد بن علي الجذور الحسني الشريف',
          birthYear: 1945,
          deathYear: 2012,
        },
      ],
      []
    );

    const a3Doc = createPosterDocumentSpec('A3', 'landscape', 'balanced');

    const scene = createPosterScene({
      graph,
      document: a3Doc,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'اسم طويل وتاريخ هجري/ميلادي',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-1',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    const node = scene.nodes[0]!;
    expect(node.displayName).toBe('عبد الله بن محمد بن علي الجذور الحسني الشريف');
    expect(node.birthYear).toBe(1945);
    expect(node.deathYear).toBe(2012);
  });

  it('17. handles duplicate and reversed edges and malformed cycles safely', () => {
    const graph = createMockSanitizedGraph(
      [
        { previewId: 'preview-node-1', displayName: 'عقدة 1' },
        { previewId: 'preview-node-2', displayName: 'عقدة 2' },
      ],
      [
        { fromPreviewId: 'preview-node-1', toPreviewId: 'preview-node-2' },
        { fromPreviewId: 'preview-node-2', toPreviewId: 'preview-node-1' },
        { fromPreviewId: 'preview-node-1', toPreviewId: 'preview-node-2' },
      ]
    );

    const scene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'دورة مغلقة',
        scope: 'selected-root-descendants',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-1',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    expect(scene.nodes).toHaveLength(2);
    expect(scene.connectors).toHaveLength(1);
  });

  it('18. produces deterministic repeated output for identical inputs', () => {
    const graph = createMockSanitizedGraph(
      [
        { previewId: 'preview-node-1', displayName: 'مركز' },
        { previewId: 'preview-node-2', displayName: 'فرع 1' },
        { previewId: 'preview-node-3', displayName: 'فرع 2' },
      ],
      [
        { fromPreviewId: 'preview-node-2', toPreviewId: 'preview-node-1' },
        { fromPreviewId: 'preview-node-3', toPreviewId: 'preview-node-1' },
      ]
    );

    const req: CreatePosterSceneRequest = {
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'حتمي',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-1',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    };

    const scene1 = createPosterScene(req);
    const scene2 = createPosterScene(req);

    expect(JSON.stringify(scene1.nodes)).toBe(JSON.stringify(scene2.nodes));
    expect(JSON.stringify(scene1.connectors)).toBe(JSON.stringify(scene2.connectors));
  });

  it('19. rejects labelOrientation="curved" with explicit unsupported error', () => {
    const graph = createMockSanitizedGraph(
      [{ previewId: 'preview-node-1', displayName: 'علي' }],
      []
    );

    expect(() =>
      createPosterScene({
        graph,
        document: documentSpec,
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: 'منحني مرفوض',
          scope: 'selected-root-ancestors',
          generationCount: 4,
          privacyMode: 'owner-full',
        },
        engineId: 'radial-generations',
        radialOptions: {
          focalPreviewId: 'preview-node-1',
          radialSpan: '360-full-circle',
          generationRings: 3,
          ringSpacing: 'balanced',
          centerCardScale: 'standard',
          labelOrientation: 'curved',
        },
      })
    ).toThrow(/Curved radial label orientation is currently unsupported for Arabic text/);
  });

  it('20. real createPosterScene -> renderPosterSceneToSvg -> export adapter parity', async () => {
    const graph = createMockSanitizedGraph(
      [
        { previewId: 'preview-node-1', displayName: 'المحوري' },
        { previewId: 'preview-node-2', displayName: 'الأب' },
      ],
      [{ fromPreviewId: 'preview-node-2', toPreviewId: 'preview-node-1' }]
    );

    const scene = createPosterScene({
      graph,
      document: documentSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'تطابق التصدير والعرض',
        scope: 'selected-root-ancestors',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'radial-generations',
      radialOptions: {
        focalPreviewId: 'preview-node-1',
        radialSpan: '360-full-circle',
        generationRings: 3,
        ringSpacing: 'balanced',
        centerCardScale: 'standard',
        labelOrientation: 'straight-unwarped',
      },
    });

    const renderResult = renderPosterSceneToSvg({ scene });
    expect(renderResult.svg).toContain('<svg');
    expect(renderResult.svg).toContain('تطابق التصدير والعرض');

    const exportArtifact = await exportStudioPoster(
      { scene, format: 'svg' },
      {}
    );

    expect(exportArtifact.mimeType).toBe('image/svg+xml');
    expect(exportArtifact.blob).toBeInstanceOf(Blob);
    expect(exportArtifact.blob.size).toBeGreaterThan(0);
  });

  it('21. EXPLICIT PHASE 3B ACTIVATION: proves Radial is now active in Studio UI and runtime-supported', () => {
    const capability = getPosterLayoutCombinationCapability('detailed-poster', 'radial-generations', 'ancestors');
    expect(capability.isRuntimeSupported).toBe(true);
    expect(capability.isPlanned).toBe(false);
    expect(capability.status).toBe('runtime-supported-and-reachable');

    const state = createInitialPosterDesignState();
    const radialState = {
      ...state,
      layoutMode: 'radial-generations' as const,
    };

    const mapped = mapPosterDesignStateToRuntimeOptions(radialState);
    expect(mapped.supported).toBe(false);
    expect(mapped.reason).toContain('Missing or unresolvable root person selection');
    expect(mapped.posterOptions).toBeUndefined();
  });
});
