import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createPosterDocumentSpec } from '../posterDocumentSpecs';
import { createTiledWallPosterPlan, findTiledWallPosterGridRecommendation } from '../tiledWallPoster';
import { exportTiledWallPosterArchive } from '../tiledWallPosterExport';
import { createTestPosterScene } from './studioPosterTestFixtures';

function scene() {
  return createTestPosterScene({
    language: 'ar',
    title: '\u0634\u062c\u0631\u0629 \u0627\u0644\u0639\u0627\u0626\u0644\u0629',
    pageSize: 'A0',
    orientation: 'landscape',
    direction: 'horizontal',
    model: {
      definitionId: 'classic-ancestor-poster',
      productType: 'poster',
      layoutEngine: 'poster-layout',
      readingStrategy: 'ancestor',
      mode: 'sanitized-data',
      privacyMode: 'masked',
      nodes: [
        { id: 'preview-node-1', displayName: '\u062c\u0630\u0631 \u0627\u0644\u0639\u0627\u0626\u0644\u0629', generation: 1, isMasked: false, hasPhoto: false },
        { id: 'preview-node-2', displayName: '\u0627\u0644\u0623\u0628', generation: 2, isMasked: false, hasPhoto: false },
        { id: 'preview-node-3', displayName: '\u0627\u0644\u0623\u0645', generation: 2, isMasked: false, hasPhoto: false },
      ],
      edges: [
        { fromId: 'preview-node-2', toId: 'preview-node-1', relationshipType: 'parent-child' },
        { fromId: 'preview-node-3', toId: 'preview-node-1', relationshipType: 'parent-child' },
      ],
      warnings: [],
      metadata: { truncated: false, nodeCount: 3 },
    },
  });
}

describe('Tiled Wall Poster', () => {
  it('derives stable overlapping sheet viewports from one canonical scene', () => {
    const sourceScene = scene();
    const plan = createTiledWallPosterPlan({
      scene: sourceScene,
      sheetDocument: createPosterDocumentSpec('A3', 'landscape'),
      rows: 2,
      columns: 3,
      overlapMm: 10,
    });

    expect(plan.sourceScene).toBe(sourceScene);
    expect(plan.tiles).toHaveLength(6);
    expect(plan.tiles.map((tile) => tile.label)).toEqual(['1-1', '1-2', '1-3', '2-1', '2-2', '2-3']);
    expect(plan.assembledPhysicalSizeMm).toEqual({ width: 1180, height: 544 });
    expect(plan.tiles[1].viewport.x - plan.tiles[0].viewport.x)
      .toBeCloseTo((400 - 10) * plan.sceneUnitsPerMm, 5);
    expect(plan.tiles[0].viewport.width - (plan.tiles[1].viewport.x - plan.tiles[0].viewport.x))
      .toBeCloseTo(10 * plan.sceneUnitsPerMm, 5);
    expect(plan.quality.status).not.toBe('blocked');
    expect(plan.quality.metrics.minimumFontSizePt).toBeGreaterThanOrEqual(5);
    expect(plan.utilization.treeContentSheetCount + plan.utilization.decorativeOnlySheetCount)
      .toBe(plan.tiles.length);
    expect(plan.tiles.every((tile) => tile.treeContent.nodeCount >= 0)).toBe(true);
  });

  it('packages numbered SVG tiles without recalculating scene geometry', async () => {
    const sourceScene = scene();
    const plan = createTiledWallPosterPlan({
      scene: sourceScene,
      sheetDocument: createPosterDocumentSpec('A2', 'landscape'),
      rows: 3,
      columns: 3,
      overlapMm: 8,
    });
    const result = await exportTiledWallPosterArchive({ plan, fileName: 'Family Wall' });
    const zip = await JSZip.loadAsync(result.blob);

    expect(result.fileName).toBe('Family-Wall-tiled-wall.zip');
    expect(result.fileCount).toBe(11);
    const svgFiles = Object.keys(zip.files).filter((name) => name.endsWith('.svg'));
    expect(svgFiles).toHaveLength(9);
    expect(svgFiles).toContain('tiles/01-1-1.svg');
    expect(svgFiles).toContain('tiles/09-3-3.svg');
    const firstSvg = await zip.file('tiles/01-1-1.svg')!.async('string');
    expect(firstSvg).toContain('data-poster-renderer="svg-v1"');
    expect(firstSvg).toContain('data-physical-width-mm="594"');
    expect(firstSvg).toContain('data-physical-height-mm="420"');
    expect(firstSvg).toContain('Tile 1-1');
    expect(firstSvg).toContain('poster-print-sheet-marks');
    expect(firstSvg).toContain('1 / 9 \u00b7 1-1');
    const assembly = JSON.parse(await zip.file('assembly.json')!.async('string')) as Record<string, unknown>;
    expect(assembly).not.toHaveProperty('sourceScene');
    expect(JSON.stringify(assembly)).not.toContain('preview-node-');
    expect(assembly).toHaveProperty('utilization');
    expect(assembly).toHaveProperty('order.0.file', 'tiles/01-1-1.svg');
    const readme = await zip.file('README.txt')!.async('string');
    expect(readme).toContain('الحجم الفعلي 100%');
    expect(readme).toContain('العمود 1 هو أقصى يسار اللوحة');
    expect(readme).toContain('[01 1-1] [02 1-2] [03 1-3]');
    expect(readme).toContain('170.6 × 118.4 سم');
  });

  it('suggests and packages a smaller readable grid without changing the selected plan', async () => {
    const plan = createTiledWallPosterPlan({
      scene: scene(),
      sheetDocument: createPosterDocumentSpec('A2', 'landscape'),
      rows: 6,
      columns: 5,
      overlapMm: 8,
    });
    const recommendation = findTiledWallPosterGridRecommendation(plan);

    expect(plan.rows).toBe(6);
    expect(plan.columns).toBe(5);
    expect(recommendation).toBeDefined();
    expect(recommendation!.sheetCount).toBeLessThan(plan.tiles.length);
    expect(recommendation!.minimumFontSizePt).toBeGreaterThanOrEqual(7);
    expect(recommendation!.decorativeOnlyEdgeSheetCount)
      .toBeLessThan(plan.utilization.decorativeOnlyEdgeSheetCount);

    const result = await exportTiledWallPosterArchive({ plan });
    const zip = await JSZip.loadAsync(result.blob);
    const assembly = JSON.parse(await zip.file('assembly.json')!.async('string')) as {
      gridRecommendation?: { sheetCount: number };
    };
    const readme = await zip.file('README.txt')!.async('string');
    expect(assembly.gridRecommendation?.sheetCount).toBe(recommendation!.sheetCount);
    expect(readme).toContain('اقتراح اختياري لتقليل التكلفة');
  });

  it('rejects invalid grid and overlap requests', () => {
    expect(() => createTiledWallPosterPlan({
      scene: scene(),
      sheetDocument: createPosterDocumentSpec('A4', 'portrait'),
      rows: 0,
      columns: 2,
    })).toThrow(/rows/i);
    expect(() => createTiledWallPosterPlan({
      scene: scene(),
      sheetDocument: createPosterDocumentSpec('A4', 'portrait'),
      rows: 2,
      columns: 2,
      overlapMm: 30,
    })).toThrow(/overlap/i);
  });

  it('blocks a tiled package when the assembled text remains unreadable', async () => {
    const plan = createTiledWallPosterPlan({
      scene: scene(),
      sheetDocument: createPosterDocumentSpec('A4', 'portrait'),
      rows: 1,
      columns: 1,
      overlapMm: 8,
    });

    expect(plan.quality.status).toBe('blocked');
    expect(plan.quality.warnings).toContain('poster.tiled-wall.text-unreadable');
    await expect(exportTiledWallPosterArchive({ plan })).rejects.toThrow(/not printable/i);
  });
});
