import { describe, expect, it } from 'vitest';
import {
  getVisualPreviewAdapter,
  listVisualPreviewAdapters,
} from '../previewAdapterRegistry';

describe('Visual Preview Adapter Registry Contracts', () => {
  it('correctly registers adapters for poster and snapshot product types', () => {
    const posterAdapter = getVisualPreviewAdapter('poster');
    const snapshotAdapter = getVisualPreviewAdapter('snapshot');

    expect(posterAdapter).toBeDefined();
    expect(posterAdapter?.productType).toBe('poster');

    expect(snapshotAdapter).toBeDefined();
    expect(snapshotAdapter?.productType).toBe('snapshot');

    const allAdapters = listVisualPreviewAdapters();
    expect(allAdapters.length).toBe(2);
    expect(allAdapters.map(a => a.productType)).toContain('poster');
    expect(allAdapters.map(a => a.productType)).toContain('snapshot');
  });

  it('generates a safe sanitized model in English and Arabic for posters', () => {
    const adapter = getVisualPreviewAdapter('poster');
    expect(adapter).toBeDefined();

    // English request
    const modelEn = adapter!.createPreviewModel({
      definitionId: 'classic-ancestor-poster',
      mode: 'static-mock',
      privacyMode: 'public',
      language: 'en',
    });

    expect(modelEn.definitionId).toBe('classic-ancestor-poster');
    expect(modelEn.productType).toBe('poster');
    expect(modelEn.layoutEngine).toBe('poster-layout');
    expect(modelEn.readingStrategy).toBe('ancestor');
    expect(modelEn.nodes.length).toBeGreaterThan(0);
    expect(modelEn.nodes[0].displayName).toBe('Preview root');

    // Arabic request
    const modelAr = adapter!.createPreviewModel({
      definitionId: 'classic-ancestor-poster',
      mode: 'static-mock',
      privacyMode: 'public',
      language: 'ar',
    });
    expect(modelAr.nodes[0].displayName).toBe('جذر المعاينة');
  });

  it('generates a safe sanitized model for snapshots', () => {
    const adapter = getVisualPreviewAdapter('snapshot');
    expect(adapter).toBeDefined();

    const model = adapter!.createPreviewModel({
      definitionId: 'current-tree-snapshot',
      mode: 'static-mock',
      privacyMode: 'public',
      language: 'en',
    });

    expect(model.definitionId).toBe('current-tree-snapshot');
    expect(model.productType).toBe('snapshot');
    expect(model.layoutEngine).toBe('tree-layout');
    expect(model.readingStrategy).toBe('narrative');
  });

  it('enforces privacy constraints by not containing sensitive metadata', () => {
    const adapter = getVisualPreviewAdapter('poster');
    expect(adapter).toBeDefined();

    const model = adapter!.createPreviewModel({
      definitionId: 'classic-ancestor-poster',
      mode: 'static-mock',
      privacyMode: 'owner-full', // Even owner-full must remain safe in mockup mode
      language: 'en',
    });

    // Verify no sensitive keys or emails/addresses/urls are present
    const stringified = JSON.stringify(model);
    expect(stringified).not.toContain('@');
    expect(stringified).not.toContain('http');
    expect(stringified).not.toContain('address');
    expect(stringified).not.toContain('phone');
  });

  it('respects maxNodes threshold and marks model as truncated with warnings', () => {
    const adapter = getVisualPreviewAdapter('poster');
    expect(adapter).toBeDefined();

    // Request with maxNodes = 2 (lower than our default mock of 7 nodes)
    const model = adapter!.createPreviewModel({
      definitionId: 'classic-ancestor-poster',
      mode: 'static-mock',
      privacyMode: 'public',
      language: 'en',
      maxNodes: 2,
    });

    expect(model.metadata.truncated).toBe(true);
    expect(model.metadata.nodeCount).toBe(7); // Total before truncate
    expect(model.nodes.length).toBe(2); // Truncated count
    expect(model.warnings.length).toBe(1);
    expect(model.warnings[0]).toContain('truncated');
  });

  it('has zero DOM or window dependencies and runs cleanly in isolated environment', () => {
    const adapter = getVisualPreviewAdapter('poster');
    const model = adapter!.createPreviewModel({
      definitionId: 'classic-ancestor-poster',
      mode: 'static-mock',
      privacyMode: 'public',
      language: 'en',
    });

    expect(model).toBeDefined();
    expect(model.nodes.length).toBe(7);
  });
});
