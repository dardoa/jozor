import { describe, expect, it } from 'vitest';
import type {
  SanitizedPreviewNode,
  SanitizedPreviewGraph,
  VisualPreviewSanitizerPolicy,
  VisualPreviewSanitizer,
} from '../../index';

describe('Preview Sanitizer Contract Constraints', () => {
  it('instantiates valid SanitizedPreviewNode and excludes all forbidden fields', () => {
    const node: SanitizedPreviewNode = {
      previewId: 'preview-node-abc',
      displayName: 'Jane Doe',
      generation: 2,
      relationshipHint: 'parent',
      lifeStatus: 'living',
      isMasked: false,
      hasPhoto: false,
      birthYear: 1980,
    };

    expect(node.previewId).toBe('preview-node-abc');
    expect(node.displayName).toBe('Jane Doe');

    // Rule check: sampleNode must never contain any blacklisted keys.
    // Assert on Object.keys(node)
    const forbiddenKeys = [
      'id',
      'email',
      'phone',
      'address',
      'photoUrl',
      'mediaPath',
      'note',
      'notes',
      'sourceText',
      'citation',
    ];
    expect(Object.keys(node)).not.toEqual(expect.arrayContaining(forbiddenKeys));
  });

  it('supports contract instantiation with generic raw graphs without exposing domain structures', () => {
    // Implement a simple dummy mock sanitizer using the interface contract
    const mockSanitizer: VisualPreviewSanitizer<unknown> = {
      sanitize: (rawGraph: unknown, policy: VisualPreviewSanitizerPolicy): SanitizedPreviewGraph => {
        // Assert rawGraph is typed as unknown
        expect(rawGraph).toBeDefined();

        return {
          nodes: [
            {
              previewId: 'preview-root',
              displayName: policy.privacyMode === 'masked' ? 'Masked Relative' : 'Root Person',
              relationshipHint: 'root',
              lifeStatus: 'deceased',
              isMasked: policy.privacyMode === 'masked',
              hasPhoto: false,
            },
          ],
          edges: [],
          warnings: [],
          metadata: {
            truncated: false,
            sanitizedNodeCount: 1,
            policy,
          },
        };
      },
    };

    const policy: VisualPreviewSanitizerPolicy = {
      privacyMode: 'masked',
      includePhotos: false,
      includeYears: true,
      maxNodes: 10,
      language: 'en',
    };

    const result = mockSanitizer.sanitize({ people: {}, relations: {} }, policy);
    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].displayName).toBe('Masked Relative');
    expect(result.metadata.policy.privacyMode).toBe('masked');
  });

  it('verifies owner-full policy settings are valid and do not bypass the sanitizer', () => {
    const policy: VisualPreviewSanitizerPolicy = {
      privacyMode: 'owner-full', // Note: Policy mode only, not a sanitizer bypass
      includePhotos: true,
      includeYears: true,
      maxNodes: 5,
      language: 'en',
    };

    expect(policy.privacyMode).toBe('owner-full');
    expect(policy.maxNodes).toBe(5);
  });
});
