import { describe, expect, it, vi } from 'vitest';
import { createPosterScene } from '../posterSceneBuilder';
import {
  FocusLayoutCapacityError,
  focusFamilyPosterLayoutEngine,
  getCardPerimeterPoint,
  validateFocusDepth,
} from '../focusFamilyPosterLayout';
import { createPosterDocumentSpec } from '../posterDocumentSpecs';
import { renderPosterSceneToSvg } from '../studioPosterSvgRenderer';
import { exportStudioPoster } from '../studioPosterExportAdapter';
import type { SanitizedPreviewGraph } from '../previewSanitizerTypes';
import type { PosterFocusDepth } from '../posterSceneTypes';

function createMockGraph(): SanitizedPreviewGraph {
  return {
    nodes: [
      {
        previewId: 'preview-node-g0-1',
        displayName: 'جد الجد علي',
        generation: 1,
        lifeStatus: 'deceased',
        isMasked: false,
        hasPhoto: false,
        relationshipHint: 'ancestor',
      },
      {
        previewId: 'preview-node-g1-1',
        displayName: 'الجد أحمد',
        generation: 2,
        lifeStatus: 'deceased',
        isMasked: false,
        hasPhoto: false,
        relationshipHint: 'ancestor',
      },
      {
        previewId: 'preview-node-g2-focal',
        displayName: 'الأب الأستاذ محمد بن أحمد بن علي آل سعيد التميمي',
        generation: 3,
        lifeStatus: 'living',
        isMasked: false,
        hasPhoto: true,
        relationshipHint: 'root',
      },
      {
        previewId: 'preview-node-g2-spouse1',
        displayName: 'الزوجة فاطمة',
        generation: 3,
        lifeStatus: 'living',
        isMasked: false,
        hasPhoto: false,
        relationshipHint: 'relative',
      },
      {
        previewId: 'preview-node-g2-spouse2',
        displayName: 'الزوجة عائشة',
        generation: 3,
        lifeStatus: 'living',
        isMasked: false,
        hasPhoto: false,
        relationshipHint: 'relative',
      },
      {
        previewId: 'preview-node-g2-sibling1',
        displayName: 'الأخ خالد',
        generation: 3,
        lifeStatus: 'living',
        isMasked: false,
        hasPhoto: false,
        relationshipHint: 'relative',
      },
      {
        previewId: 'preview-node-g2-sibling2',
        displayName: 'الأخت نورة',
        generation: 3,
        lifeStatus: 'living',
        isMasked: false,
        hasPhoto: false,
        relationshipHint: 'relative',
      },
      {
        previewId: 'preview-node-g3-child1',
        displayName: 'الابن يوسف (حي)',
        generation: 4,
        lifeStatus: 'living',
        isMasked: true,
        hasPhoto: false,
        relationshipHint: 'descendant',
      },
      {
        previewId: 'preview-node-g3-child2',
        displayName: 'الابنة مريم',
        generation: 4,
        lifeStatus: 'living',
        isMasked: false,
        hasPhoto: false,
        relationshipHint: 'descendant',
      },
      {
        previewId: 'preview-node-g4-grandchild',
        displayName: 'الحفيد طارق',
        generation: 5,
        lifeStatus: 'living',
        isMasked: false,
        hasPhoto: false,
        relationshipHint: 'descendant',
      },
    ],
    edges: [
      {
        fromPreviewId: 'preview-node-g0-1',
        toPreviewId: 'preview-node-g1-1',
        relationshipType: 'parent-child',
      },
      {
        fromPreviewId: 'preview-node-g1-1',
        toPreviewId: 'preview-node-g2-focal',
        relationshipType: 'parent-child',
      },
      {
        fromPreviewId: 'preview-node-g1-1',
        toPreviewId: 'preview-node-g2-sibling1',
        relationshipType: 'parent-child',
      },
      {
        fromPreviewId: 'preview-node-g1-1',
        toPreviewId: 'preview-node-g2-sibling2',
        relationshipType: 'parent-child',
      },
      {
        fromPreviewId: 'preview-node-g2-focal',
        toPreviewId: 'preview-node-g2-spouse1',
        relationshipType: 'spouse',
      },
      {
        fromPreviewId: 'preview-node-g2-spouse1',
        toPreviewId: 'preview-node-g2-focal',
        relationshipType: 'spouse', // Reversed duplicate edge test
      },
      {
        fromPreviewId: 'preview-node-g2-focal',
        toPreviewId: 'preview-node-g2-spouse2',
        relationshipType: 'spouse',
      },
      {
        fromPreviewId: 'preview-node-g2-focal',
        toPreviewId: 'preview-node-g3-child1',
        relationshipType: 'parent-child',
      },
      {
        fromPreviewId: 'preview-node-g2-focal',
        toPreviewId: 'preview-node-g3-child2',
        relationshipType: 'parent-child',
      },
      {
        fromPreviewId: 'preview-node-g3-child1',
        toPreviewId: 'preview-node-g4-grandchild',
        relationshipType: 'parent-child',
      },
    ],
    warnings: [],
    metadata: {
      sanitizedNodeCount: 10,
      truncated: false,
      policy: {
        privacyMode: 'owner-full',
        includePhotos: true,
        includeYears: true,
        maxNodes: 50,
        language: 'ar',
      },
    },
  };
}

function isPointOnPerimeter(
  pt: { x: number; y: number },
  rect: { x: number; y: number; width: number; height: number },
  tolerance = 0.2
): boolean {
  const insideOrOnX = pt.x >= rect.x - tolerance && pt.x <= rect.x + rect.width + tolerance;
  const insideOrOnY = pt.y >= rect.y - tolerance && pt.y <= rect.y + rect.height + tolerance;

  if (!insideOrOnX || !insideOrOnY) return false;

  const nearLeft = Math.abs(pt.x - rect.x) <= tolerance;
  const nearRight = Math.abs(pt.x - (rect.x + rect.width)) <= tolerance;
  const nearTop = Math.abs(pt.y - rect.y) <= tolerance;
  const nearBottom = Math.abs(pt.y - (rect.y + rect.height)) <= tolerance;

  return nearLeft || nearRight || nearTop || nearBottom;
}

describe('Focus Family Layout Engine (Phase 2A Test Completeness & Capacity Guard Closure)', () => {
  // Test 1: Depth validation & Engine ID
  it('validates focus depth parameters strictly and verifies engine ID', () => {
    expect(focusFamilyPosterLayoutEngine.id).toBe('focus-family');
    expect(validateFocusDepth(1)).toBe(1);
    expect(validateFocusDepth(4)).toBe(4);
    expect(validateFocusDepth('all')).toBe(Infinity);

    expect(() => validateFocusDepth(0 as unknown as PosterFocusDepth)).toThrow();
    expect(() => validateFocusDepth(-1 as unknown as PosterFocusDepth)).toThrow();
    expect(() => validateFocusDepth(5 as unknown as PosterFocusDepth)).toThrow();
    expect(() => validateFocusDepth(2.5 as unknown as PosterFocusDepth)).toThrow();
    expect(() => validateFocusDepth('invalid' as unknown as PosterFocusDepth)).toThrow();
  });

  // Test 2: Focal person only
  it('places focal person only when graph has single focal node', () => {
    const singleNodeGraph: SanitizedPreviewGraph = {
      nodes: [
        {
          previewId: 'preview-node-solo',
          displayName: 'الشيخ المحوري',
          generation: 1,
          lifeStatus: 'living',
          isMasked: false,
          hasPhoto: false,
          relationshipHint: 'root',
        },
      ],
      edges: [],
      warnings: [],
      metadata: {
        sanitizedNodeCount: 1,
        truncated: false,
        policy: { privacyMode: 'owner-full', includePhotos: true, includeYears: true, maxNodes: 50, language: 'ar' },
      },
    };

    const docSpec = createPosterDocumentSpec('A4', 'portrait', 'balanced');
    const scene = createPosterScene({
      graph: singleNodeGraph,
      document: docSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'شخص واحد',
        scope: 'selected-root-focus',
        generationCount: 1,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-solo',
        ancestorDepth: 1,
        descendantDepth: 1,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    expect(scene.nodes).toHaveLength(1);
    expect(scene.nodes[0]!.isRoot).toBe(true);
    expect(scene.nodes[0]!.generation).toBe(1);
    expect(scene.connectors).toHaveLength(0);

    const focalCard = scene.nodes[0]!.rect;
    const treeCenterX = scene.bounds.tree.x + scene.bounds.tree.width / 2;
    const treeCenterY = scene.bounds.tree.y + scene.bounds.tree.height / 2;
    expect(focalCard.width / scene.bounds.tree.width).toBeGreaterThan(0.25);
    expect(focalCard.height / scene.bounds.tree.height).toBeGreaterThan(0.1);
    expect(focalCard.x + focalCard.width / 2).toBeCloseTo(treeCenterX, 1);
    expect(focalCard.y + focalCard.height / 2).toBeCloseTo(treeCenterY, 1);
  });

  // Test 3: Missing one or both parents
  it('handles missing one or both parents gracefully', () => {
    const orphanChildGraph: SanitizedPreviewGraph = {
      nodes: [
        {
          previewId: 'preview-node-focal-orphan',
          displayName: 'المحوري اليتيم',
          generation: 1,
          lifeStatus: 'living',
          isMasked: false,
          hasPhoto: false,
          relationshipHint: 'root',
        },
        {
          previewId: 'preview-node-known-mother',
          displayName: 'الأم المعروفة',
          generation: 2,
          lifeStatus: 'living',
          isMasked: false,
          hasPhoto: false,
          relationshipHint: 'ancestor',
        },
      ],
      edges: [
        {
          fromPreviewId: 'preview-node-known-mother',
          toPreviewId: 'preview-node-focal-orphan',
          relationshipType: 'parent-child',
        },
      ],
      warnings: [],
      metadata: {
        sanitizedNodeCount: 2,
        truncated: false,
        policy: { privacyMode: 'owner-full', includePhotos: true, includeYears: true, maxNodes: 50, language: 'ar' },
      },
    };

    const docSpec = createPosterDocumentSpec('A4', 'portrait', 'balanced');
    const scene = createPosterScene({
      graph: orphanChildGraph,
      document: docSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'أم واحدة',
        scope: 'selected-root-focus',
        generationCount: 2,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-focal-orphan',
        ancestorDepth: 1,
        descendantDepth: 1,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    expect(scene.nodes).toHaveLength(2);
    expect(scene.connectors).toHaveLength(1);
  });

  // Test 4: Long Arabic name Unicode preservation in PosterScene and SVG
  it('preserves long Arabic name as valid Unicode in PosterScene and rendered SVG', () => {
    const graph = createMockGraph();
    const docSpec = createPosterDocumentSpec('A3', 'portrait', 'balanced');
    const scene = createPosterScene({
      graph,
      document: docSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'اسم عربي طويل جداً',
        scope: 'selected-root-focus',
        generationCount: 3,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-g2-focal',
        ancestorDepth: 1,
        descendantDepth: 1,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    const focalCard = scene.nodes.find((n) => n.previewId === 'preview-node-g2-focal')!;
    expect(focalCard.displayName).toBe('الأب الأستاذ محمد بن أحمد بن علي آل سعيد التميمي');

    const svgResult = renderPosterSceneToSvg({ scene });
    expect(svgResult.svg).toContain('الأب');
    expect(svgResult.svg).toContain('التميمي');
  });

  // Test 5: Arabic initials validity
  it('validates Arabic initials generation', () => {
    const graph = createMockGraph();
    const docSpec = createPosterDocumentSpec('A4', 'portrait', 'balanced');
    const scene = createPosterScene({
      graph,
      document: docSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'الأحرف الأولى',
        scope: 'selected-root-focus',
        generationCount: 3,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-g2-focal',
        ancestorDepth: 1,
        descendantDepth: 1,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    const focalCard = scene.nodes.find((n) => n.previewId === 'preview-node-g2-focal')!;
    expect(focalCard.initials).toBe('اا');
  });

  // Test 6: Masked nodes preserved in PosterScene and SVG
  it('preserves isMasked=true state in PosterScene and rendered SVG', () => {
    const graph = createMockGraph();
    const docSpec = createPosterDocumentSpec('A4', 'portrait', 'balanced');
    const scene = createPosterScene({
      graph,
      document: docSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'أعضاء محجوبون',
        scope: 'selected-root-focus',
        generationCount: 3,
        privacyMode: 'masked',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-g2-focal',
        ancestorDepth: 1,
        descendantDepth: 1,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    const maskedNode = scene.nodes.find((n) => n.previewId === 'preview-node-g3-child1')!;
    expect(maskedNode.isMasked).toBe(true);

    const svgResult = renderPosterSceneToSvg({ scene });
    expect(svgResult.svg).toContain('الابن يوسف (حي)');
  });

  // Test 7: Privacy boundary - no sensitive raw tokens
  it('ensures scene and SVG contain no raw IDs, storage URLs, or tokens', () => {
    const graph = createMockGraph();
    const docSpec = createPosterDocumentSpec('A4', 'portrait', 'balanced');
    const scene = createPosterScene({
      graph,
      document: docSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'عزل المعرفات الخام',
        scope: 'selected-root-focus',
        generationCount: 3,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-g2-focal',
        ancestorDepth: 1,
        descendantDepth: 1,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    const svgResult = renderPosterSceneToSvg({ scene });

    scene.nodes.forEach((n) => {
      expect(n.previewId).toMatch(/^preview-node-/);
    });

    expect(svgResult.svg).not.toContain('person-raw-');
    expect(svgResult.svg).not.toContain('supabase.co');
    expect(svgResult.svg).not.toContain('auth-token');
  });

  // Test 8: Deterministic repeated output
  it('produces deterministic repeated output for identical requests', () => {
    const graph = createMockGraph();
    const docSpec = createPosterDocumentSpec('A4', 'portrait', 'balanced');

    const makeScene = () =>
      createPosterScene({
        graph,
        document: docSpec,
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: 'تطابق حتمي',
          scope: 'selected-root-focus',
          generationCount: 3,
          privacyMode: 'owner-full',
        },
        engineId: 'focus-family',
        focusOptions: {
          focalPreviewId: 'preview-node-g2-focal',
          ancestorDepth: 2,
          descendantDepth: 2,
          includeFocalSpouses: true,
          includeFocalSiblings: true,
        },
      });

    const scene1 = makeScene();
    const scene2 = makeScene();

    expect(scene1.nodes).toEqual(scene2.nodes);
    expect(scene1.connectors).toEqual(scene2.connectors);
  });

  // Test 9: Different sizes and orientations produce distinct geometry
  it('produces distinct geometry for different paper sizes and orientations (A4 vs A3, portrait vs landscape)', () => {
    const graph = createMockGraph();
    const a4Portrait = createPosterDocumentSpec('A4', 'portrait', 'balanced');
    const a3Landscape = createPosterDocumentSpec('A3', 'landscape', 'balanced');

    const sceneA4 = createPosterScene({
      graph,
      document: a4Portrait,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'A4 بالطول',
        scope: 'selected-root-focus',
        generationCount: 3,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-g2-focal',
        ancestorDepth: 2,
        descendantDepth: 2,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    const sceneA3 = createPosterScene({
      graph,
      document: a3Landscape,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'A3 بالعرض',
        scope: 'selected-root-focus',
        generationCount: 3,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      direction: 'horizontal',
      focusOptions: {
        focalPreviewId: 'preview-node-g2-focal',
        ancestorDepth: 2,
        descendantDepth: 2,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    expect(sceneA4.bounds.tree).not.toEqual(sceneA3.bounds.tree);
    expect(sceneA4.nodes[0]!.rect).not.toEqual(sceneA3.nodes[0]!.rect);
  });

  it('distributes focus tiers across the printable main axis on large-format pages', () => {
    const graph = createMockGraph();

    const createLargeFormatScene = (
      pageSize: 'A3' | 'A0',
      direction: 'vertical' | 'horizontal'
    ) =>
      createPosterScene({
        graph,
        document: createPosterDocumentSpec(pageSize, 'landscape', 'balanced'),
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: `Focus ${pageSize} ${direction}`,
          scope: 'selected-root-focus',
          generationCount: 4,
          privacyMode: 'owner-full',
        },
        engineId: 'focus-family',
        direction,
        focusOptions: {
          focalPreviewId: 'preview-node-g2-focal',
          ancestorDepth: 2,
          descendantDepth: 2,
          includeFocalSpouses: true,
          includeFocalSiblings: true,
        },
      });

    (['A3', 'A0'] as const).forEach((pageSize) => {
      (['vertical', 'horizontal'] as const).forEach((direction) => {
        const scene = createLargeFormatScene(pageSize, direction);
        const focalNode = scene.nodes.find((node) => node.isRoot)!;
        const surroundingNode = scene.nodes.find((node) => !node.isRoot)!;
        const mainAxisStart = Math.min(
          ...scene.nodes.map((node) => (direction === 'vertical' ? node.rect.y : node.rect.x))
        );
        const mainAxisEnd = Math.max(
          ...scene.nodes.map((node) =>
            direction === 'vertical'
              ? node.rect.y + node.rect.height
              : node.rect.x + node.rect.width
          )
        );
        const mainAxisLength =
          direction === 'vertical' ? scene.bounds.tree.height : scene.bounds.tree.width;

        expect((mainAxisEnd - mainAxisStart) / mainAxisLength).toBeGreaterThan(0.95);
        expect(focalNode.rect.width).toBeGreaterThan(surroundingNode.rect.width);

        if (pageSize === 'A0' && direction === 'horizontal') {
          const renderedSvg = renderPosterSceneToSvg({ scene }).svg;
          expect(renderedSvg).toContain('is-focus-root');
          expect(renderedSvg).toContain('poster-focus-root-emphasis');
          expect(renderedSvg).toContain('.poster-node.is-focus-root .poster-card{fill:');
          expect(renderedSvg).toContain(`data-scene-width="${focalNode.rect.width.toFixed(2)}"`);
        }
      });
    });
  });

  // Test 10: Focal center with companions
  it('keeps focal card geometrically centered across all companion combinations in vertical and horizontal modes', () => {
    const graph = createMockGraph();
    const docSpec = createPosterDocumentSpec('A3', 'landscape', 'balanced');

    const testConfigurations = [
      { spouses: false, siblings: false },
      { spouses: true, siblings: false },
      { spouses: false, siblings: true },
      { spouses: true, siblings: true },
    ];

    ['vertical', 'horizontal'].forEach((dir) => {
      testConfigurations.forEach((config) => {
        const scene = createPosterScene({
          graph,
          document: docSpec,
          content: {
            definitionId: 'classic-ancestor-poster',
            language: 'ar',
            title: `مركزي-${dir}-${config.spouses}-${config.siblings}`,
            scope: 'selected-root-focus',
            generationCount: 3,
            privacyMode: 'owner-full',
          },
          engineId: 'focus-family',
          direction: dir as 'vertical' | 'horizontal',
          focusOptions: {
            focalPreviewId: 'preview-node-g2-focal',
            ancestorDepth: 1,
            descendantDepth: 1,
            includeFocalSpouses: config.spouses,
            includeFocalSiblings: config.siblings,
          },
        });

        const focalCard = scene.nodes.find((n) => n.previewId === 'preview-node-g2-focal')!;
        expect(focalCard.isRoot).toBe(true);

        const treeCenterX = scene.bounds.tree.x + scene.bounds.tree.width / 2;
        const treeCenterY = scene.bounds.tree.y + scene.bounds.tree.height / 2;

        const focalCenterX = focalCard.rect.x + focalCard.rect.width / 2;
        const focalCenterY = focalCard.rect.y + focalCard.rect.height / 2;

        expect(Math.abs(focalCenterX - treeCenterX)).toBeLessThan(0.1);
        expect(Math.abs(focalCenterY - treeCenterY)).toBeLessThan(0.1);
      });
    });
  });

  // Test 11: Asymmetric 4/1 and 1/4
  it('supports asymmetric 4/1 and 1/4 layouts without card overlaps', () => {
    const graph = createMockGraph();
    const docSpec = createPosterDocumentSpec('A3', 'landscape', 'generous');

    const scene41 = createPosterScene({
      graph,
      document: docSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'غير متماثل 4/1',
        scope: 'selected-root-focus',
        generationCount: 5,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-g2-focal',
        ancestorDepth: 4,
        descendantDepth: 1,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    expect(scene41.nodes.map((n) => n.previewId)).toContain('preview-node-g0-1');
    expect(scene41.nodes.map((n) => n.previewId)).not.toContain('preview-node-g4-grandchild');

    const scene14 = createPosterScene({
      graph,
      document: docSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'غير متماثل 1/4',
        scope: 'selected-root-focus',
        generationCount: 5,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-g2-focal',
        ancestorDepth: 1,
        descendantDepth: 4,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    expect(scene14.nodes.map((n) => n.previewId)).toContain('preview-node-g4-grandchild');
    expect(scene14.nodes.map((n) => n.previewId)).not.toContain('preview-node-g0-1');

    [scene41, scene14].forEach((scene) => {
      for (let i = 0; i < scene.nodes.length; i += 1) {
        for (let j = i + 1; j < scene.nodes.length; j += 1) {
          const r1 = scene.nodes[i]!.rect;
          const r2 = scene.nodes[j]!.rect;
          const overlapX = r1.x < r2.x + r2.width - 0.1 && r1.x + r1.width > r2.x + 0.1;
          const overlapY = r1.y < r2.y + r2.height - 0.1 && r1.y + r1.height > r2.y + 0.1;
          expect(overlapX && overlapY).toBe(false);
        }
      }
    });
  });

  // Test 12: Multiple spouses and half siblings
  it('handles half siblings and multiple spouses cleanly', () => {
    const graph = createMockGraph();
    const docSpec = createPosterDocumentSpec('A3', 'portrait', 'balanced');

    const scene = createPosterScene({
      graph,
      document: docSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'زوجات وإخوة',
        scope: 'selected-root-focus',
        generationCount: 3,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-g2-focal',
        ancestorDepth: 1,
        descendantDepth: 1,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    const previewIds = scene.nodes.map((n) => n.previewId);
    expect(previewIds).toContain('preview-node-g2-spouse1');
    expect(previewIds).toContain('preview-node-g2-spouse2');
    expect(previewIds).toContain('preview-node-g2-sibling1');
    expect(previewIds).toContain('preview-node-g2-sibling2');
  });

  // Test 13: Malformed cycle fixture
  it('handles malformed graph cycles deterministically without infinite loops or rewriting focal tier 0', () => {
    const cyclicGraph: SanitizedPreviewGraph = {
      nodes: [
        {
          previewId: 'preview-node-cycle-a',
          displayName: 'عقدة دائرية أ',
          generation: 1,
          lifeStatus: 'living',
          isMasked: false,
          hasPhoto: false,
          relationshipHint: 'root',
        },
        {
          previewId: 'preview-node-cycle-b',
          displayName: 'عقدة دائرية ب',
          generation: 2,
          lifeStatus: 'living',
          isMasked: false,
          hasPhoto: false,
          relationshipHint: 'ancestor',
        },
        {
          previewId: 'preview-node-cycle-c',
          displayName: 'عقدة دائرية ج',
          generation: 3,
          lifeStatus: 'living',
          isMasked: false,
          hasPhoto: false,
          relationshipHint: 'ancestor',
        },
      ],
      edges: [
        { fromPreviewId: 'preview-node-cycle-b', toPreviewId: 'preview-node-cycle-a', relationshipType: 'parent-child' },
        { fromPreviewId: 'preview-node-cycle-c', toPreviewId: 'preview-node-cycle-b', relationshipType: 'parent-child' },
        { fromPreviewId: 'preview-node-cycle-a', toPreviewId: 'preview-node-cycle-c', relationshipType: 'parent-child' },
      ],
      warnings: [],
      metadata: {
        sanitizedNodeCount: 3,
        truncated: false,
        policy: { privacyMode: 'owner-full', includePhotos: true, includeYears: true, maxNodes: 50, language: 'ar' },
      },
    };

    const docSpec = createPosterDocumentSpec('A4', 'portrait', 'balanced');
    const scene = createPosterScene({
      graph: cyclicGraph,
      document: docSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'فحص الدائرة',
        scope: 'selected-root-focus',
        generationCount: 3,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-cycle-a',
        ancestorDepth: 3,
        descendantDepth: 3,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    expect(scene.nodes).toHaveLength(3);
    const focalNode = scene.nodes.find((n) => n.previewId === 'preview-node-cycle-a')!;
    expect(focalNode.isRoot).toBe(true);
    expect(focalNode.generation).toBe(1);
  });

  // Test 14: Capacity failure
  it('fails controlled with capacity error on overcrowded A4 canvas', () => {
    const overcrowdedGraph: SanitizedPreviewGraph = {
      nodes: Array.from({ length: 30 }, (_, i) => ({
        previewId: `preview-node-dense-${i}`,
        displayName: `عضو مزدحم ${i}`,
        generation: (i % 5) + 1,
        lifeStatus: 'living',
        isMasked: false,
        hasPhoto: false,
        relationshipHint: i === 0 ? 'root' : 'relative',
      })),
      edges: Array.from({ length: 29 }, (_, i) => ({
        fromPreviewId: `preview-node-dense-${Math.floor(i / 2)}`,
        toPreviewId: `preview-node-dense-${i + 1}`,
        relationshipType: 'parent-child',
      })),
      warnings: [],
      metadata: {
        sanitizedNodeCount: 30,
        truncated: false,
        policy: { privacyMode: 'owner-full', includePhotos: true, includeYears: true, maxNodes: 50, language: 'ar' },
      },
    };

    const docSpec = createPosterDocumentSpec('A4', 'portrait', 'compact');

    const createOvercrowdedScene = () =>
      createPosterScene({
        graph: overcrowdedGraph,
        document: docSpec,
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: 'ازدحام شديد',
          scope: 'selected-root-focus',
          generationCount: 5,
          privacyMode: 'owner-full',
        },
        engineId: 'focus-family',
        focusOptions: {
          focalPreviewId: 'preview-node-dense-0',
          ancestorDepth: 4,
          descendantDepth: 4,
          includeFocalSpouses: true,
          includeFocalSiblings: true,
        },
      });

    expect(createOvercrowdedScene).toThrowError(FocusLayoutCapacityError);
    expect(createOvercrowdedScene).toThrow(/Focus layout capacity exceeded/);
  });

  // Test 15: Connector perimeter helper & edge deduplication
  it('enforces perimeter intersection helper and verifies every connector endpoint lies on card perimeter', () => {
    const cardRect = { x: 100, y: 100, width: 200, height: 100 };
    const targetBottom = { x: 200, y: 300 };
    const ptBottom = getCardPerimeterPoint(cardRect, targetBottom);
    expect(ptBottom).toEqual({ x: 200, y: 200 });

    const targetRight = { x: 500, y: 150 };
    const ptRight = getCardPerimeterPoint(cardRect, targetRight);
    expect(ptRight).toEqual({ x: 300, y: 150 });

    const graph = createMockGraph();
    const docSpec = createPosterDocumentSpec('A3', 'landscape', 'balanced');

    const scene = createPosterScene({
      graph,
      document: docSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'فحص المحيط',
        scope: 'selected-root-focus',
        generationCount: 4,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-g2-focal',
        ancestorDepth: 2,
        descendantDepth: 2,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    const nodeMap = new Map(scene.nodes.map((n) => [n.previewId, n]));

    expect(scene.connectors.length).toBeGreaterThan(0);

    scene.connectors.forEach((conn) => {
      const fromNode = nodeMap.get(conn.fromPreviewId)!;
      const toNode = nodeMap.get(conn.toPreviewId)!;

      expect(isPointOnPerimeter(conn.start, fromNode.rect)).toBe(true);
      expect(isPointOnPerimeter(conn.end, toNode.rect)).toBe(true);

      if (conn.relationshipType === 'parent-child') {
        expect(conn.route).toHaveLength(2);
        const [routeStart, routeEnd] = conn.route!;
        expect(routeStart!.y).toBe(routeEnd!.y);
        expect(routeStart!.y).toBeGreaterThanOrEqual(Math.min(conn.start.y, conn.end.y));
        expect(routeStart!.y).toBeLessThanOrEqual(Math.max(conn.start.y, conn.end.y));
      }
    });

    const spouseConnectors = scene.connectors.filter(
      (c) =>
        (c.fromPreviewId === 'preview-node-g2-focal' && c.toPreviewId === 'preview-node-g2-spouse1') ||
        (c.fromPreviewId === 'preview-node-g2-spouse1' && c.toPreviewId === 'preview-node-g2-focal')
    );
    expect(spouseConnectors).toHaveLength(1);
    expect(spouseConnectors[0]!.route).toBeUndefined();
  });

  it('routes generation connectors through direction-aware corridors without changing canonical endpoints', () => {
    const graph = createMockGraph();
    const document = createPosterDocumentSpec('A3', 'landscape', 'balanced');
    const createScene = (direction: 'vertical' | 'horizontal') =>
      createPosterScene({
        graph,
        document,
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: `مسارات فوكس ${direction}`,
          scope: 'selected-root-focus',
          generationCount: 4,
          privacyMode: 'owner-full',
        },
        engineId: 'focus-family',
        direction,
        focusOptions: {
          focalPreviewId: 'preview-node-g2-focal',
          ancestorDepth: 2,
          descendantDepth: 2,
          includeFocalSpouses: true,
          includeFocalSiblings: true,
        },
      });

    const verticalScene = createScene('vertical');
    const horizontalScene = createScene('horizontal');

    verticalScene.connectors
      .filter((connector) => connector.relationshipType === 'parent-child')
      .forEach((connector) => {
        expect(connector.route).toHaveLength(2);
        const [routeStart, routeEnd] = connector.route!;
        expect(routeStart!.y).toBe(routeEnd!.y);
      });

    horizontalScene.connectors
      .filter((connector) => connector.relationshipType === 'parent-child')
      .forEach((connector) => {
        expect(connector.route).toHaveLength(2);
        const [routeStart, routeEnd] = connector.route!;
        expect(routeStart!.x).toBe(routeEnd!.x);
        expect(routeStart!.x).toBeGreaterThanOrEqual(
          Math.min(connector.start.x, connector.end.x)
        );
        expect(routeStart!.x).toBeLessThanOrEqual(
          Math.max(connector.start.x, connector.end.x)
        );
      });

    const sampleConnector = verticalScene.connectors.find(
      (connector) => connector.relationshipType === 'parent-child'
    )!;
    const renderWithPath = (connectorPathStyle: 'straight' | 'orthogonal' | 'curved') =>
      renderPosterSceneToSvg({
        scene: { ...verticalScene, connectorPathStyle },
      }).svg;
    const edgePattern = new RegExp(
      `data-preview-edge="${sampleConnector.fromPreviewId}:${sampleConnector.toPreviewId}"[^>]+d="([^"]+)"`
    );
    const straightPath = renderWithPath('straight').match(edgePattern)![1]!;
    const orthogonalPath = renderWithPath('orthogonal').match(edgePattern)![1]!;
    const curvedPath = renderWithPath('curved').match(edgePattern)![1]!;

    expect(straightPath).toMatch(/^M [\d.]+ [\d.]+ L [\d.]+ [\d.]+$/);
    expect(orthogonalPath.match(/ L /g)).toHaveLength(3);
    expect(curvedPath.match(/ C /g)).toHaveLength(2);
    expect(curvedPath.match(/ L /g)).toHaveLength(1);
    expect(renderWithPath('curved')).toContain('data-route-points="2"');
  });

  // Test 17: Two-way builder validation
  it('enforces strict two-way builder validation rules', () => {
    const graph = createMockGraph();
    const docSpec = createPosterDocumentSpec('A4', 'portrait', 'balanced');

    expect(() =>
      createPosterScene({
        graph,
        document: docSpec,
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: 'رفض 1',
          scope: 'selected-root-focus',
          generationCount: 1,
          privacyMode: 'owner-full',
        },
        engineId: 'ancestor-tiered',
      })
    ).toThrow(/requires engineId to be 'focus-family'/);

    expect(() =>
      createPosterScene({
        graph,
        document: docSpec,
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: 'رفض 2',
          scope: 'selected-root-ancestors',
          generationCount: 1,
          privacyMode: 'owner-full',
        },
        engineId: 'focus-family',
        focusOptions: {
          focalPreviewId: 'preview-node-g2-focal',
          ancestorDepth: 1,
          descendantDepth: 1,
          includeFocalSpouses: true,
          includeFocalSiblings: true,
        },
      })
    ).toThrow(/requires content.scope to be 'selected-root-focus'/);

    expect(() =>
      createPosterScene({
        graph,
        document: docSpec,
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: 'رفض 3',
          scope: 'selected-root-focus',
          generationCount: 1,
          privacyMode: 'owner-full',
        },
        engineId: 'focus-family',
      })
    ).toThrow(/requires focusOptions/);

    expect(() =>
      createPosterScene({
        graph,
        document: docSpec,
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: 'رفض 4',
          scope: 'selected-root-ancestors',
          generationCount: 1,
          privacyMode: 'owner-full',
        },
        engineId: 'ancestor-tiered',
        focusOptions: {
          focalPreviewId: 'preview-node-g2-focal',
          ancestorDepth: 1,
          descendantDepth: 1,
          includeFocalSpouses: true,
          includeFocalSiblings: true,
        },
      })
    ).toThrow(/focusOptions can only be supplied when engineId is 'focus-family'/);

    expect(() =>
      createPosterScene({
        graph,
        document: docSpec,
        content: {
          definitionId: 'classic-ancestor-poster',
          language: 'ar',
          title: 'رفض 5',
          scope: 'selected-root-focus',
          generationCount: 1,
          privacyMode: 'owner-full',
        },
        engineId: 'focus-family',
        focusOptions: {
          focalPreviewId: 'preview-node-ghost',
          ancestorDepth: 1,
          descendantDepth: 1,
          includeFocalSpouses: true,
          includeFocalSiblings: true,
        },
      })
    ).toThrow(/not found in graph/);
  });

  // Test 18: Real same-scene SVG / Export adapter parity
  it('proves real same-scene SVG and export-adapter parity without mutating scene geometry', async () => {
    const graph = createMockGraph();
    const docSpec = createPosterDocumentSpec('A4', 'portrait', 'balanced');

    const scene = createPosterScene({
      graph,
      document: docSpec,
      content: {
        definitionId: 'classic-ancestor-poster',
        language: 'ar',
        title: 'مطابقة التصدير الحقيقية',
        scope: 'selected-root-focus',
        generationCount: 3,
        privacyMode: 'owner-full',
      },
      engineId: 'focus-family',
      focusOptions: {
        focalPreviewId: 'preview-node-g2-focal',
        ancestorDepth: 2,
        descendantDepth: 2,
        includeFocalSpouses: true,
        includeFocalSiblings: true,
      },
    });

    const snapshotNodeRects = scene.nodes.map((n) => ({ id: n.previewId, rect: { ...n.rect } }));

    const svgResult = renderPosterSceneToSvg({ scene });
    expect(svgResult.svg).toContain('<svg');
    expect(svgResult.svg).toContain('مطابقة التصدير الحقيقية');

    const mockRuntime = {
      renderPng: vi.fn(async (req) => {
        expect(req.renderResult.svg).toBe(svgResult.svg);
        return new Blob(['fake-png-bytes'], { type: 'image/png' });
      }),
      renderPdf: vi.fn(async (req) => {
        expect(req.renderResult.svg).toBe(svgResult.svg);
        return new Blob(['fake-pdf-bytes'], { type: 'application/pdf' });
      }),
    };

    const svgExport = await exportStudioPoster({ scene, format: 'svg' }, mockRuntime);
    expect(svgExport.mimeType).toBe('image/svg+xml');
    expect(svgExport.fileName).toBe('مطابقة التصدير الحقيقية.svg');
    expect(svgExport.renderResult.svg).toBe(svgResult.svg);

    const pngExport = await exportStudioPoster({ scene, format: 'png' }, mockRuntime);
    expect(pngExport.mimeType).toBe('image/png');
    expect(pngExport.fileName).toBe('مطابقة التصدير الحقيقية.png');
    expect(mockRuntime.renderPng).toHaveBeenCalledWith({
      renderResult: svgResult,
      fileName: 'مطابقة التصدير الحقيقية.png',
    });

    const pdfExport = await exportStudioPoster({ scene, format: 'pdf' }, mockRuntime);
    expect(pdfExport.mimeType).toBe('application/pdf');
    expect(pdfExport.fileName).toBe('مطابقة التصدير الحقيقية.pdf');
    expect(mockRuntime.renderPdf).toHaveBeenCalledWith({
      renderResult: svgResult,
      fileName: 'مطابقة التصدير الحقيقية.pdf',
    });

    scene.nodes.forEach((n, idx) => {
      expect(n.rect).toEqual(snapshotNodeRects[idx]!.rect);
    });
  });
});
