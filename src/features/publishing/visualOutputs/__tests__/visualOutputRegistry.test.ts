import { describe, expect, it } from 'vitest';
import {
  getVisualOutputDefinition,
  listVisualOutputDefinitions,
  listVisualOutputDefinitionsByProduct,
  visualOutputSupportsRenderer,
  visualOutputSupportsSize,
  visualOutputSupportsScope,
} from '../visualOutputRegistry';
import type { VisualOutputSize } from '../visualOutputTypes';

describe('Visual Output Product Contract Registry', () => {
  it('registers all current visual outputs', () => {
    const list = listVisualOutputDefinitions();
    expect(list.length).toBe(4);

    const ids = list.map((def) => def.id);
    expect(ids).toContain('classic-ancestor-poster');
    expect(ids).toContain('modern-ancestor-poster');
    expect(ids).toContain('dense-genealogy-poster');
    expect(ids).toContain('current-tree-snapshot');
  });

  it('proves separation of product types', () => {
    const classicDef = getVisualOutputDefinition('classic-ancestor-poster');
    const modernDef = getVisualOutputDefinition('modern-ancestor-poster');
    const snapshotDef = getVisualOutputDefinition('current-tree-snapshot');

    expect(classicDef?.productType).toBe('poster');
    expect(modernDef?.productType).toBe('poster');
    expect(snapshotDef?.productType).toBe('snapshot');
  });

  it('uses SVG as the poster default while keeping PNG and PDF derivation targets', () => {
    const classicDef = getVisualOutputDefinition('classic-ancestor-poster');
    const modernDef = getVisualOutputDefinition('modern-ancestor-poster');
    const snapshotDef = getVisualOutputDefinition('current-tree-snapshot');

    expect(classicDef?.rendererTargets).toContain('png');
    expect(classicDef?.rendererTargets).toContain('pdf');
    expect(classicDef?.rendererTargets).toContain('svg');
    expect(classicDef?.defaultRenderer).toBe('svg');

    expect(modernDef?.rendererTargets).toContain('png');
    expect(modernDef?.rendererTargets).toContain('pdf');
    expect(modernDef?.rendererTargets).toContain('svg');
    expect(modernDef?.defaultRenderer).toBe('svg');
    expect(modernDef?.status).toBe('active');

    expect(snapshotDef?.rendererTargets).toContain('png');
    expect(snapshotDef?.rendererTargets).toContain('pdf');
  });

  it('associates layout engines correctly', () => {
    const classicDef = getVisualOutputDefinition('classic-ancestor-poster');
    const modernDef = getVisualOutputDefinition('modern-ancestor-poster');
    const snapshotDef = getVisualOutputDefinition('current-tree-snapshot');

    expect(classicDef?.layoutEngine).toBe('ancestor-tiered');
    expect(modernDef?.layoutEngine).toBe('ancestor-tiered');
    expect(snapshotDef?.layoutEngine).toBe('tree-layout');
  });

  it('listVisualOutputDefinitionsByProduct returns filtered lists', () => {
    const posters = listVisualOutputDefinitionsByProduct('poster');
    expect(posters.length).toBe(3);
    expect(posters.every((def) => def.productType === 'poster')).toBe(true);

    const snapshots = listVisualOutputDefinitionsByProduct('snapshot');
    expect(snapshots.length).toBe(1);
    expect(snapshots[0].productType).toBe('snapshot');
  });

  it('getVisualOutputDefinition handles unknown IDs safely', () => {
    const unknownDef = getVisualOutputDefinition('unknown-id');
    expect(unknownDef).toBeUndefined();
  });

  it('definitions do not contain unsupported properties', () => {
    const list = listVisualOutputDefinitions();
    list.forEach((def) => {
      // Assert that there are no experimental properties in definition schema
      expect(def).not.toHaveProperty('themeEditor');
      expect(def).not.toHaveProperty('focusMode');
      expect(def).not.toHaveProperty('decorationControls');
      expect(def).not.toHaveProperty('paperSizeControls');
    });
  });

  describe('Capabilities and Options Support Helpers', () => {
    it('declares all print sizes as runtime support for the three SVG poster directions', () => {
      const runtimeSizes: VisualOutputSize[] = ['A4', 'A3', 'A2', 'A1', 'A0'];
      runtimeSizes.forEach((size) => {
        expect(visualOutputSupportsSize('classic-ancestor-poster', size)).toBe(true);
        expect(visualOutputSupportsSize('modern-ancestor-poster', size)).toBe(true);
        expect(visualOutputSupportsSize('dense-genealogy-poster', size)).toBe(true);
      });

      for (const id of ['classic-ancestor-poster', 'modern-ancestor-poster', 'dense-genealogy-poster']) {
        const definition = getVisualOutputDefinition(id);
        expect(definition?.supportedSizes).toEqual(definition?.capabilities.sizes);
      }

      expect(getVisualOutputDefinition('classic-ancestor-poster')?.plannedCapabilities?.sizes)
        .toBeUndefined();
      expect(getVisualOutputDefinition('modern-ancestor-poster')?.plannedCapabilities?.sizes)
        .toBeUndefined();

      expect(visualOutputSupportsSize('classic-ancestor-poster', 'viewport')).toBe(false);
      expect(visualOutputSupportsSize('modern-ancestor-poster', 'custom')).toBe(false);
    });

    it('verifies snapshot product declares only viewport size', () => {
      expect(visualOutputSupportsSize('current-tree-snapshot', 'viewport')).toBe(true);
      expect(visualOutputSupportsSize('current-tree-snapshot', 'A4')).toBe(false);
      expect(visualOutputSupportsSize('current-tree-snapshot', 'A3')).toBe(false);
    });

    it('verifies poster products support selected-root and ancestor-line scopes', () => {
      expect(visualOutputSupportsScope('classic-ancestor-poster', 'selected-root')).toBe(true);
      expect(visualOutputSupportsScope('classic-ancestor-poster', 'selected-branch')).toBe(true);
      expect(visualOutputSupportsScope('classic-ancestor-poster', 'ancestor-line')).toBe(true);
      expect(visualOutputSupportsScope('classic-ancestor-poster', 'full-tree')).toBe(true);

      expect(visualOutputSupportsScope('modern-ancestor-poster', 'selected-root')).toBe(true);
      expect(visualOutputSupportsScope('modern-ancestor-poster', 'selected-branch')).toBe(true);
      expect(visualOutputSupportsScope('modern-ancestor-poster', 'ancestor-line')).toBe(true);
      expect(visualOutputSupportsScope('modern-ancestor-poster', 'branch')).toBe(false);
    });

    it('records ancestor, descendant, and full-tree network scopes as runtime support', () => {
      const classic = getVisualOutputDefinition('classic-ancestor-poster');

      expect(classic?.capabilities.generationDepths).toEqual([1, 2, 3, 4, 'all']);
      expect(classic?.plannedCapabilities?.generationDepths).toBeUndefined();
      expect(classic?.capabilities.scopes).toContain('descendant-line');
      expect(classic?.capabilities.readingStrategies).toContain('descendant');
      expect(classic?.capabilities.layoutEngines).toContain('descendant-tiered');
      expect(classic?.capabilities.scopes).toContain('full-tree');
      expect(classic?.capabilities.readingStrategies).toContain('network');
      expect(classic?.capabilities.layoutEngines).toContain('full-tree-overview');
      expect(classic?.plannedCapabilities?.scopes).toBeUndefined();
      expect(classic?.plannedCapabilities?.readingStrategies).toBeUndefined();
      expect(classic?.plannedCapabilities?.layoutEngines).toBeUndefined();

      expect(visualOutputSupportsScope('classic-ancestor-poster', 'descendant-line')).toBe(true);
      expect(visualOutputSupportsScope('classic-ancestor-poster', 'full-tree')).toBe(true);
    });

    it('verifies snapshot product supports current-tree and visible-nodes scopes', () => {
      expect(visualOutputSupportsScope('current-tree-snapshot', 'current-tree')).toBe(true);
      expect(visualOutputSupportsScope('current-tree-snapshot', 'visible-nodes')).toBe(true);
      expect(visualOutputSupportsScope('current-tree-snapshot', 'ancestor-line')).toBe(false);
    });

    it('verifies SVG, PNG, and PDF support for posters while snapshot stays raster-only', () => {
      expect(visualOutputSupportsRenderer('classic-ancestor-poster', 'png')).toBe(true);
      expect(visualOutputSupportsRenderer('classic-ancestor-poster', 'pdf')).toBe(true);
      expect(visualOutputSupportsRenderer('classic-ancestor-poster', 'svg')).toBe(true);

      expect(visualOutputSupportsRenderer('modern-ancestor-poster', 'png')).toBe(true);
      expect(visualOutputSupportsRenderer('modern-ancestor-poster', 'pdf')).toBe(true);
      expect(visualOutputSupportsRenderer('modern-ancestor-poster', 'svg')).toBe(true);
      expect(visualOutputSupportsRenderer('modern-ancestor-poster', 'html')).toBe(false);

      expect(visualOutputSupportsRenderer('current-tree-snapshot', 'png')).toBe(true);
      expect(visualOutputSupportsRenderer('current-tree-snapshot', 'pdf')).toBe(true);
    });

    it('verifies unknown IDs return false from all helper functions', () => {
      expect(visualOutputSupportsRenderer('unknown-id', 'png')).toBe(false);
      expect(visualOutputSupportsSize('unknown-id', 'A4')).toBe(false);
      expect(visualOutputSupportsScope('unknown-id', 'selected-root')).toBe(false);
    });

    it('marks Studio poster previews as generated while Snapshot retains its placeholder asset', () => {
      const list = listVisualOutputDefinitions();
      list.forEach((def) => {
        expect(def).toHaveProperty('previewAsset');
        expect(def.previewAsset.type).toBe(def.productType === 'poster' ? 'generated' : 'placeholder');
        expect(def.previewAsset.alt.en).toBeTypeOf('string');
        expect(def.previewAsset.alt.ar).toBeTypeOf('string');
        expect(def.previewAsset.aspectRatio).toBeTypeOf('string');

        expect(def).toHaveProperty('recommendedFor');
        expect(def.recommendedFor?.en).toBeInstanceOf(Array);
        expect(def.recommendedFor?.ar).toBeInstanceOf(Array);
        expect(def.recommendedFor?.en.length).toBeGreaterThan(0);
        expect(def.recommendedFor?.ar.length).toBeGreaterThan(0);
      });
    });
  });
});
