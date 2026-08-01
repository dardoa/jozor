import { describe, expect, it } from 'vitest';
import {
  createFocusTokenCatalog,
  selectFocusGraphBoundary,
  type RawGraph,
} from '../previewFocusGraphSelector';

function createRawGraph(): RawGraph {
  return {
    nodes: [
      { rawId: 'db-root-100', displayName: 'Focal person', isLiving: true, hasPhoto: true },
      { rawId: 'db-father-200', displayName: 'Father' },
      { rawId: 'db-mother-300', displayName: 'Mother' },
      { rawId: 'db-spouse-400', displayName: 'Spouse', isLiving: true, hasPhoto: true },
      { rawId: 'db-child-500', displayName: 'Child', isLiving: true },
      { rawId: 'db-sibling-600', displayName: 'Sibling', isLiving: true },
    ],
    edges: [
      { fromId: 'db-father-200', toId: 'db-root-100', relationshipType: 'parent-child' },
      { fromId: 'db-mother-300', toId: 'db-root-100', relationshipType: 'parent-child' },
      { fromId: 'db-father-200', toId: 'db-sibling-600', relationshipType: 'parent-child' },
      { fromId: 'db-root-100', toId: 'db-spouse-400', relationshipType: 'spouse' },
      { fromId: 'db-root-100', toId: 'db-child-500', relationshipType: 'parent-child' },
    ],
  };
}

const request = {
  ancestorDepth: 1 as const,
  descendantDepth: 1 as const,
  includeSpouses: true,
  includeSiblings: true,
  privacyMode: 'owner-full' as const,
  language: 'en' as const,
};

describe('previewFocusGraphSelector boundary', () => {
  it('selects the complete family neighborhood through an opaque session catalog', () => {
    const rawGraph = createRawGraph();
    const catalog = createFocusTokenCatalog(rawGraph.nodes, request);
    const result = selectFocusGraphBoundary(rawGraph, catalog, {
      ...request,
      focalPersonToken: catalog.defaultToken!,
    });

    expect(result.sanitizedGraph.nodes).toHaveLength(6);
    expect(result.sanitizedGraph.nodes.map((node) => node.relationshipHint)).toEqual(
      expect.arrayContaining(['root', 'ancestor', 'descendant', 'spouse', 'relative'])
    );
    expect(result.sanitizedGraph.nodes.filter((node) => node.relationshipHint === 'root')).toHaveLength(1);
    expect(result.sanitizedGraph.nodes[0].previewId).toBe(result.focalPreviewId);
  });

  it('never exposes raw IDs through token options or sanitized output', () => {
    const rawGraph = createRawGraph();
    const catalog = createFocusTokenCatalog(rawGraph.nodes, request);
    const result = selectFocusGraphBoundary(rawGraph, catalog, {
      ...request,
      focalPersonToken: catalog.defaultToken!,
    });
    const serializedPublicBoundary = JSON.stringify({ tokens: catalog.tokens, graph: result.sanitizedGraph });

    for (const node of rawGraph.nodes) {
      expect(serializedPublicBoundary).not.toContain(node.rawId);
    }
    expect(catalog.tokens.every((option) => /^session-token-[a-z0-9-]+$/i.test(option.token))).toBe(true);
  });

  it('rejects raw IDs and legacy raw-compatible token formats', () => {
    const rawGraph = createRawGraph();
    const catalog = createFocusTokenCatalog(rawGraph.nodes, request);

    for (const focalPersonToken of [
      'db-root-100',
      'session-token-db-root-100',
      'preview-root-db-root-100',
    ]) {
      expect(() => selectFocusGraphBoundary(rawGraph, catalog, { ...request, focalPersonToken }))
        .toThrow('Focal person token could not be resolved in this session');
    }
  });

  it('filters spouse and sibling companions independently', () => {
    const rawGraph = createRawGraph();
    const catalog = createFocusTokenCatalog(rawGraph.nodes, request);
    const result = selectFocusGraphBoundary(rawGraph, catalog, {
      ...request,
      focalPersonToken: catalog.defaultToken!,
      includeSpouses: false,
      includeSiblings: false,
    });

    expect(result.sanitizedGraph.nodes).toHaveLength(4);
    expect(result.sanitizedGraph.nodes.some((node) => node.relationshipHint === 'spouse')).toBe(false);
    expect(result.sanitizedGraph.nodes.some((node) => node.relationshipHint === 'relative')).toBe(false);
  });

  it('caps all-depth selection at the hard maximum of 50 and keeps clean edges', () => {
    const nodes = Array.from({ length: 70 }, (_, index) => ({
      rawId: `raw-${index}`,
      displayName: `Person ${index}`,
    }));
    const edges = Array.from({ length: 69 }, (_, index) => ({
      fromId: 'raw-0',
      toId: `raw-${index + 1}`,
      relationshipType: 'parent-child' as const,
    }));
    const rawGraph: RawGraph = { nodes, edges };
    const catalog = createFocusTokenCatalog(nodes, request);
    const result = selectFocusGraphBoundary(rawGraph, catalog, {
      ...request,
      focalPersonToken: catalog.defaultToken!,
      ancestorDepth: 'all',
      descendantDepth: 'all',
      maxNodes: 100,
    });

    expect(result.sanitizedGraph.nodes).toHaveLength(50);
    expect(result.sanitizedGraph.metadata.truncated).toBe(true);
    const previewIds = new Set(result.sanitizedGraph.nodes.map((node) => node.previewId));
    expect(result.sanitizedGraph.edges.every((edge) => (
      previewIds.has(edge.fromPreviewId) && previewIds.has(edge.toPreviewId)
    ))).toBe(true);
  });

  it('localizes masked catalog labels without leaking living names', () => {
    const rawGraph = createRawGraph();
    const catalog = createFocusTokenCatalog(rawGraph.nodes, {
      language: 'ar',
      privacyMode: 'masked',
    });

    expect(catalog.tokens[0].label).toBe('\u0634\u062e\u0635 \u0645\u062e\u0641\u064a');
    expect(catalog.tokens[0].label).not.toContain('Focal person');
  });
});
