import { describe, expect, it } from 'vitest';
import {
  getFixtureVisualPreviewGraphSelector,
  getVisualPreviewAdapter,
  getVisualPreviewGraphSelector,
  listFixtureVisualPreviewGraphSelectors,
  listVisualPreviewGraphSelectors,
  productionPreviewSanitizer,
  type FixturePreviewNode,
  type FixturePreviewSource,
} from '../../index';

const fixtureSource: FixturePreviewSource = {
  nodes: [
    {
      fixtureId: 'fixture-root',
      displayName: 'Fixture Root',
      isLiving: false,
      generation: 1,
      relationshipHint: 'root',
      birthDate: '1910-05-12',
      deathDate: '1988-09-01',
      hasProfilePhoto: true,
    },
    {
      fixtureId: 'fixture-parent',
      displayName: 'Living Parent',
      isLiving: true,
      generation: 2,
      relationshipHint: 'parent',
      birthDate: '1960-03-10',
      hasProfilePhoto: true,
    },
    {
      fixtureId: 'fixture-private',
      displayName: 'Private Relative',
      isLiving: false,
      isPrivate: true,
      generation: 3,
      relationshipHint: 'relative',
      birthDate: '1940-01-01',
      deathDate: '2011-01-01',
      hasProfilePhoto: true,
    },
    {
      fixtureId: 'fixture-deep',
      displayName: 'Deep Ancestor',
      isLiving: false,
      generation: 5,
      relationshipHint: 'ancestor',
      birthDate: '1850',
      deathDate: '1920',
    },
  ],
  edges: [
    {
      fromFixtureId: 'fixture-parent',
      toFixtureId: 'fixture-root',
      relationshipType: 'parent-child',
    },
    {
      fromFixtureId: 'fixture-private',
      toFixtureId: 'fixture-parent',
      relationshipType: 'relative',
    },
    {
      fromFixtureId: 'fixture-deep',
      toFixtureId: 'fixture-private',
      relationshipType: 'ancestor',
    },
  ],
};

describe('Preview Fixture Graph Selectors', () => {
  it('keeps runtime selector registry empty while exposing separate fixture selectors', () => {
    expect(getVisualPreviewGraphSelector('poster')).toBeUndefined();
    expect(getVisualPreviewGraphSelector('snapshot')).toBeUndefined();
    expect(listVisualPreviewGraphSelectors()).toEqual([]);

    expect(listFixtureVisualPreviewGraphSelectors().map((selector) => selector.productType)).toEqual([
      'poster',
      'snapshot',
    ]);
  });

  it('builds a root-relative poster ancestor slice from fixture source', () => {
    const selector = getFixtureVisualPreviewGraphSelector('poster');
    const rawGraph = selector.selectRawGraph(fixtureSource, {
      productType: 'poster',
      definitionId: 'classic-ancestor-poster',
      rootPersonId: 'fixture-parent',
      maxDepth: 3,
      maxNodes: 20,
      language: 'en',
    });

    expect(rawGraph.nodes.map((node) => node.rawId)).toEqual([
      'fixture-parent',
      'fixture-private',
      'fixture-deep',
    ]);
    expect(rawGraph.edges).toHaveLength(2);
    expect(JSON.stringify(rawGraph)).not.toContain('fixture-root');
    expect(rawGraph.nodes.map((node) => node.generation)).toEqual([1, 2, 3]);
  });

  it('allows fixture reviews to request every available ancestor generation', () => {
    const selector = getFixtureVisualPreviewGraphSelector('poster');
    const rawGraph = selector.selectRawGraph(fixtureSource, {
      productType: 'poster',
      definitionId: 'classic-ancestor-poster',
      rootPersonId: 'fixture-root',
      maxDepth: 'all',
      maxNodes: 20,
      language: 'en',
    });

    expect(rawGraph.nodes.map((node) => node.rawId)).toEqual([
      'fixture-root',
      'fixture-parent',
      'fixture-private',
      'fixture-deep',
    ]);
    expect(rawGraph.nodes.map((node) => node.generation)).toEqual([1, 2, 3, 4]);
  });

  it('builds a snapshot raw graph from visible fixture node IDs', () => {
    const selector = getFixtureVisualPreviewGraphSelector('snapshot');
    const rawGraph = selector.selectRawGraph(fixtureSource, {
      productType: 'snapshot',
      definitionId: 'current-tree-snapshot',
      visibleNodeIds: ['fixture-root', 'fixture-parent'],
      maxNodes: 10,
      language: 'en',
    });

    expect(rawGraph.nodes.map((node) => node.rawId)).toEqual(['fixture-root', 'fixture-parent']);
    expect(rawGraph.edges).toEqual([
      {
        fromRawId: 'fixture-parent',
        toRawId: 'fixture-root',
        relationshipType: 'parent-child',
      },
    ]);
  });

  it('runs the fixture selector through production sanitizer and preview adapter without leaking raw IDs', () => {
    const selector = getFixtureVisualPreviewGraphSelector('poster');
    const rawGraph = selector.selectRawGraph(fixtureSource, {
      productType: 'poster',
      definitionId: 'classic-ancestor-poster',
      rootPersonId: 'fixture-root',
      maxDepth: 5,
      maxNodes: 10,
      language: 'en',
    });
    const sanitizedGraph = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode: 'masked',
      includePhotos: true,
      includeYears: true,
      maxNodes: 2,
      language: 'en',
    });
    const adapter = getVisualPreviewAdapter('poster')!;
    const previewModel = adapter.createPreviewModel({
      definitionId: 'classic-ancestor-poster',
      mode: 'sanitized-data',
      privacyMode: 'masked',
      language: 'en',
      sanitizedGraph,
    });

    expect(sanitizedGraph.metadata.truncated).toBe(true);
    expect(previewModel.metadata.truncated).toBe(true);
    expect(previewModel.nodes).toHaveLength(2);
    expect(previewModel.nodes[0].id).toBe('preview-node-1');

    const serializedModel = JSON.stringify(previewModel);
    expect(serializedModel).not.toContain('fixture-root');
    expect(serializedModel).not.toContain('fixture-parent');
    expect(serializedModel).not.toContain('fixture-private');
    expect(serializedModel).not.toContain('email');
    expect(serializedModel).not.toContain('phone');
    expect(serializedModel).not.toContain('photoUrl');
  });

  it('rejects forbidden contact fields at the fixture input type boundary', () => {
    // @ts-expect-error fixture selectors must not accept contact fields
    const invalidEmailNode: FixturePreviewNode = { fixtureId: 'bad-1', email: 'bad@example.com' };

    // @ts-expect-error fixture selectors must not accept media URL fields
    const invalidPhotoNode: FixturePreviewNode = { fixtureId: 'bad-2', photoUrl: 'https://example.com/photo.jpg' };

    expect(invalidEmailNode).toBeDefined();
    expect(invalidPhotoNode).toBeDefined();
  });
});
