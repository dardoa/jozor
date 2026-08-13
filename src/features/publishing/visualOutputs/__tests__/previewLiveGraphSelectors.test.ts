import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getVisualPreviewAdapter,
  getVisualPreviewGraphSelector,
  livePreviewGraphSelectorSkeletons,
  listVisualPreviewGraphSelectors,
  productionPreviewSanitizer,
  createPosterPersonTokenCatalogSession,
  selectBranchPosterPreviewGraph,
  selectDescendantPosterPreviewGraph,
  selectFullTreePosterPreviewGraph,
  selectPosterPreviewGraph,
  selectSnapshotPreviewGraph,
  type PreviewLivePersonRecord,
  type PreviewLiveTreeSource,
} from '../../index';

describe('Preview Live Graph Selector Skeletons', () => {
  const liveSource: PreviewLiveTreeSource = {
    sourceKind: 'store',
    people: {
      'raw-root-001': {
        rawId: 'raw-root-001',
        displayName: 'Root Person',
        isLiving: true,
        birthDate: '1980-01-01',
        hasProfilePhoto: true,
      },
      'raw-father-001': {
        rawId: 'raw-father-001',
        displayName: 'Father Person',
        isLiving: false,
        birthDate: '1950-01-01',
        deathDate: '2020-01-01',
      },
      'raw-mother-001': {
        rawId: 'raw-mother-001',
        displayName: 'Mother Person',
        isLiving: false,
        isPrivate: true,
        birthDate: '1952-01-01',
        deathDate: '2018-01-01',
      },
      'raw-grandfather-001': {
        rawId: 'raw-grandfather-001',
        displayName: 'Grandfather Person',
        isLiving: false,
        birthDate: '1920',
        deathDate: '1999',
      },
    },
    relationships: [
      { fromRawId: 'raw-father-001', toRawId: 'raw-root-001', relationshipType: 'parent-child' },
      { fromRawId: 'raw-mother-001', toRawId: 'raw-root-001', relationshipType: 'parent-child' },
      { fromRawId: 'raw-grandfather-001', toRawId: 'raw-father-001', relationshipType: 'parent-child' },
    ],
  };

  it('defines poster and snapshot skeleton selectors without registering runtime readers', () => {
    expect(selectPosterPreviewGraph.productType).toBe('poster');
    expect(selectSnapshotPreviewGraph.productType).toBe('snapshot');
    expect(livePreviewGraphSelectorSkeletons.map((selector) => selector.productType)).toEqual([
      'poster',
      'snapshot',
    ]);

    expect(getVisualPreviewGraphSelector('poster')).toBeUndefined();
    expect(getVisualPreviewGraphSelector('snapshot')).toBeUndefined();
    expect(listVisualPreviewGraphSelectors()).toEqual([]);
  });

  it('selects a minimal poster ancestor graph from a production-shaped source', () => {
    const posterGraph = selectPosterPreviewGraph.selectRawGraph(
      liveSource,
      {
        productType: 'poster',
        definitionId: 'classic-ancestor-poster',
        rootPersonId: 'raw-root-001',
        maxDepth: 2,
        maxNodes: 20,
        language: 'en',
      }
    );

    expect(posterGraph.nodes.map((node) => node.rawId)).toEqual([
      'raw-root-001',
      'raw-father-001',
      'raw-mother-001',
    ]);
    expect(posterGraph.nodes.map((node) => node.generation)).toEqual([1, 2, 2]);
    expect(posterGraph.edges).toEqual([
      { fromRawId: 'raw-father-001', toRawId: 'raw-root-001', relationshipType: 'parent-child' },
      { fromRawId: 'raw-mother-001', toRawId: 'raw-root-001', relationshipType: 'parent-child' },
    ]);
    expect(JSON.stringify(posterGraph)).not.toContain('raw-grandfather-001');
  });

  it('selects descendants by following parent-child edges forward', () => {
    const descendantGraph = selectDescendantPosterPreviewGraph.selectRawGraph(
      liveSource,
      {
        productType: 'poster',
        definitionId: 'classic-ancestor-poster',
        rootPersonId: 'raw-grandfather-001',
        maxDepth: 'all',
        maxNodes: 20,
        language: 'en',
      }
    );

    expect(descendantGraph.nodes.map((node) => node.rawId)).toEqual([
      'raw-grandfather-001',
      'raw-father-001',
      'raw-root-001',
    ]);
    expect(descendantGraph.nodes.map((node) => node.generation)).toEqual([1, 2, 3]);
    expect(descendantGraph.nodes.map((node) => node.relationshipHint)).toEqual([
      'root',
      'descendant',
      'descendant',
    ]);
  });

  it('selects an opaque-token branch with descendants and in-branch spouses only', () => {
    const source: PreviewLiveTreeSource = {
      people: {
        parent: { rawId: 'parent', displayName: 'Parent', isLiving: false },
        branch: { rawId: 'branch', displayName: 'Branch Root', isLiving: false },
        spouse: { rawId: 'spouse', displayName: 'Branch Spouse', isLiving: true },
        child: { rawId: 'child', displayName: 'Branch Child', isLiving: true },
        'child-spouse': { rawId: 'child-spouse', displayName: 'Child Spouse', isLiving: true },
        grandchild: { rawId: 'grandchild', displayName: 'Grandchild', isLiving: true },
        siblingBranch: { rawId: 'sibling-branch', displayName: 'Other Branch', isLiving: true },
      },
      relationships: [
        { fromRawId: 'parent', toRawId: 'branch', relationshipType: 'parent-child' },
        { fromRawId: 'parent', toRawId: 'sibling-branch', relationshipType: 'parent-child' },
        { fromRawId: 'branch', toRawId: 'spouse', relationshipType: 'spouse' },
        { fromRawId: 'branch', toRawId: 'child', relationshipType: 'parent-child' },
        { fromRawId: 'child', toRawId: 'child-spouse', relationshipType: 'spouse' },
        { fromRawId: 'child', toRawId: 'grandchild', relationshipType: 'parent-child' },
      ],
    };
    const session = createPosterPersonTokenCatalogSession('branch-test');
    const catalog = session.createCatalog(
      Object.values(source.people),
      { language: 'en', privacyMode: 'owner-full' },
      'branch'
    );

    const rawGraph = selectBranchPosterPreviewGraph.selectRawGraph(source, {
      productType: 'poster',
      definitionId: 'classic-descendant-poster',
      rootPersonToken: catalog.defaultToken,
      tokenCatalog: catalog,
      maxDepth: 3,
      maxNodes: 20,
      language: 'en',
    });

    expect(rawGraph.nodes.map((node) => node.rawId)).toEqual([
      'branch',
      'spouse',
      'child',
      'child-spouse',
      'grandchild',
    ]);
    expect(rawGraph.nodes.map((node) => node.generation)).toEqual([1, 1, 2, 2, 3]);
    expect(rawGraph.nodes.map((node) => node.relationshipHint)).toEqual([
      'root',
      'spouse',
      'descendant',
      'spouse',
      'descendant',
    ]);
    const selectedRawIds = rawGraph.nodes.map((node) => node.rawId);
    expect(selectedRawIds).not.toContain('sibling-branch');
    expect(selectedRawIds).not.toContain('parent');

    const sanitizedGraph = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode: 'masked',
      includePhotos: false,
      includeYears: false,
      maxNodes: 20,
      language: 'en',
    });
    const serialized = JSON.stringify(sanitizedGraph);
    expect(serialized).not.toContain('"rawId"');
    expect(serialized).not.toContain('child-spouse');
    expect(serialized).not.toContain('sibling-branch');
    expect(sanitizedGraph.nodes.every((node) => /^preview-node-\d+$/.test(node.previewId))).toBe(true);
    expect(sanitizedGraph.nodes).toHaveLength(5);
    session.dispose();
  });

  it('rejects selected branch requests that bypass the opaque token catalog', () => {
    const rawGraph = selectBranchPosterPreviewGraph.selectRawGraph(liveSource, {
      productType: 'poster',
      definitionId: 'classic-descendant-poster',
      rootPersonId: 'raw-root-001',
      maxDepth: 3,
      maxNodes: 20,
      language: 'en',
    });

    expect(rawGraph).toEqual({ nodes: [], edges: [] });
  });

  it('selects the complete tree with every relationship type and disconnected records', () => {
    const source: PreviewLiveTreeSource = {
      people: {
        ...liveSource.people,
        'raw-spouse-001': { rawId: 'raw-spouse-001', displayName: 'Spouse Person', isLiving: true },
        'raw-relative-001': { rawId: 'raw-relative-001', displayName: 'Relative Person', isLiving: false },
        'raw-unlinked-001': { rawId: 'raw-unlinked-001', displayName: 'Unlinked Person', isLiving: false },
      },
      relationships: [
        ...liveSource.relationships,
        { fromRawId: 'raw-root-001', toRawId: 'raw-spouse-001', relationshipType: 'spouse' },
        { fromRawId: 'raw-spouse-001', toRawId: 'raw-relative-001', relationshipType: 'relative' },
      ],
    };

    const fullGraph = selectFullTreePosterPreviewGraph.selectRawGraph(source, {
      productType: 'poster',
      definitionId: 'classic-ancestor-poster',
      rootPersonId: 'raw-root-001',
      maxDepth: 'all',
      maxNodes: 20,
      language: 'en',
    });

    expect(fullGraph.nodes).toHaveLength(7);
    expect(fullGraph.nodes.map((node) => node.rawId)).toContain('raw-unlinked-001');
    expect(fullGraph.edges.map((edge) => edge.relationshipType)).toEqual(
      expect.arrayContaining(['parent-child', 'spouse', 'relative'])
    );
    expect(fullGraph.nodes.find((node) => node.rawId === 'raw-root-001')?.relationshipHint).toBe('root');
  });

  it('traverses every available ancestor generation when maxDepth is all', () => {
    const people = Object.fromEntries(Array.from({ length: 6 }, (_, index) => {
      const rawId = `raw-generation-${index + 1}`;
      return [rawId, {
        rawId,
        displayName: `Generation ${index + 1}`,
        isLiving: false,
      }];
    }));
    const relationships = Array.from({ length: 5 }, (_, index) => ({
      fromRawId: `raw-generation-${index + 2}`,
      toRawId: `raw-generation-${index + 1}`,
      relationshipType: 'parent-child' as const,
    }));
    const source: PreviewLiveTreeSource = { people, relationships };

    const rawGraph = selectPosterPreviewGraph.selectRawGraph(source, {
      productType: 'poster',
      definitionId: 'classic-ancestor-poster',
      rootPersonId: 'raw-generation-1',
      maxDepth: 'all',
      maxNodes: 20,
      language: 'en',
    });

    expect(rawGraph.nodes).toHaveLength(6);
    expect(rawGraph.nodes.map((node) => node.generation)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(rawGraph.edges).toHaveLength(5);
  });

  it('keeps one overflow node so the sanitizer reports an all-generation cap', () => {
    const people = Object.fromEntries(Array.from({ length: 6 }, (_, index) => {
      const rawId = `raw-cap-${index + 1}`;
      return [rawId, { rawId, displayName: `Cap ${index + 1}`, isLiving: false }];
    }));
    const relationships = Array.from({ length: 5 }, (_, index) => ({
      fromRawId: `raw-cap-${index + 2}`,
      toRawId: `raw-cap-${index + 1}`,
      relationshipType: 'parent-child' as const,
    }));
    const rawGraph = selectPosterPreviewGraph.selectRawGraph(
      { people, relationships },
      {
        productType: 'poster',
        definitionId: 'classic-ancestor-poster',
        rootPersonId: 'raw-cap-1',
        maxDepth: 'all',
        maxNodes: 3,
        language: 'en',
      }
    );
    const sanitizedGraph = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode: 'masked',
      includePhotos: false,
      includeYears: false,
      maxNodes: 3,
      language: 'en',
    });

    expect(rawGraph.nodes).toHaveLength(4);
    expect(sanitizedGraph.nodes).toHaveLength(3);
    expect(sanitizedGraph.metadata.truncated).toBe(true);
  });

  it('selects a minimal snapshot graph from explicit visible node IDs', () => {
    const snapshotGraph = selectSnapshotPreviewGraph.selectRawGraph(
      liveSource,
      {
        productType: 'snapshot',
        definitionId: 'current-tree-snapshot',
        visibleNodeIds: ['raw-root-001', 'raw-father-001', 'raw-grandfather-001'],
        maxNodes: 20,
        language: 'en',
      }
    );

    expect(snapshotGraph.nodes.map((node) => node.rawId)).toEqual([
      'raw-root-001',
      'raw-father-001',
      'raw-grandfather-001',
    ]);
    expect(snapshotGraph.edges).toEqual([
      { fromRawId: 'raw-father-001', toRawId: 'raw-root-001', relationshipType: 'parent-child' },
      { fromRawId: 'raw-grandfather-001', toRawId: 'raw-father-001', relationshipType: 'parent-child' },
    ]);
  });

  it('keeps snapshot selector empty when visible node ids are missing', () => {
    const snapshotGraph = selectSnapshotPreviewGraph.selectRawGraph(
      liveSource,
      {
        productType: 'snapshot',
        definitionId: 'current-tree-snapshot',
        maxNodes: 20,
        language: 'en',
      }
    );

    expect(snapshotGraph).toEqual({ nodes: [], edges: [] });
  });

  it('passes poster selector output through sanitizer and adapter without leaking raw IDs', () => {
    const rawGraph = selectPosterPreviewGraph.selectRawGraph(
      liveSource,
      {
        productType: 'poster',
        definitionId: 'classic-ancestor-poster',
        rootPersonId: 'raw-root-001',
        maxDepth: 3,
        maxNodes: 10,
        language: 'en',
      }
    );
    const sanitizedGraph = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode: 'masked',
      includePhotos: false,
      includeYears: false,
      maxNodes: 10,
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

    expect(sanitizedGraph.nodes).toHaveLength(4);
    expect(sanitizedGraph.nodes[0].displayName).toBe('Masked person');
    expect(sanitizedGraph.nodes[2].displayName).toBe('Masked person');
    expect(sanitizedGraph.metadata.truncated).toBe(false);

    const serializedModel = JSON.stringify(previewModel);
    expect(serializedModel).not.toContain('raw-root-001');
    expect(serializedModel).not.toContain('raw-father-001');
    expect(serializedModel).not.toContain('raw-mother-001');
    expect(serializedModel).not.toContain('raw-grandfather-001');
    expect(serializedModel).not.toContain('email');
    expect(serializedModel).not.toContain('phone');
    expect(serializedModel).not.toContain('photoUrl');
  });

  it('passes snapshot selector output through sanitizer and adapter without leaking raw IDs', () => {
    const rawGraph = selectSnapshotPreviewGraph.selectRawGraph(
      liveSource,
      {
        productType: 'snapshot',
        definitionId: 'current-tree-snapshot',
        visibleNodeIds: ['raw-root-001', 'raw-father-001'],
        maxNodes: 10,
        language: 'en',
      }
    );
    const sanitizedGraph = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode: 'masked',
      includePhotos: true,
      includeYears: true,
      maxNodes: 10,
      language: 'en',
    });
    const adapter = getVisualPreviewAdapter('snapshot')!;
    const previewModel = adapter.createPreviewModel({
      definitionId: 'current-tree-snapshot',
      mode: 'sanitized-data',
      privacyMode: 'masked',
      language: 'en',
      sanitizedGraph,
    });

    expect(previewModel.nodes).toHaveLength(2);
    const serializedModel = JSON.stringify(previewModel);
    expect(serializedModel).not.toContain('raw-root-001');
    expect(serializedModel).not.toContain('raw-father-001');
    expect(serializedModel).not.toContain('email');
    expect(serializedModel).not.toContain('phone');
    expect(serializedModel).not.toContain('photoUrl');
  });

  it('rejects contact/media fields at the live selector source type boundary', () => {
    // @ts-expect-error live selector person source must not accept email
    const invalidEmailPerson: PreviewLivePersonRecord = { rawId: 'bad', email: 'bad@example.com' };

    // @ts-expect-error live selector person source must not accept photoUrl
    const invalidPhotoPerson: PreviewLivePersonRecord = { rawId: 'bad', photoUrl: 'https://example.com/photo.jpg' };

    expect(invalidEmailPerson).toBeDefined();
    expect(invalidPhotoPerson).toBeDefined();
  });

  it('does not import store, indexed database, or domain entity modules', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'src/features/publishing/visualOutputs/previewLiveGraphSelectors.ts'),
      'utf8'
    );

    expect(source).not.toMatch(/from ['"].*store/i);
    expect(source).not.toMatch(/from ['"].*indexed/i);
    expect(source).not.toMatch(/from ['"].*person/i);
    expect(source).not.toMatch(/from ['"].*family/i);
    expect(source).not.toMatch(/from ['"].*redux/i);
  });
});
