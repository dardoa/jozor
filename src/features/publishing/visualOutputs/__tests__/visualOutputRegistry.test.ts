import { describe, expect, it } from 'vitest';
import {
  getVisualOutputDefinition,
  listVisualOutputDefinitions,
  listVisualOutputDefinitionsByProduct,
} from '../visualOutputRegistry';

describe('Visual Output Product Contract Registry', () => {
  it('registers all current visual outputs', () => {
    const list = listVisualOutputDefinitions();
    expect(list.length).toBe(3);

    const ids = list.map((def) => def.id);
    expect(ids).toContain('classic-ancestor-poster');
    expect(ids).toContain('modern-ancestor-poster');
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

  it('exposes png and pdf renderers for posters and snapshot', () => {
    const classicDef = getVisualOutputDefinition('classic-ancestor-poster');
    const modernDef = getVisualOutputDefinition('modern-ancestor-poster');
    const snapshotDef = getVisualOutputDefinition('current-tree-snapshot');

    expect(classicDef?.rendererTargets).toContain('png');
    expect(classicDef?.rendererTargets).toContain('pdf');

    expect(modernDef?.rendererTargets).toContain('png');
    expect(modernDef?.rendererTargets).toContain('pdf');

    expect(snapshotDef?.rendererTargets).toContain('png');
    expect(snapshotDef?.rendererTargets).toContain('pdf');
  });

  it('associates layout engines correctly', () => {
    const classicDef = getVisualOutputDefinition('classic-ancestor-poster');
    const modernDef = getVisualOutputDefinition('modern-ancestor-poster');
    const snapshotDef = getVisualOutputDefinition('current-tree-snapshot');

    expect(classicDef?.layoutEngine).toBe('poster-layout');
    expect(modernDef?.layoutEngine).toBe('poster-layout');
    expect(snapshotDef?.layoutEngine).toBe('tree-layout');
  });

  it('listVisualOutputDefinitionsByProduct returns filtered lists', () => {
    const posters = listVisualOutputDefinitionsByProduct('poster');
    expect(posters.length).toBe(2);
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
});
