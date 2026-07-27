import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  getVisualPreviewGraphSelector,
  listVisualPreviewGraphSelectors,
  type PreviewSanitizerRawGraph,
  type PreviewSanitizerRawNode,
  type VisualPreviewGraphSelector,
  type VisualPreviewSelectorContext,
} from '../../index';

describe('Preview Raw Graph Selector Contracts', () => {
  it('allows a selector to receive an unknown source and return production sanitizer raw graph only', () => {
    const selector: VisualPreviewGraphSelector<unknown> = {
      productType: 'poster',
      selectRawGraph(source: unknown, context: VisualPreviewSelectorContext): PreviewSanitizerRawGraph {
        expect(source).toBeDefined();
        expect(context.productType).toBe('poster');
        expect(context.rootPersonId).toBe('root-person-1');

        return {
          nodes: [
            {
              rawId: 'raw-person-1',
              displayName: 'Preview Root',
              isLiving: false,
              isPrivate: false,
              generation: 1,
              relationshipHint: 'root',
              birthDate: '1900-01-01',
              deathDate: '1970-01-01',
              hasProfilePhoto: true,
            },
          ],
          edges: [],
        };
      },
    };

    const graph = selector.selectRawGraph(
      { unknownSourceShape: true },
      {
        productType: 'poster',
        definitionId: 'classic-ancestor-poster',
        rootPersonId: 'root-person-1',
        maxDepth: 4,
        maxNodes: 25,
        language: 'en',
      }
    );

    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].rawId).toBe('raw-person-1');
    expect(graph.nodes[0]).not.toHaveProperty('email');
    expect(graph.nodes[0]).not.toHaveProperty('phone');
    expect(graph.nodes[0]).not.toHaveProperty('photoUrl');
  });

  it('supports snapshot selector context with visible node IDs', () => {
    const context: VisualPreviewSelectorContext = {
      productType: 'snapshot',
      definitionId: 'current-tree-snapshot',
      visibleNodeIds: ['node-a', 'node-b'],
      maxNodes: 10,
      language: 'ar',
    };

    expect(context.productType).toBe('snapshot');
    expect(context.visibleNodeIds).toEqual(['node-a', 'node-b']);
    expect(context.rootPersonId).toBeUndefined();
  });

  it('keeps the Phase 4C selector registry empty until runtime readers are explicitly implemented', () => {
    expect(getVisualPreviewGraphSelector('poster')).toBeUndefined();
    expect(getVisualPreviewGraphSelector('snapshot')).toBeUndefined();
    expect(listVisualPreviewGraphSelectors()).toEqual([]);
  });

  it('rejects forbidden contact and media fields at the raw selector output type boundary', () => {
    // @ts-expect-error email is intentionally not allowed in selector raw output nodes
    const invalidEmailNode: PreviewSanitizerRawNode = { rawId: '1', email: 'test@example.com' };

    // @ts-expect-error phone is intentionally not allowed in selector raw output nodes
    const invalidPhoneNode: PreviewSanitizerRawNode = { rawId: '2', phone: '+966555555555' };

    // @ts-expect-error photoUrl is intentionally not allowed in selector raw output nodes
    const invalidMediaNode: PreviewSanitizerRawNode = { rawId: '3', photoUrl: 'https://example.com/photo.jpg' };

    expect(invalidEmailNode).toBeDefined();
    expect(invalidPhoneNode).toBeDefined();
    expect(invalidMediaNode).toBeDefined();
  });

  it('does not import store, indexed database, or domain entity modules in selector contracts', () => {
    const typesSource = readFileSync(
      path.join(process.cwd(), 'src/features/publishing/visualOutputs/previewGraphSelectorTypes.ts'),
      'utf8'
    );
    const registrySource = readFileSync(
      path.join(process.cwd(), 'src/features/publishing/visualOutputs/previewGraphSelectorRegistry.ts'),
      'utf8'
    );
    const source = `${typesSource}\n${registrySource}`;

    expect(source).not.toMatch(/from ['"].*store/i);
    expect(source).not.toMatch(/from ['"].*indexed/i);
    expect(source).not.toMatch(/from ['"].*person/i);
    expect(source).not.toMatch(/from ['"].*family/i);
  });
});
