import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { createPosterDocumentSpec } from '../posterDocumentSpecs';
import { createBranchPosterCollection } from '../branchPosterCollection';
import {
  exportBranchPosterCollectionArchive,
  getBranchPosterCollectionBlockingWarnings,
} from '../branchPosterCollectionExport';
import type { SanitizedPreviewGraph } from '../previewSanitizerTypes';

function graph(): SanitizedPreviewGraph {
  const names = ['Family Root', 'First Branch', 'Second Branch', 'Grandchild A', 'Grandchild B', 'Branch Spouse'];
  return {
    nodes: names.map((displayName, index) => ({
      previewId: `preview-node-${index + 1}`,
      displayName,
      generation: index === 0 ? 1 : index < 3 ? 2 : 3,
      relationshipHint: index === 0 ? 'root' : index < 3 ? 'child' : 'descendant',
      lifeStatus: 'unknown',
      isMasked: false,
      hasPhoto: false,
    })),
    edges: [
      { fromPreviewId: 'preview-node-1', toPreviewId: 'preview-node-2', relationshipType: 'parent-child' },
      { fromPreviewId: 'preview-node-1', toPreviewId: 'preview-node-3', relationshipType: 'parent-child' },
      { fromPreviewId: 'preview-node-2', toPreviewId: 'preview-node-4', relationshipType: 'parent-child' },
      { fromPreviewId: 'preview-node-3', toPreviewId: 'preview-node-5', relationshipType: 'parent-child' },
      { fromPreviewId: 'preview-node-2', toPreviewId: 'preview-node-6', relationshipType: 'spouse' },
      { fromPreviewId: 'preview-node-4', toPreviewId: 'preview-node-5', relationshipType: 'relative' },
    ],
    warnings: [],
    metadata: {
      truncated: false,
      sanitizedNodeCount: names.length,
      policy: {
        privacyMode: 'masked',
        includePhotos: false,
        includeYears: true,
        maxNodes: names.length,
        language: 'en',
      },
    },
  };
}

describe('Branch Poster Collection foundation', () => {
  it('keeps a ten-branch index readable and structurally printable on A0', () => {
    const branchCount = 10;
    const denseGraph: SanitizedPreviewGraph = {
      nodes: [
        {
          previewId: 'preview-node-1',
          displayName: 'Family Root',
          generation: 1,
          relationshipHint: 'root',
          lifeStatus: 'unknown',
          isMasked: false,
          hasPhoto: false,
        },
        ...Array.from({ length: branchCount }, (_, index) => ({
          previewId: `preview-node-${index + 2}`,
          displayName: `Representative Family Branch ${index + 1}`,
          generation: 2,
          relationshipHint: 'child' as const,
          lifeStatus: 'unknown' as const,
          isMasked: false,
          hasPhoto: index % 2 === 0,
        })),
      ],
      edges: Array.from({ length: branchCount }, (_, index) => ({
        fromPreviewId: 'preview-node-1',
        toPreviewId: `preview-node-${index + 2}`,
        relationshipType: 'parent-child' as const,
      })),
      warnings: [],
      metadata: {
        truncated: false,
        sanitizedNodeCount: branchCount + 1,
        policy: {
          privacyMode: 'masked',
          includePhotos: true,
          includeYears: true,
          maxNodes: branchCount + 1,
          language: 'en',
        },
      },
    };
    const result = createBranchPosterCollection({
      graph: denseGraph,
      anchorPreviewId: 'preview-node-1',
      collectionTitle: 'Large Family Branch Index',
      language: 'en',
      document: createPosterDocumentSpec('A0', 'landscape'),
      stylePreset: 'dense-genealogy',
    });

    expect(result.itemCount).toBe(branchCount);
    expect(result.overviewScene.nodes).toHaveLength(branchCount + 1);
    expect(result.overviewScene.cardPreset.id).toBe('branch-index');
    expect(result.overviewScene.quality.metrics.overlappingCardPairs).toBe(0);
    expect(result.overviewScene.quality.status).not.toBe('blocked');
    expect(result.overviewScene.nodes.every((node) => !node.hasPhoto)).toBe(true);
  });

  it('creates stable descendant posters for every direct branch', () => {
    const result = createBranchPosterCollection({
      graph: graph(),
      anchorPreviewId: 'preview-node-1',
      collectionTitle: 'Family Branch Collection',
      language: 'en',
      document: createPosterDocumentSpec('A3', 'landscape', 'generous'),
      photoShape: 'rounded',
      showYears: false,
      showRelationship: true,
      showBirthPlace: true,
      showOccupation: true,
      showDescription: true,
      footerText: 'Family memory',
      showJozorAttribution: false,
      connectorStyle: 'bold',
      connectorPathStyle: 'orthogonal',
      spacingPreset: 'airy',
      colorPalette: 'monochrome-print',
      decoration: 'lineage-grid',
      ornament: 'corner-branches',
      typographyPreset: 'prominent',
      fontFamily: 'noto-kufi-arabic',
      cardScalePreset: 'large',
      cardEffectPreset: 'elevated',
      cardFramePreset: 'ornate',
      cardCornerPreset: 'rounded',
      cardLayoutPreset: 'photo-focused',
      pageFramePreset: 'gallery',
      headerPreset: 'registry',
      colorOverrides: {
        background: '#112233',
        cardBackground: '#fefefe',
        accent: '#cc5500',
        connector: '#008877',
      },
    });

    expect(result.product).toBe('branch-collection');
    expect(result.itemCount).toBe(2);
    expect(result.representedPeople).toBe(5);
    expect(result.overviewScene.layout.engineId).toBe('branch-index-grid');
    expect(result.overviewScene.nodes).toHaveLength(3);
    expect(result.overviewScene.nodes[1].displayName).toContain('01 \u00b7 First Branch \u00b7 People: 3');
    expect(result.overviewScene.nodes.every((node) => !node.hasPhoto)).toBe(true);
    expect(result.items.every((item) => item.scene.cardPreset.photo.shape === 'rounded')).toBe(true);
    expect(result.items.every((item) => item.scene.content.showYears === false)).toBe(true);
    expect(result.items.every((item) => item.scene.content.showRelationship === true)).toBe(true);
    expect(result.items.every((item) => item.scene.content.showBirthPlace === true)).toBe(true);
    expect(result.items.every((item) => item.scene.content.showOccupation === true)).toBe(true);
    expect(result.items.every((item) => item.scene.content.showDescription === true)).toBe(true);
    expect(result.items.every((item) => item.scene.content.footerText === 'Family memory')).toBe(true);
    expect(result.items.every((item) => item.scene.content.showJozorAttribution === false)).toBe(true);
    expect(result.items.every((item) => item.scene.layout.connectorStyle === 'bold')).toBe(true);
    expect(result.items.every((item) => item.scene.connectorPathStyle === 'orthogonal')).toBe(true);
    expect(result.items.every((item) => item.scene.layout.spacingPreset === 'airy')).toBe(true);
    expect(result.items.every((item) => item.scene.colorPalette === 'monochrome-print')).toBe(true);
    expect(result.items.every((item) => item.scene.colorOverrides?.accent === '#cc5500')).toBe(true);
    expect(result.items.every((item) => item.scene.decoration === 'lineage-grid')).toBe(true);
    expect(result.items.every((item) => item.scene.ornament === 'corner-branches')).toBe(true);
    expect(result.items.every((item) => item.scene.typographyPreset === 'prominent')).toBe(true);
    expect(result.items.every((item) => item.scene.fontFamily === 'noto-kufi-arabic')).toBe(true);
    expect(result.items.every((item) => item.scene.cardScalePreset === 'large')).toBe(true);
    expect(result.items.every((item) => item.scene.cardEffectPreset === 'elevated')).toBe(true);
    expect(result.items.every((item) => item.scene.cardFramePreset === 'ornate')).toBe(true);
    expect(result.items.every((item) => item.scene.cardCornerPreset === 'rounded')).toBe(true);
    expect(result.items.every((item) => item.scene.cardLayoutPreset === 'photo-focused')).toBe(true);
    expect(result.items.every((item) => item.scene.document.marginPreset === 'generous')).toBe(true);
    expect(result.items.every((item) => item.scene.pageFramePreset === 'gallery')).toBe(true);
    expect(result.items.every((item) => item.scene.headerPreset === 'registry')).toBe(true);
    expect(result.overviewScene.colorPalette).toBe('monochrome-print');
    expect(result.overviewScene.connectorPathStyle).toBe('orthogonal');
    expect(result.overviewScene.layout.spacingPreset).toBe('airy');
    expect(result.overviewScene.decoration).toBe('lineage-grid');
    expect(result.overviewScene.ornament).toBe('corner-branches');
    expect(result.overviewScene.typographyPreset).toBe('prominent');
    expect(result.overviewScene.fontFamily).toBe('noto-kufi-arabic');
    expect(result.overviewScene.cardScalePreset).toBe('large');
    expect(result.overviewScene.cardEffectPreset).toBe('elevated');
    expect(result.overviewScene.cardFramePreset).toBe('ornate');
    expect(result.overviewScene.cardCornerPreset).toBe('rounded');
    expect(result.overviewScene.cardLayoutPreset).toBe('photo-focused');
    expect(result.overviewScene.document.marginPreset).toBe('generous');
    expect(result.overviewScene.pageFramePreset).toBe('gallery');
    expect(result.overviewScene.headerPreset).toBe('registry');
    expect(result.overviewScene.colorOverrides).toEqual({
      background: '#112233',
      cardBackground: '#fefefe',
      accent: '#cc5500',
      connector: '#008877',
    });
    expect(result.overviewScene.content.footerText).toBe('Family memory');
    expect(result.overviewScene.content.showJozorAttribution).toBe(false);
    expect(result.overviewScene.content.showRelationship).toBe(false);
    expect(result.overviewScene.cardPreset.photo.preferredDiameter).toBe(0);
    expect(result.items.map((item) => item.branchRootPreviewId)).toEqual([
      'preview-node-2',
      'preview-node-3',
    ]);
    expect(result.items[0].graph.nodes.map((node) => node.previewId)).toEqual([
      'preview-node-2',
      'preview-node-4',
      'preview-node-6',
    ]);
    expect(result.items[0].scene.layout.engineId).toBe('descendant-tiered');
    expect(result.items[0].scene.content.title).toBe('Branch First Branch');
  });

  it('keeps external relationships as cross references without leaking them into branch geometry', () => {
    const result = createBranchPosterCollection({
      graph: graph(),
      anchorPreviewId: 'preview-node-1',
      collectionTitle: 'Branches',
      language: 'en',
      document: createPosterDocumentSpec('A4', 'portrait'),
    });

    expect(result.items[0].crossReferences).toEqual(['preview-node-5']);
    expect(result.items[0].graph.nodes.map((node) => node.previewId)).toContain('preview-node-6');
    expect(result.items[0].scene.connectors).toHaveLength(2);
    expect(JSON.stringify(result)).not.toMatch(/email|phone|photoUrl|storageUrl|rawId/);
  });

  it('returns a truthful empty collection when the anchor has no branches', () => {
    const result = createBranchPosterCollection({
      graph: graph(),
      anchorPreviewId: 'preview-node-4',
      collectionTitle: 'Leaf Branches',
      language: 'en',
      document: createPosterDocumentSpec('A4', 'portrait'),
    });

    expect(result.items).toEqual([]);
    expect(result.warnings).toContain('poster.branch-collection.no-descendant-branches');
  });

  it('rejects raw identifiers at the collection boundary', () => {
    expect(() => createBranchPosterCollection({
      graph: graph(),
      anchorPreviewId: 'raw-person-id',
      collectionTitle: 'Unsafe',
      language: 'en',
      document: createPosterDocumentSpec('A4', 'portrait'),
    })).toThrow('session-isolated preview IDs only');
  });

  it('exports an overview, ordered SVG posters, and a public manifest archive', async () => {
    const collection = createBranchPosterCollection({
      graph: graph(),
      anchorPreviewId: 'preview-node-1',
      collectionTitle: 'Family Branch Collection',
      language: 'en',
      document: createPosterDocumentSpec('A3', 'landscape'),
    });
    const result = await exportBranchPosterCollectionArchive({ collection });
    const zip = await JSZip.loadAsync(result.blob);
    const files = Object.keys(zip.files).sort();

    expect(result.fileName).toBe('Family-Branch-Collection-branch-collection.zip');
    expect(result.fileCount).toBe(5);
    expect(files).toEqual(expect.arrayContaining([
      'README.txt',
      'manifest.json',
      'overview.svg',
      'branches/01-Branch-First-Branch.svg',
      'branches/02-Branch-Second-Branch.svg',
    ]));
    const manifest = await zip.file('manifest.json')!.async('string');
    expect(manifest).toContain('"product": "branch-collection"');
    expect(manifest).not.toMatch(/preview-node|rawId|photoUrl|storageUrl/);
    const overview = await zip.file('overview.svg')!.async('string');
    expect(overview).toContain('data-poster-layout-engine="branch-index-grid"');
    expect(overview).toContain('Branch index \u00b7 2 posters \u00b7 5 people');
    expect(overview).toContain('01 \u00b7 First Branch \u00b7 People: 3');
    const readme = await zip.file('README.txt')!.async('string');
    expect(readme).toContain('direct partners');
    expect(manifest).toContain('"pageSize": "A3"');
    expect(manifest).toContain('"overviewKind": "branch-index"');
    expect(manifest).toContain('"embeddedPhotoCount": 0');
  });

  it('reports print-blocking scenes before a download action is offered', () => {
    const collection = createBranchPosterCollection({
      graph: graph(),
      anchorPreviewId: 'preview-node-1',
      collectionTitle: 'Branches',
      language: 'en',
      document: createPosterDocumentSpec('A3', 'landscape'),
    });
    const blockedCollection = {
      ...collection,
      items: [{
        ...collection.items[0],
        scene: {
          ...collection.items[0].scene,
          quality: {
            ...collection.items[0].scene.quality,
            warnings: ['poster.quality.card-overlap:2'],
          },
        },
      }, ...collection.items.slice(1)],
    };

    expect(getBranchPosterCollectionBlockingWarnings(blockedCollection)).toEqual([
      'Branch First Branch:poster.quality.card-overlap:2',
    ]);
  });
});
