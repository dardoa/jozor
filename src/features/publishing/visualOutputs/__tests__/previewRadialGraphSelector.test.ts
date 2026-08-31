import { describe, it, expect } from 'vitest';
import { selectRadialGraphBoundary } from '../previewRadialGraphSelector';
import { createRawGraphFromFixtureSource } from '../previewFocusGraphSelector';
import { createPosterPersonTokenCatalogSession } from '../posterPersonTokenCatalog';
import type { FixturePreviewSource } from '../previewFixtureGraphSelectors';

const FIXTURE: FixturePreviewSource = {
  nodes: [
    { fixtureId: 'root', displayName: 'Root Person', generation: 1, relationshipHint: 'root', isLiving: true, hasProfilePhoto: true },
    { fixtureId: 'father', displayName: 'Father Person', generation: 2, relationshipHint: 'ancestor', birthDate: '1960-01-01', isLiving: false, hasProfilePhoto: true },
    { fixtureId: 'mother', displayName: 'Mother Person', generation: 2, relationshipHint: 'ancestor', birthDate: '1962-01-01', isLiving: false },
    { fixtureId: 'p-gf', displayName: 'Paternal GF', generation: 3, relationshipHint: 'ancestor', isLiving: false },
    { fixtureId: 'p-gm', displayName: 'Paternal GM', generation: 3, relationshipHint: 'ancestor', isLiving: false },
    { fixtureId: 'm-gf', displayName: 'Maternal GF', generation: 3, relationshipHint: 'ancestor', isLiving: false },
    { fixtureId: 'm-gm', displayName: 'Maternal GM', generation: 3, relationshipHint: 'ancestor', isLiving: false },
    { fixtureId: 'child-1', displayName: 'Child One', generation: 1, relationshipHint: 'descendant', isLiving: true },
    { fixtureId: 'child-2', displayName: 'Child Two', generation: 1, relationshipHint: 'descendant', isLiving: true },
    { fixtureId: 'grandchild-1', displayName: 'Grandchild One', generation: 1, relationshipHint: 'descendant', isLiving: true },
    { fixtureId: 'spouse', displayName: 'Spouse Person', generation: 1, relationshipHint: 'spouse', isLiving: true },
  ],
  edges: [
    { fromFixtureId: 'father', toFixtureId: 'root', relationshipType: 'parent-child' },
    { fromFixtureId: 'mother', toFixtureId: 'root', relationshipType: 'parent-child' },
    { fromFixtureId: 'p-gf', toFixtureId: 'father', relationshipType: 'parent-child' },
    { fromFixtureId: 'p-gm', toFixtureId: 'father', relationshipType: 'parent-child' },
    { fromFixtureId: 'm-gf', toFixtureId: 'mother', relationshipType: 'parent-child' },
    { fromFixtureId: 'm-gm', toFixtureId: 'mother', relationshipType: 'parent-child' },
    { fromFixtureId: 'root', toFixtureId: 'child-1', relationshipType: 'parent-child' },
    { fromFixtureId: 'root', toFixtureId: 'child-2', relationshipType: 'parent-child' },
    { fromFixtureId: 'child-1', toFixtureId: 'grandchild-1', relationshipType: 'parent-child' },
    { fromFixtureId: 'root', toFixtureId: 'spouse', relationshipType: 'spouse' },
  ],
};

describe('previewRadialGraphSelector', () => {
  const rawGraph = createRawGraphFromFixtureSource(FIXTURE);
  const catalog = createPosterPersonTokenCatalogSession('radial-selector-test').createCatalog(
    rawGraph.nodes,
    { language: 'ar', privacyMode: 'masked' }
  );

  it('selects ancestors radial graph up to requested generation rings', () => {
    const rootToken = catalog.defaultToken!;
    const result = selectRadialGraphBoundary(rawGraph, catalog, {
      rootPersonToken: rootToken,
      scope: 'ancestors',
      generationRings: 3,
      privacyMode: 'masked',
      language: 'ar',
    });

    expect(result.sanitizedGraph.nodes.length).toBeGreaterThan(1);
    expect(result.focalPreviewId).toBeDefined();
    expect(result.resolvePreviewIdInsideBoundary(result.focalPreviewId)).toBe('root');
    const fatherPreviewId = result.sanitizedGraph.nodes.find(
      (node) => node.displayName === 'Father Person'
    )?.previewId;
    expect(result.resolvePreviewIdInsideBoundary(fatherPreviewId!)).toBe('father');
    expect(JSON.stringify(result)).not.toContain('"father"');

    // Check ancestors are included, spouse and siblings excluded
    const names = result.sanitizedGraph.nodes.map((n) => n.displayName);
    expect(names).toContain('Father Person');
    expect(names).not.toContain('Spouse Person');
    expect(names).not.toContain('Child One');
  });

  it('selects descendants radial graph up to requested generation rings', () => {
    const rootToken = catalog.defaultToken!;
    const result = selectRadialGraphBoundary(rawGraph, catalog, {
      rootPersonToken: rootToken,
      scope: 'descendants',
      generationRings: 3,
      privacyMode: 'owner-full',
      language: 'ar',
    });

    const names = result.sanitizedGraph.nodes.map((n) => n.displayName);
    expect(names).toContain('Child One');
    expect(names).toContain('Child Two');
    expect(names).toContain('Grandchild One');
    expect(names).not.toContain('Father Person');
  });

  it('sanitizes living people according to privacyMode', () => {
    const rootToken = catalog.defaultToken!;
    const result = selectRadialGraphBoundary(rawGraph, catalog, {
      rootPersonToken: rootToken,
      scope: 'descendants',
      generationRings: 3,
      privacyMode: 'masked',
      language: 'ar',
    });

    const maskedNodes = result.sanitizedGraph.nodes.filter((n) => n.displayName.includes('مخفي'));
    expect(maskedNodes.length).toBeGreaterThan(0);
  });

  it.each([
    {
      privacyMode: 'owner-full' as const,
      includePhotos: true,
      hideLivingPhotos: false,
      rootMasked: false,
      rootHasPhoto: true,
      fatherHasPhoto: true,
    },
    {
      privacyMode: 'owner-full' as const,
      includePhotos: true,
      hideLivingPhotos: true,
      rootMasked: false,
      rootHasPhoto: false,
      fatherHasPhoto: true,
    },
    {
      privacyMode: 'masked' as const,
      includePhotos: true,
      hideLivingPhotos: false,
      rootMasked: true,
      rootHasPhoto: false,
      fatherHasPhoto: true,
    },
    {
      privacyMode: 'owner-full' as const,
      includePhotos: false,
      hideLivingPhotos: false,
      rootMasked: false,
      rootHasPhoto: false,
      fatherHasPhoto: false,
    },
  ])(
    'enforces sanitizer policy $privacyMode/includePhotos=$includePhotos/hideLivingPhotos=$hideLivingPhotos',
    ({ privacyMode, includePhotos, hideLivingPhotos, rootMasked, rootHasPhoto, fatherHasPhoto }) => {
      const result = selectRadialGraphBoundary(rawGraph, catalog, {
        rootPersonToken: catalog.defaultToken!,
        scope: 'ancestors',
        generationRings: 3,
        privacyMode,
        language: 'en',
        includePhotos,
        hideLivingPhotos,
      });

      const root = result.sanitizedGraph.nodes.find((node) => node.relationshipHint === 'root');
      const father = result.sanitizedGraph.nodes.find((node) => node.displayName === 'Father Person');
      expect(root).toMatchObject({ isMasked: rootMasked, hasPhoto: rootHasPhoto });
      expect(father).toMatchObject({ isMasked: false, hasPhoto: fatherHasPhoto });
    }
  );

  it('rejects unresolvable or raw-compatible person tokens', () => {
    expect(() =>
      selectRadialGraphBoundary(rawGraph, catalog, {
        rootPersonToken: 'invalid-token-123',
        scope: 'ancestors',
        generationRings: 3,
        privacyMode: 'masked',
        language: 'ar',
      })
    ).toThrow('Radial selection error: Root person token could not be resolved in this session.');

    expect(() =>
      selectRadialGraphBoundary(rawGraph, catalog, {
        rootPersonToken: 'root', // raw ID passed directly
        scope: 'ancestors',
        generationRings: 3,
        privacyMode: 'masked',
        language: 'ar',
      })
    ).toThrow('Radial selection error: Root person token could not be resolved in this session.');
  });
});
