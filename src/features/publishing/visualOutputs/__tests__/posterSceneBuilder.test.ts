import { describe, expect, it, vi } from 'vitest';

import { createPosterDocumentSpec, getPosterRasterScale } from '../posterDocumentSpecs';
import {
  createPosterScene,
  normalizePosterColorOverrides,
  normalizePosterFooterText,
} from '../posterSceneBuilder';
import type { PosterContentSpec, PosterPageSize } from '../posterSceneTypes';
import type { SanitizedPreviewGraph } from '../previewSanitizerTypes';
import { exportStudioPoster, type StudioPosterExportRuntime } from '../studioPosterExportAdapter';
import { renderPosterSceneToSvg } from '../studioPosterSvgRenderer';

function createAncestorGraph(generationCount: number): SanitizedPreviewGraph {
  const nodeCount = (2 ** generationCount) - 1;
  const nodes = Array.from({ length: nodeCount }, (_, index) => {
    const oneBasedIndex = index + 1;
    const generation = Math.floor(Math.log2(oneBasedIndex)) + 1;
    return {
      previewId: `preview-node-${oneBasedIndex}`,
      displayName: generation === 1 ? 'سليم النور' : `سلف ${oneBasedIndex}`,
      generation,
      relationshipHint: generation === 1 ? 'root' as const : 'ancestor' as const,
      lifeStatus: 'deceased' as const,
      isMasked: false,
      hasPhoto: false,
      birthYear: 1900 - index,
      deathYear: 1970 - index,
    };
  });
  const edges = nodes.slice(1).map((node, index) => ({
    fromPreviewId: node.previewId,
    toPreviewId: `preview-node-${Math.floor((index + 2) / 2)}`,
    relationshipType: 'parent-child' as const,
  }));

  return {
    nodes,
    edges,
    warnings: [],
    metadata: {
      truncated: false,
      sanitizedNodeCount: nodes.length,
      policy: {
        privacyMode: 'masked',
        includePhotos: false,
        includeYears: true,
        maxNodes: nodes.length,
        language: 'ar',
      },
    },
  };
}

function createContent(generationCount: number): PosterContentSpec {
  return {
    definitionId: 'classic-ancestor-poster',
    language: 'ar',
    title: 'شجرة أسلاف سليم النور',
    subtitle: 'سجل عائلي للطباعة',
    scope: 'selected-root-ancestors',
    rootPreviewId: 'preview-node-1',
    generationCount,
    privacyMode: 'masked',
  };
}

function createDescendantGraph(generationCount: number): SanitizedPreviewGraph {
  const graph = createAncestorGraph(generationCount);
  return {
    ...graph,
    nodes: graph.nodes.map((node, index) => ({
      ...node,
      relationshipHint: index === 0 ? 'root' as const : 'descendant' as const,
    })),
    edges: graph.nodes.slice(1).map((node, index) => ({
      fromPreviewId: `preview-node-${Math.floor((index + 2) / 2)}`,
      toPreviewId: node.previewId,
      relationshipType: 'parent-child' as const,
    })),
  };
}

function createSelectedBranchGraph(): SanitizedPreviewGraph {
  return {
    nodes: [
      { previewId: 'preview-node-1', displayName: 'Branch Root', generation: 1, relationshipHint: 'root', lifeStatus: 'living', isMasked: false, hasPhoto: false },
      { previewId: 'preview-node-2', displayName: 'Branch Spouse', generation: 1, relationshipHint: 'spouse', lifeStatus: 'living', isMasked: false, hasPhoto: false },
      { previewId: 'preview-node-3', displayName: 'Branch Child', generation: 2, relationshipHint: 'descendant', lifeStatus: 'living', isMasked: false, hasPhoto: false },
      { previewId: 'preview-node-4', displayName: 'Branch Grandchild', generation: 3, relationshipHint: 'descendant', lifeStatus: 'living', isMasked: false, hasPhoto: false },
    ],
    edges: [
      { fromPreviewId: 'preview-node-1', toPreviewId: 'preview-node-2', relationshipType: 'spouse' },
      { fromPreviewId: 'preview-node-1', toPreviewId: 'preview-node-3', relationshipType: 'parent-child' },
      { fromPreviewId: 'preview-node-3', toPreviewId: 'preview-node-4', relationshipType: 'parent-child' },
    ],
    warnings: [],
    metadata: {
      truncated: false,
      sanitizedNodeCount: 4,
      policy: {
        privacyMode: 'owner-full',
        includePhotos: false,
        includeYears: true,
        maxNodes: 20,
        language: 'en',
      },
    },
  };
}

function getNodeBounds(scene: ReturnType<typeof createPosterScene>) {
  const minX = Math.min(...scene.nodes.map((node) => node.rect.x));
  const minY = Math.min(...scene.nodes.map((node) => node.rect.y));
  const maxX = Math.max(...scene.nodes.map((node) => node.rect.x + node.rect.width));
  const maxY = Math.max(...scene.nodes.map((node) => node.rect.y + node.rect.height));
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
}

function createFamilyNetworkGraph(): SanitizedPreviewGraph {
  return {
    nodes: [
      { previewId: 'preview-node-1', displayName: 'Root', generation: 2, relationshipHint: 'root', lifeStatus: 'living', isMasked: false, hasPhoto: false },
      { previewId: 'preview-node-2', displayName: 'Parent', generation: 1, relationshipHint: 'ancestor', lifeStatus: 'deceased', isMasked: false, hasPhoto: false },
      { previewId: 'preview-node-3', displayName: 'Spouse', generation: 2, relationshipHint: 'spouse', lifeStatus: 'living', isMasked: false, hasPhoto: false },
      { previewId: 'preview-node-4', displayName: 'Child', generation: 3, relationshipHint: 'descendant', lifeStatus: 'living', isMasked: false, hasPhoto: false },
      { previewId: 'preview-node-5', displayName: 'Relative', generation: 2, relationshipHint: 'relative', lifeStatus: 'unknown', isMasked: false, hasPhoto: false },
    ],
    edges: [
      { fromPreviewId: 'preview-node-2', toPreviewId: 'preview-node-1', relationshipType: 'parent-child' },
      { fromPreviewId: 'preview-node-1', toPreviewId: 'preview-node-3', relationshipType: 'spouse' },
      { fromPreviewId: 'preview-node-1', toPreviewId: 'preview-node-4', relationshipType: 'parent-child' },
      { fromPreviewId: 'preview-node-3', toPreviewId: 'preview-node-5', relationshipType: 'relative' },
    ],
    warnings: [],
    metadata: {
      truncated: false,
      sanitizedNodeCount: 5,
      policy: {
        privacyMode: 'owner-full',
        includePhotos: false,
        includeYears: true,
        maxNodes: 20,
        language: 'en',
      },
    },
  };
}

describe('PosterScene foundation', () => {
  it('accepts only normalized six-digit hex color overrides', () => {
    expect(normalizePosterColorOverrides({
      background: ' #AABBCC ',
      cardBackground: 'red',
      accent: '#123456;stroke:url(javascript:alert(1))',
      connector: '#00ff88',
    })).toEqual({
      background: '#aabbcc',
      cardBackground: undefined,
      accent: undefined,
      connector: '#00ff88',
    });
  });
  it('normalizes owner footer text at the canonical scene boundary', () => {
    expect(normalizePosterFooterText('  Family\n\t memory  ')).toBe('Family memory');
    expect(normalizePosterFooterText(` ${'x'.repeat(90)} `)).toHaveLength(80);

    const scene = createPosterScene({
      graph: createAncestorGraph(2),
      document: createPosterDocumentSpec('A3', 'landscape'),
      content: {
        ...createContent(2),
        footerText: '  Family\n\t memory  ',
      },
    });

    expect(scene.content.footerText).toBe('Family memory');
  });

  it.each([
    ['A4', 'portrait', 210, 297, 1200, 1697],
    ['A4', 'landscape', 297, 210, 1697, 1200],
    ['A3', 'portrait', 297, 420, 1600, 2263],
    ['A3', 'landscape', 420, 297, 2263, 1600],
    ['A2', 'portrait', 420, 594, 2263, 3200],
    ['A2', 'landscape', 594, 420, 3200, 2263],
    ['A1', 'portrait', 594, 841, 3200, 4525],
    ['A1', 'landscape', 841, 594, 4525, 3200],
    ['A0', 'portrait', 841, 1189, 4525, 6400],
    ['A0', 'landscape', 1189, 841, 6400, 4525],
  ] as const)(
    'creates a physical %s %s document with canonical scene dimensions',
    (pageSize, orientation, widthMm, heightMm, width, height) => {
      const document = createPosterDocumentSpec(pageSize, orientation);

      expect(document.physicalSizeMm).toEqual({ width: widthMm, height: heightMm });
      expect(document.sceneSize).toEqual({ width, height });
    }
  );

  it('uses memory-safe raster scales for large physical poster formats', () => {
    expect(getPosterRasterScale('A4')).toBe(2);
    expect(getPosterRasterScale('A3')).toBe(2);
    expect(getPosterRasterScale('A2')).toBe(1.5);
    expect(getPosterRasterScale('A1')).toBe(1);
    expect(getPosterRasterScale('A0')).toBe(1);

    const scene = createPosterScene({
      graph: createAncestorGraph(3),
      document: createPosterDocumentSpec('A0', 'portrait'),
      content: createContent(3),
    });
    expect(scene.quality.status).toBe('warning');
    expect(scene.quality.metrics.effectiveDpi).toBeGreaterThanOrEqual(120);
    expect(scene.quality.metrics.estimatedMemoryBytes).toBeLessThan(128 * 1024 * 1024);
  });

  it('creates distinct Classic, Modern, and Dense card systems on shared geometry contracts', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const classic = createPosterScene({ graph, document, content: createContent(3), stylePreset: 'classic-heritage' });
    const modern = createPosterScene({ graph, document, content: createContent(3), stylePreset: 'modern-gallery' });
    const dense = createPosterScene({ graph, document, content: createContent(3), stylePreset: 'dense-genealogy' });

    expect(classic.cardPreset.id).toBe('classic-heritage');
    expect(modern.cardPreset.id).toBe('modern-gallery');
    expect(dense.cardPreset.id).toBe('dense-genealogy');
    expect(classic.decoration).toBe('paper-grain');
    expect(modern.decoration).toBe('clean');
    expect(dense.decoration).toBe('clean');
    expect(classic.ornament).toBe('lineage-medallion');
    expect(modern.ornament).toBe('gallery-marks');
    expect(dense.ornament).toBe('none');
    expect(classic.typographyPreset).toBe('balanced');
    expect(modern.typographyPreset).toBe('balanced');
    expect(dense.typographyPreset).toBe('balanced');
    expect(classic.fontFamily).toBe('amiri');
    expect(modern.fontFamily).toBe('noto-sans-arabic');
    expect(dense.fontFamily).toBe('noto-sans-arabic');
    expect(classic.cardScalePreset).toBe('standard');
    expect(modern.cardScalePreset).toBe('standard');
    expect(dense.cardScalePreset).toBe('standard');
    expect(classic.cardEffectPreset).toBe('soft');
    expect(modern.cardEffectPreset).toBe('elevated');
    expect(dense.cardEffectPreset).toBe('flat');
    expect(classic.cardFramePreset).toBe('classic');
    expect(modern.cardFramePreset).toBe('minimal');
    expect(dense.cardFramePreset).toBe('minimal');
    expect(classic.cardCornerPreset).toBe('soft');
    expect(modern.cardCornerPreset).toBe('rounded');
    expect(dense.cardCornerPreset).toBe('square');
    expect(classic.cardLayoutPreset).toBe('photo-focused');
    expect(modern.cardLayoutPreset).toBe('photo-focused');
    expect(dense.cardLayoutPreset).toBe('standard');
    expect(classic.pageFramePreset).toBe('heritage');
    expect(modern.pageFramePreset).toBe('gallery');
    expect(dense.pageFramePreset).toBe('minimal');
    expect(classic.headerPreset).toBe('ceremonial');
    expect(modern.headerPreset).toBe('gallery-rail');
    expect(dense.headerPreset).toBe('registry');
    expect(classic.connectorPathStyle).toBe('curved');
    expect(modern.connectorPathStyle).toBe('straight');
    expect(dense.connectorPathStyle).toBe('orthogonal');
    expect(classic.layout.spacingPreset).toBe('balanced');
    expect(modern.layout.spacingPreset).toBe('airy');
    expect(dense.layout.spacingPreset).toBe('compact');
    expect(modern.cardPreset.theme).toBe('modern');
    expect(dense.cardPreset.geometry.height).toBeLessThan(classic.cardPreset.geometry.height);
    expect(dense.cardPreset.geometry.maxWidth).toBeLessThan(classic.cardPreset.geometry.maxWidth);

    const modernSvg = renderPosterSceneToSvg({ scene: modern }).svg;
    const denseSvg = renderPosterSceneToSvg({ scene: dense }).svg;
    expect(modernSvg).toContain('data-poster-theme="modern-gallery"');
    expect(modernSvg).toContain('poster-frame-modern');
    expect(denseSvg).toContain('data-poster-theme="dense-genealogy"');
    expect(denseSvg).toContain('poster-frame-dense');
  });

  it('applies an owner-selected photo shape without changing layout geometry', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const circle = createPosterScene({ graph, document, content: createContent(3), photoShape: 'circle' });
    const rounded = createPosterScene({ graph, document, content: createContent(3), photoShape: 'rounded' });

    expect(circle.cardPreset.photo.shape).toBe('circle');
    expect(rounded.cardPreset.photo.shape).toBe('rounded');
    expect(rounded.nodes.map((node) => node.rect)).toEqual(circle.nodes.map((node) => node.rect));
    expect(rounded.connectors).toEqual(circle.connectors);
  });

  it('changes typography density while preserving card and connector geometry', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const balanced = createPosterScene({ graph, document, content: createContent(3), typographyPreset: 'balanced' });
    const prominent = createPosterScene({ graph, document, content: createContent(3), typographyPreset: 'prominent' });
    const compact = createPosterScene({ graph, document, content: createContent(3), typographyPreset: 'compact' });

    expect(prominent.nodes.map((node) => node.rect)).toEqual(balanced.nodes.map((node) => node.rect));
    expect(compact.nodes.map((node) => node.rect)).toEqual(balanced.nodes.map((node) => node.rect));
    expect(prominent.connectors).toEqual(balanced.connectors);
    expect(compact.connectors).toEqual(balanced.connectors);
    expect(prominent.cardPreset.typography.nameSize).toBeGreaterThan(balanced.cardPreset.typography.nameSize);
    expect(compact.cardPreset.typography.nameSize).toBeLessThan(balanced.cardPreset.typography.nameSize);
  });

  it('selects an embedded Arabic font family without changing canonical geometry', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const content = createContent(3);
    const amiri = createPosterScene({ graph, document, content, fontFamily: 'amiri' });
    const kufi = createPosterScene({ graph, document, content, fontFamily: 'noto-kufi-arabic' });

    expect(kufi.nodes.map((node) => node.rect)).toEqual(amiri.nodes.map((node) => node.rect));
    expect(kufi.connectors).toEqual(amiri.connectors);
    expect(amiri.fontFamily).toBe('amiri');
    expect(kufi.fontFamily).toBe('noto-kufi-arabic');
  });

  it('changes poster ornament without changing canonical tree geometry', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const content = createContent(3);
    const none = createPosterScene({ graph, document, content, ornament: 'none' });
    const branches = createPosterScene({ graph, document, content, ornament: 'corner-branches' });

    expect(branches.nodes.map((node) => node.rect)).toEqual(none.nodes.map((node) => node.rect));
    expect(branches.connectors).toEqual(none.connectors);
    expect(none.ornament).toBe('none');
    expect(branches.ornament).toBe('corner-branches');
  });

  it('reflows canonical geometry for owner-selected person card sizes', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const compact = createPosterScene({ graph, document, content: createContent(3), cardScalePreset: 'compact' });
    const standard = createPosterScene({ graph, document, content: createContent(3), cardScalePreset: 'standard' });
    const large = createPosterScene({ graph, document, content: createContent(3), cardScalePreset: 'large' });

    expect(compact.cardPreset.geometry.height).toBeLessThan(standard.cardPreset.geometry.height);
    expect(large.cardPreset.geometry.height).toBeGreaterThan(standard.cardPreset.geometry.height);
    expect(compact.nodes[0].rect.height).toBeLessThan(standard.nodes[0].rect.height);
    expect(large.nodes[0].rect.height).toBeGreaterThan(standard.nodes[0].rect.height);
    expect(compact.quality.evaluated).toBe(true);
    expect(large.quality.evaluated).toBe(true);
  });

  it('keeps card depth effects separate from layout geometry', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const flat = createPosterScene({ graph, document, content: createContent(3), cardEffectPreset: 'flat' });
    const elevated = createPosterScene({ graph, document, content: createContent(3), cardEffectPreset: 'elevated' });

    expect(elevated.nodes.map((node) => node.rect)).toEqual(flat.nodes.map((node) => node.rect));
    expect(elevated.connectors).toEqual(flat.connectors);
    expect(flat.cardEffectPreset).toBe('flat');
    expect(elevated.cardEffectPreset).toBe('elevated');
  });

  it('keeps card frame detail separate from layout geometry', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const minimal = createPosterScene({ graph, document, content: createContent(3), cardFramePreset: 'minimal' });
    const ornate = createPosterScene({ graph, document, content: createContent(3), cardFramePreset: 'ornate' });

    expect(ornate.nodes.map((node) => node.rect)).toEqual(minimal.nodes.map((node) => node.rect));
    expect(ornate.connectors).toEqual(minimal.connectors);
    expect(minimal.cardFramePreset).toBe('minimal');
    expect(ornate.cardFramePreset).toBe('ornate');
  });

  it('changes card corner geometry without moving cards or connectors', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const square = createPosterScene({ graph, document, content: createContent(3), cardCornerPreset: 'square' });
    const rounded = createPosterScene({ graph, document, content: createContent(3), cardCornerPreset: 'rounded' });

    expect(rounded.nodes.map((node) => node.rect)).toEqual(square.nodes.map((node) => node.rect));
    expect(rounded.connectors).toEqual(square.connectors);
    expect(square.cardPreset.geometry.borderRadius).toBe(0);
    expect(rounded.cardPreset.geometry.borderRadius).toBeGreaterThan(0);
  });

  it('reflows canonical geometry for standard, photo-focused, and text-minimal card layouts', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const content = createContent(3);
    const standard = createPosterScene({ graph, document, content, cardLayoutPreset: 'standard' });
    const photoFocused = createPosterScene({ graph, document, content, cardLayoutPreset: 'photo-focused' });
    const textMinimal = createPosterScene({ graph, document, content, cardLayoutPreset: 'text-minimal' });

    expect(photoFocused.cardPreset.photo.preferredDiameter).toBeGreaterThan(standard.cardPreset.photo.preferredDiameter);
    expect(photoFocused.cardPreset.geometry.height).toBeGreaterThan(standard.cardPreset.geometry.height);
    expect(textMinimal.cardPreset.photo.preferredDiameter).toBe(0);
    expect(textMinimal.cardPreset.geometry.height).toBeLessThan(standard.cardPreset.geometry.height);
    expect(photoFocused.nodes.map((node) => node.previewId)).toEqual(standard.nodes.map((node) => node.previewId));
    expect(textMinimal.nodes.map((node) => node.previewId)).toEqual(standard.nodes.map((node) => node.previewId));
    expect(photoFocused.quality.evaluated).toBe(true);
    expect(textMinimal.quality.evaluated).toBe(true);
  });

  it('reflows the scene through compact, balanced, and generous print margins', () => {
    const graph = createAncestorGraph(3);
    const content = createContent(3);
    const compact = createPosterScene({
      graph,
      document: createPosterDocumentSpec('A3', 'landscape', 'compact'),
      content,
    });
    const balanced = createPosterScene({
      graph,
      document: createPosterDocumentSpec('A3', 'landscape', 'balanced'),
      content,
    });
    const generous = createPosterScene({
      graph,
      document: createPosterDocumentSpec('A3', 'landscape', 'generous'),
      content,
    });

    expect(compact.document.marginsMm.left).toBeLessThan(balanced.document.marginsMm.left);
    expect(generous.document.marginsMm.left).toBeGreaterThan(balanced.document.marginsMm.left);
    expect(compact.bounds.content.width).toBeGreaterThan(balanced.bounds.content.width);
    expect(generous.bounds.content.width).toBeLessThan(balanced.bounds.content.width);
    expect(compact.quality.evaluated).toBe(true);
    expect(generous.quality.evaluated).toBe(true);
  });

  it('reflows dense generations through bounded spacing presets', () => {
    const graph = createAncestorGraph(4);
    const document = createPosterDocumentSpec('A4', 'portrait');
    const content = createContent(4);
    const compact = createPosterScene({ graph, document, content, spacingPreset: 'compact' });
    const airy = createPosterScene({ graph, document, content, spacingPreset: 'airy' });

    expect(compact.layout.spacingPreset).toBe('compact');
    expect(airy.layout.spacingPreset).toBe('airy');
    expect(compact.nodes.map((node) => node.previewId)).toEqual(airy.nodes.map((node) => node.previewId));
    expect(compact.nodes.at(-1)!.rect.width).toBeGreaterThan(airy.nodes.at(-1)!.rect.width);
    expect(compact.quality.evaluated).toBe(true);
    expect(airy.quality.evaluated).toBe(true);
  });

  it('keeps page frame composition separate from tree geometry', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const none = createPosterScene({ graph, document, content: createContent(3), pageFramePreset: 'none' });
    const heritage = createPosterScene({ graph, document, content: createContent(3), pageFramePreset: 'heritage' });

    expect(heritage.nodes.map((node) => node.rect)).toEqual(none.nodes.map((node) => node.rect));
    expect(heritage.connectors).toEqual(none.connectors);
    expect(none.pageFramePreset).toBe('none');
    expect(heritage.pageFramePreset).toBe('heritage');
  });

  it('changes header composition without changing canonical tree geometry', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const ceremonial = createPosterScene({ graph, document, content: createContent(3), headerPreset: 'ceremonial' });
    const gallery = createPosterScene({ graph, document, content: createContent(3), headerPreset: 'gallery-rail' });
    const registry = createPosterScene({ graph, document, content: createContent(3), headerPreset: 'registry' });

    expect(gallery.nodes.map((node) => node.rect)).toEqual(ceremonial.nodes.map((node) => node.rect));
    expect(registry.connectors).toEqual(ceremonial.connectors);
    expect(ceremonial.headerPreset).toBe('ceremonial');
    expect(gallery.headerPreset).toBe('gallery-rail');
    expect(registry.headerPreset).toBe('registry');
  });

  it('keeps connector path styling separate from canonical endpoints', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const straight = createPosterScene({ graph, document, content: createContent(3), connectorPathStyle: 'straight' });
    const curved = createPosterScene({ graph, document, content: createContent(3), connectorPathStyle: 'curved' });

    expect(curved.nodes.map((node) => node.rect)).toEqual(straight.nodes.map((node) => node.rect));
    expect(curved.connectors).toEqual(straight.connectors);
    expect(straight.connectorPathStyle).toBe('straight');
    expect(curved.connectorPathStyle).toBe('curved');
  });

  it('keeps card content choices separate from canonical layout geometry', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A3', 'landscape');
    const baseline = createPosterScene({ graph, document, content: createContent(3) });
    const customized = createPosterScene({
      graph,
      document,
      content: {
        ...createContent(3),
        showYears: false,
        showRelationship: true,
        showDescription: true,
      },
    });

    expect(customized.nodes.map((node) => node.rect)).toEqual(baseline.nodes.map((node) => node.rect));
    expect(customized.connectors).toEqual(baseline.connectors);
    expect(customized.content.showDescription).toBe(true);
    expect(customized.nodes[0].relationshipHint).toBe('root');
    expect(customized.nodes[1].relationshipHint).toBe('ancestor');
  });

  it('keeps Dense Genealogy compact without dropping names below the print floor', () => {
    const graph = createAncestorGraph(3);
    const readableGraph: SanitizedPreviewGraph = {
      ...graph,
      nodes: graph.nodes.map((node, index) => ({
        ...node,
        displayName: index === 0 ? '\u0631\u0645\u0636\u0627\u0646 \u0627\u0644\u0642\u0631\u062c\u064a' : `\u0634\u062e\u0635 ${index + 1}`,
      })),
    };
    const scene = createPosterScene({
      graph: readableGraph,
      document: createPosterDocumentSpec('A3', 'landscape'),
      content: createContent(3),
      stylePreset: 'dense-genealogy',
      direction: 'horizontal',
    });

    expect(scene.cardPreset.typography.nameSize).toBe(22);
    expect(scene.cardPreset.geometry.height).toBe(124);
    expect(scene.cardPreset.photo.preferredDiameter).toBe(34);
    expect(scene.quality.metrics.minimumFontSizePt).toBeGreaterThanOrEqual(8);
    expect(scene.quality.status).not.toBe('blocked');
  });

  it.each([1, 2, 3, 4] as const)(
    'lays out a complete %s-generation sanitized ancestor graph inside page bounds',
    (generationCount) => {
      const graph = createAncestorGraph(generationCount);
      const scene = createPosterScene({
        graph,
        document: createPosterDocumentSpec('A4', 'portrait'),
        content: createContent(generationCount),
      });

      expect(scene.layout.engineId).toBe('ancestor-tiered');
      expect(scene.nodes).toHaveLength((2 ** generationCount) - 1);
      expect(scene.connectors).toHaveLength(scene.nodes.length - 1);
      scene.nodes.forEach((node) => {
        expect(node.rect.x).toBeGreaterThanOrEqual(0);
        expect(node.rect.y).toBeGreaterThanOrEqual(0);
        expect(node.rect.x + node.rect.width).toBeLessThanOrEqual(scene.document.sceneSize.width);
        expect(node.rect.y + node.rect.height).toBeLessThanOrEqual(scene.document.sceneSize.height);
      });
    }
  );

  it('passes the exact same PosterScene geometry to preview, PNG, and PDF boundaries', async () => {
    const scene = createPosterScene({
      graph: createAncestorGraph(4),
      document: createPosterDocumentSpec('A3', 'landscape'),
      content: createContent(4),
    });
    const preview = renderPosterSceneToSvg({ scene });
    const renderPng = vi.fn<NonNullable<StudioPosterExportRuntime['renderPng']>>()
      .mockResolvedValue(new Blob(['png'], { type: 'image/png' }));
    const renderPdf = vi.fn<NonNullable<StudioPosterExportRuntime['renderPdf']>>()
      .mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }));

    const png = await exportStudioPoster({ scene, format: 'png' }, { renderPng });
    const pdf = await exportStudioPoster({ scene, format: 'pdf' }, { renderPdf });

    expect(preview.scene).toBe(scene);
    expect(png.renderResult.scene).toBe(scene);
    expect(pdf.renderResult.scene).toBe(scene);
    expect(png.renderResult.scene.nodes).toEqual(preview.scene.nodes);
    expect(pdf.renderResult.scene.connectors).toEqual(preview.scene.connectors);
    expect(png.renderResult.scene.bounds).toEqual(pdf.renderResult.scene.bounds);
    expect(renderPng.mock.calls[0][0].renderResult.scene).toBe(scene);
    expect(renderPdf.mock.calls[0][0].renderResult.scene).toBe(scene);
  });

  it('supports vertical and horizontal ancestor flow without changing the physical document', () => {
    const graph = createAncestorGraph(3);
    const document = createPosterDocumentSpec('A4', 'landscape');
    const vertical = createPosterScene({ graph, document, content: createContent(3), direction: 'vertical' });
    const horizontal = createPosterScene({ graph, document, content: createContent(3), direction: 'horizontal' });
    const verticalRoot = vertical.nodes.find((node) => node.generation === 1)!;
    const verticalOldest = vertical.nodes.find((node) => node.generation === 3)!;
    const horizontalRoot = horizontal.nodes.find((node) => node.generation === 1)!;
    const horizontalOldest = horizontal.nodes.find((node) => node.generation === 3)!;

    expect(verticalRoot.rect.y).toBeGreaterThan(verticalOldest.rect.y);
    expect(horizontalRoot.rect.x).toBeGreaterThan(horizontalOldest.rect.x);
    expect(horizontal.document).toBe(document);
    expect(horizontal.bounds.page).toEqual(vertical.bounds.page);
  });

  it('uses descendant-tiered geometry with the root before later generations', () => {
    const scene = createPosterScene({
      graph: createDescendantGraph(3),
      document: createPosterDocumentSpec('A3', 'portrait'),
      content: {
        ...createContent(3),
        title: 'Descendant Tree',
        scope: 'selected-root-descendants',
      },
      direction: 'vertical',
    });
    const root = scene.nodes.find((node) => node.generation === 1)!;
    const lastGeneration = scene.nodes.find((node) => node.generation === 3)!;

    expect(scene.layout.engineId).toBe('descendant-tiered');
    expect(scene.nodes).toHaveLength(7);
    expect(scene.connectors).toHaveLength(6);
    expect(root.rect.y).toBeLessThan(lastGeneration.rect.y);
    const svg = renderPosterSceneToSvg({ scene }).svg;
    expect(svg).toContain('data-poster-layout-engine="descendant-tiered"');
    expect(svg).toContain('النطاق: الأحفاد');
  });

  it.each(['horizontal', 'vertical'] as const)(
    'centers a compact %s selected branch composition without changing printable tree bounds',
    (direction) => {
      const document = createPosterDocumentSpec('A3', 'landscape');
      const request = {
        graph: createSelectedBranchGraph(),
        document,
        content: {
          ...createContent(3),
          language: 'en' as const,
          title: 'Selected Family Branch',
          scope: 'selected-branch' as const,
        },
        direction,
      };
      const scene = createPosterScene(request);
      const repeatedScene = createPosterScene(request);
      const occupied = getNodeBounds(scene);
      const treeCenterX = scene.bounds.tree.x + (scene.bounds.tree.width / 2);
      const treeCenterY = scene.bounds.tree.y + (scene.bounds.tree.height / 2);
      const occupiedCenterX = occupied.minX + (occupied.width / 2);
      const occupiedCenterY = occupied.minY + (occupied.height / 2);

      expect(scene.nodes).toEqual(repeatedScene.nodes);
      expect(scene.bounds.tree).toEqual(scene.layout.treeBounds);
      expect(occupied.width / scene.bounds.tree.width).toBeLessThan(0.7);
      expect(occupied.height / scene.bounds.tree.height).toBeLessThan(0.7);
      expect(Math.abs(occupiedCenterX - treeCenterX)).toBeLessThan(0.1);
      expect(Math.abs(occupiedCenterY - treeCenterY)).toBeLessThan(0.1);
      scene.nodes.forEach((node) => {
        expect(node.rect.x).toBeGreaterThanOrEqual(scene.bounds.tree.x);
        expect(node.rect.y).toBeGreaterThanOrEqual(scene.bounds.tree.y);
        expect(node.rect.x + node.rect.width).toBeLessThanOrEqual(scene.bounds.tree.x + scene.bounds.tree.width);
        expect(node.rect.y + node.rect.height).toBeLessThanOrEqual(scene.bounds.tree.y + scene.bounds.tree.height);
      });
      scene.nodes.forEach((node, index) => {
        scene.nodes.slice(index + 1).forEach((other) => {
          const overlaps = node.rect.x < other.rect.x + other.rect.width
            && node.rect.x + node.rect.width > other.rect.x
            && node.rect.y < other.rect.y + other.rect.height
            && node.rect.y + node.rect.height > other.rect.y;
          expect(overlaps).toBe(false);
        });
      });
    }
  );

  it('keeps the regular descendant scope on the established broad page distribution', () => {
    const graph = createSelectedBranchGraph();
    const document = createPosterDocumentSpec('A3', 'landscape');
    const baseContent = {
      ...createContent(3),
      language: 'en' as const,
      title: 'Family Descendants',
    };
    const branchScene = createPosterScene({
      graph,
      document,
      content: { ...baseContent, scope: 'selected-branch' },
      direction: 'horizontal',
    });
    const descendantScene = createPosterScene({
      graph,
      document,
      content: { ...baseContent, scope: 'selected-root-descendants' },
      direction: 'horizontal',
    });

    expect(getNodeBounds(branchScene).width).toBeLessThan(getNodeBounds(descendantScene).width * 0.75);
    expect(descendantScene.nodes).toHaveLength(branchScene.nodes.length);
    expect(descendantScene.connectors).toHaveLength(branchScene.connectors.length);
  });

  it('uses full-tree overview geometry and preserves every relationship type', () => {
    const scene = createPosterScene({
      graph: createFamilyNetworkGraph(),
      document: createPosterDocumentSpec('A3', 'landscape'),
      content: {
        ...createContent(3),
        language: 'en',
        title: 'Full Family Tree',
        scope: 'full-tree',
        generationCount: 3,
      },
      direction: 'vertical',
    });
    const svg = renderPosterSceneToSvg({ scene }).svg;

    expect(scene.layout.engineId).toBe('full-tree-overview');
    expect(scene.cardPreset.id).toBe('dense-overview');
    expect(scene.nodes).toHaveLength(5);
    expect(scene.nodes.find((node) => node.previewId === 'preview-node-1')?.isRoot).toBe(true);
    expect(scene.connectors.map((connector) => connector.relationshipType)).toEqual(
      expect.arrayContaining(['parent-child', 'spouse', 'relative'])
    );
    expect(svg).toContain('data-poster-layout-engine="full-tree-overview"');
    expect(svg).toContain('poster-overview-node');
    expect(svg).not.toContain('<circle class="poster-avatar"');
    expect(svg).toContain('data-relationship-type="spouse"');
    expect(svg).toContain('data-relationship-type="relative"');
    expect(svg).toContain('Scope: all relationships');
  });

  it('renders a dense complete tree through the dedicated overview layout', () => {
    const nodeCount = 90;
    const nodes = Array.from({ length: nodeCount }, (_, index) => ({
      previewId: `preview-node-${index + 1}`,
      displayName: `Person ${index + 1}`,
      generation: (index % 5) + 1,
      relationshipHint: index === 0 ? 'root' as const : 'relative' as const,
      lifeStatus: 'unknown' as const,
      isMasked: false,
      hasPhoto: false,
    }));
    const edges = nodes.slice(1).map((node, index) => ({
      fromPreviewId: nodes[Math.floor(index / 2)].previewId,
      toPreviewId: node.previewId,
      relationshipType: 'parent-child' as const,
    }));
    const graph: SanitizedPreviewGraph = {
      nodes,
      edges,
      warnings: [],
      metadata: {
        truncated: false,
        sanitizedNodeCount: nodes.length,
        policy: {
          privacyMode: 'masked',
          includePhotos: false,
          includeYears: true,
          maxNodes: nodes.length,
          language: 'en',
        },
      },
    };
    const scene = createPosterScene({
      graph,
      document: createPosterDocumentSpec('A0', 'landscape'),
      content: {
        ...createContent(5),
        language: 'en',
        title: 'Full Family Tree',
        scope: 'full-tree',
      },
      direction: 'horizontal',
    });

    expect(scene.layout.engineId).toBe('full-tree-overview');
    expect(scene.cardPreset.id).toBe('dense-overview');
    expect(scene.layout.treeBounds.y).toBeLessThan(scene.document.sceneSize.height * 0.12);
    expect(scene.nodes).toHaveLength(90);
    expect(scene.connectors).toHaveLength(89);
    expect(scene.nodes.every((node) => (
      node.rect.x >= scene.bounds.page.x
      && node.rect.y >= scene.bounds.page.y
      && node.rect.x + node.rect.width <= scene.bounds.page.x + scene.bounds.page.width
      && node.rect.y + node.rect.height <= scene.bounds.page.y + scene.bounds.page.height
    ))).toBe(true);
    expect(scene.quality.status).toBe('warning');
    expect(scene.quality.metrics.minimumFontSizePt).toBeGreaterThanOrEqual(8);
    expect(scene.quality.metrics.overlappingCardPairs).toBe(0);
    expect(scene.quality.metrics.estimatedMemoryBytes).toBeLessThan(128 * 1024 * 1024);
    expect(scene.quality.metrics.connectorCount).toBe(89);
    expect(scene.quality.warnings).not.toContain('poster.quality.network-too-dense:90:89');
    expect(scene.quality.warnings).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^poster\.quality\.overview-page-too-dense:/)])
    );

    const svg = renderPosterSceneToSvg({ scene }).svg;
    expect(svg.match(/data-preview-node="preview-node-/g)).toHaveLength(90);
    expect(svg).not.toMatch(/rawId|email|phone|photoUrl|supabase/i);

    const a3Scene = createPosterScene({
      graph,
      document: createPosterDocumentSpec('A3', 'landscape'),
      content: {
        ...createContent(5),
        language: 'en',
        title: 'Full Family Tree',
        scope: 'full-tree',
      },
      direction: 'horizontal',
    });

    expect(a3Scene.quality.status).toBe('blocked');
    expect(a3Scene.quality.warnings).toContain(
      'poster.quality.overview-page-too-dense:90:48'
    );
  });

  it('compacts only the full-tree header reservation', () => {
    const document = createPosterDocumentSpec('A3', 'landscape');
    const overview = createPosterScene({
      graph: createFamilyNetworkGraph(),
      document,
      content: {
        ...createContent(3),
        language: 'en',
        title: 'Full Family Tree',
        scope: 'full-tree',
      },
      direction: 'horizontal',
    });
    const detailed = createPosterScene({
      graph: createAncestorGraph(3),
      document,
      content: createContent(3),
      direction: 'horizontal',
    });

    expect(overview.layout.treeBounds.y).toBeLessThan(detailed.layout.treeBounds.y);
    expect(overview.layout.treeBounds.height).toBeGreaterThan(detailed.layout.treeBounds.height);
    expect(detailed.layout.treeBounds.y).toBeCloseTo(
      document.margins.top
        + (document.sceneSize.height * 0.12)
        + Math.max(24, document.sceneSize.height * 0.018),
      5
    );
  });

  it('blocks a full-tree overview that exceeds A0 instead of shrinking it indefinitely', () => {
    const nodeCount = 385;
    const nodes = Array.from({ length: nodeCount }, (_, index) => ({
      previewId: `preview-node-${index + 1}`,
      displayName: `Relative ${index + 1}`,
      generation: (index % 7) + 1,
      relationshipHint: index === 0 ? 'root' as const : 'relative' as const,
      lifeStatus: 'unknown' as const,
      isMasked: false,
      hasPhoto: false,
    }));
    const graph: SanitizedPreviewGraph = {
      nodes,
      edges: nodes.slice(1).map((node, index) => ({
        fromPreviewId: nodes[Math.floor(index / 2)].previewId,
        toPreviewId: node.previewId,
        relationshipType: 'parent-child' as const,
      })),
      warnings: [],
      metadata: {
        truncated: false,
        sanitizedNodeCount: nodeCount,
        policy: {
          privacyMode: 'masked',
          includePhotos: false,
          includeYears: true,
          maxNodes: nodeCount,
          language: 'en',
        },
      },
    };
    const scene = createPosterScene({
      graph,
      document: createPosterDocumentSpec('A0', 'landscape'),
      content: {
        ...createContent(7),
        language: 'en',
        title: 'Full Family Tree',
        scope: 'full-tree',
      },
      direction: 'horizontal',
    });

    expect(scene.nodes).toHaveLength(nodeCount);
    expect(scene.quality.status).toBe('blocked');
    expect(scene.quality.warnings).toContain(
      'poster.quality.overview-page-too-dense:385:384'
    );
  });

  it('omits disconnected nodes and keeps sparse or missing-parent ancestors connected', () => {
    const base = createAncestorGraph(2);
    const sparseGraph: SanitizedPreviewGraph = {
      ...base,
      nodes: [
        base.nodes[0],
        base.nodes[1],
        { ...base.nodes[2], previewId: 'preview-node-99', displayName: 'Disconnected Person' },
      ],
      edges: [base.edges[0]],
      metadata: { ...base.metadata, sanitizedNodeCount: 3 },
    };
    const scene = createPosterScene({
      graph: sparseGraph,
      document: createPosterDocumentSpec('A4', 'portrait'),
      content: createContent(2),
    });

    expect(scene.nodes.map((node) => node.previewId)).toEqual(['preview-node-1', 'preview-node-2']);
    expect(scene.connectors).toHaveLength(1);
    expect(scene.nodes.some((node) => node.displayName === 'Disconnected Person')).toBe(false);
  });

  it('fits long Arabic names, emits Arabic font loading, and keeps mixed RTL/LTR years isolated', () => {
    const graph = createAncestorGraph(2);
    const longName = 'عبد الرحمن بن سليم بن ياسر النور الدمشقي الكبير';
    const longNameGraph: SanitizedPreviewGraph = {
      ...graph,
      nodes: graph.nodes.map((node, index) => index === 2 ? { ...node, displayName: longName } : node),
    };
    const scene = createPosterScene({
      graph: longNameGraph,
      document: createPosterDocumentSpec('A4', 'portrait'),
      content: createContent(2),
    });
    const result = renderPosterSceneToSvg({ scene });
    const longNameNode = scene.nodes.find((node) => node.previewId === 'preview-node-3')!;

    expect(longNameNode.nameFontSize).toBeLessThanOrEqual(scene.cardPreset.typography.nameSize);
    expect(longNameNode.nameFontSize).toBeGreaterThanOrEqual(9);
    expect(longNameNode.initials).toBe('عا');
    expect(result.svg).toContain('عبد الرحمن بن سليم بن ياسر');
    expect(result.svg).toContain('النور الدمشقي الكبير');
    expect(result.svg).not.toContain('@font-face');
    expect(result.svg).not.toContain('/fonts/Amiri-Regular.ttf');
    expect(result.svg).toContain('font-variant-ligatures:common-ligatures contextual');
    expect(result.svg).toContain('1900 - 1970');
    expect(result.svg).not.toMatch(/Ø|Ù|Ã/);
    expect(result.svg).not.toContain('Family tree');
  });

  it('preserves Arabic and privacy masking without leaking raw identifiers or private fields', () => {
    const graph = createAncestorGraph(2);
    const maskedGraph: SanitizedPreviewGraph = {
      ...graph,
      nodes: graph.nodes.map((node, index) => index === 0
        ? { ...node, displayName: 'شخص مخفي', isMasked: true, birthYear: undefined, deathYear: undefined }
        : node),
    };
    const scene = createPosterScene({
      graph: maskedGraph,
      document: createPosterDocumentSpec('A4', 'portrait'),
      content: createContent(2),
    });
    const result = renderPosterSceneToSvg({ scene });
    const serialized = JSON.stringify(scene);

    expect(result.metadata.hasArabicText).toBe(true);
    expect(result.svg).toContain('شجرة أسلاف سليم النور');
    expect(result.svg).toContain('شخص مخفي');
    expect(result.svg).toContain('محمي بموجب الخصوصية');
    expect(serialized).not.toContain('rawId');
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('phone');
    expect(serialized).not.toContain('photoUrl');
    expect(serialized).not.toContain('supabase');
  });

  it('rejects non-session identifiers before they enter scene geometry', () => {
    const graph = createAncestorGraph(2);
    const unsafeGraph: SanitizedPreviewGraph = {
      ...graph,
      nodes: [{ ...graph.nodes[0], previewId: 'database-person-id' }, ...graph.nodes.slice(1)],
    };

    expect(() => createPosterScene({
      graph: unsafeGraph,
      document: createPosterDocumentSpec('A4', 'portrait'),
      content: createContent(2),
    })).toThrow('session-isolated preview IDs only');
  });

  it('evaluates baseline A4/A3 scenes with physical print metrics', () => {
    const pageSizes: PosterPageSize[] = ['A4', 'A3'];

    pageSizes.forEach((pageSize) => {
      const scene = createPosterScene({
        graph: createAncestorGraph(2),
        document: createPosterDocumentSpec(pageSize, 'portrait'),
        content: createContent(2),
      });

      expect(scene.quality.status).toBe('pass');
      expect(scene.quality.evaluated).toBe(true);
      expect(scene.quality.warnings).toEqual([]);
      expect(scene.quality.metrics.effectiveDpi).toBeGreaterThanOrEqual(190);
      expect(scene.quality.metrics.minimumFontSizePt).toBeGreaterThanOrEqual(9);
      expect(scene.quality.metrics.estimatedMemoryBytes).toBeGreaterThan(0);
      expect(scene.quality.metrics.overlappingCardPairs).toBe(0);
    });
  });

  it('blocks an unreadable dense A4 ancestor scene instead of silently approving it', () => {
    const scene = createPosterScene({
      graph: createAncestorGraph(5),
      document: createPosterDocumentSpec('A4', 'portrait'),
      content: createContent(5),
    });

    expect(scene.quality.status).toBe('blocked');
    expect(scene.quality.metrics.overlappingCardPairs).toBeGreaterThan(0);
    expect(scene.quality.warnings).toEqual(
      expect.arrayContaining([expect.stringMatching(/^poster\.quality\.card-overlap:/)])
    );
  });

  it('blocks sanitized selection truncation so an incomplete poster cannot be exported', () => {
    const graph = createAncestorGraph(3);
    const scene = createPosterScene({
      graph: { ...graph, metadata: { ...graph.metadata, truncated: true } },
      document: createPosterDocumentSpec('A3', 'landscape'),
      content: createContent(3),
    });

    expect(scene.quality.status).toBe('blocked');
    expect(scene.quality.warnings).toContain('poster.quality.selection-truncated');
  });
});
