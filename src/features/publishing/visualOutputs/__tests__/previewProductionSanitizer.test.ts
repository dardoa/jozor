import { describe, expect, it } from 'vitest';
import {
  productionPreviewSanitizer,
  type PreviewSanitizerRawGraph,
  type PreviewSanitizerRawNode,
} from '../../index';

describe('Preview Production Sanitizer Skeleton Rules', () => {
  const sampleRawGraph: PreviewSanitizerRawGraph = {
    nodes: [
      {
        rawId: 'db-person-101',
        displayName: 'Ancestor Yahya',
        isLiving: false,
        isPrivate: false,
        generation: 1,
        relationshipHint: 'ancestor',
        birthDate: '1905-01-01',
        deathDate: '1970-12-31',
        birthPlace: '  Damascus\u0000  Syria  ',
        occupation: 'Historian',
        description: '  Preserved\u0000 family archives and documented oral history for future generations.  ',
        hasProfilePhoto: true,
      },
      {
        rawId: 'db-person-102',
        displayName: 'Parent Mona',
        isLiving: true,
        isPrivate: false,
        generation: 2,
        relationshipHint: 'parent',
        birthDate: '1960-06-15',
        birthPlace: 'Riyadh',
        occupation: 'Engineer',
        description: 'This living profile description must remain private.',
        hasProfilePhoto: true,
      },
      {
        rawId: 'db-person-103',
        displayName: 'Private Cousin',
        isLiving: true,
        isPrivate: true,
        generation: 3,
        relationshipHint: 'relative',
        birthDate: '1990-10-10',
      },
    ],
    edges: [
      {
        fromRawId: 'db-person-101',
        toRawId: 'db-person-102',
        relationshipType: 'parent-child',
      },
      {
        fromRawId: 'db-person-102',
        toRawId: 'db-person-103',
        relationshipType: 'parent-child',
      },
    ],
  };

  it('performs production-shaped sanitization and strips raw database identifiers', () => {
    const policy = {
      privacyMode: 'masked' as const,
      includePhotos: true,
      includeYears: true,
      maxNodes: 10,
      language: 'en' as const,
    };

    const result = productionPreviewSanitizer.sanitize(sampleRawGraph, policy);

    expect(result.nodes.length).toBe(3);
    expect(result.metadata.truncated).toBe(false);

    // Verify raw database identifier rawId is stripped, replaced by previewId
    result.nodes.forEach((node) => {
      expect(node.previewId).toMatch(/^preview-node-\d+$/);
      expect(node).not.toHaveProperty('rawId');
    });
  });

  it('enforces privacy masking rules for living and private profiles in English and Arabic', () => {
    const policyEn = {
      privacyMode: 'masked' as const,
      includePhotos: true,
      includeYears: true,
      maxNodes: 10,
      language: 'en' as const,
    };

    const resultEn = productionPreviewSanitizer.sanitize(sampleRawGraph, policyEn);

    // Yahya: Deceased/Public -> Unmasked, has birth/death years, has photo
    const yahya = resultEn.nodes.find((n) => n.previewId === 'preview-node-1')!;
    expect(yahya.displayName).toBe('Ancestor Yahya');
    expect(yahya.isMasked).toBe(false);
    expect(yahya.hasPhoto).toBe(true);
    expect(yahya.birthYear).toBe(1905);
    expect(yahya.deathYear).toBe(1970);

    // Mona: Living/Public -> Masked, no years, no photo
    const mona = resultEn.nodes.find((n) => n.previewId === 'preview-node-2')!;
    expect(mona.displayName).toBe('Masked person');
    expect(mona.isMasked).toBe(true);
    expect(mona.hasPhoto).toBe(false);
    expect(mona.birthYear).toBeUndefined();

    // Arabic masking check
    const policyAr = {
      privacyMode: 'masked' as const,
      includePhotos: true,
      includeYears: true,
      maxNodes: 10,
      language: 'ar' as const,
    };

    const resultAr = productionPreviewSanitizer.sanitize(sampleRawGraph, policyAr);
    const monaAr = resultAr.nodes.find((n) => n.previewId === 'preview-node-2')!;
    expect(monaAr.displayName).toBe('شخص مخفي');
  });

  it('respects node limits, sets truncated status, and filters connected edges', () => {
    const policy = {
      privacyMode: 'masked' as const,
      includePhotos: true,
      includeYears: true,
      maxNodes: 2, // Crops Private Cousin
      language: 'en' as const,
    };

    const result = productionPreviewSanitizer.sanitize(sampleRawGraph, policy);

    expect(result.nodes.length).toBe(2);
    expect(result.metadata.truncated).toBe(true);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain('truncated to 2');

    // Only Ali -> Mona relationship remains
    expect(result.edges.length).toBe(1);
    expect(result.edges[0].fromPreviewId).toBe('preview-node-1');
    expect(result.edges[0].toPreviewId).toBe('preview-node-2');
  });

  it('allows short public poster details while stripping them from living and private nodes', () => {
    const result = productionPreviewSanitizer.sanitize(sampleRawGraph, {
      privacyMode: 'masked',
      includePhotos: false,
      includeYears: false,
      includeBirthPlace: true,
      includeOccupation: true,
      includeDescription: true,
      maxNodes: 10,
      language: 'en',
    });

    expect(result.nodes[0].birthPlaceLabel).toBe('Damascus Syria');
    expect(result.nodes[0].occupationLabel).toBe('Historian');
    expect(result.nodes[0].descriptionLabel).toBe(
      'Preserved family archives and documented oral history for future generations.'
    );
    expect(result.nodes[1].birthPlaceLabel).toBeUndefined();
    expect(result.nodes[1].occupationLabel).toBeUndefined();
    expect(result.nodes[1].descriptionLabel).toBeUndefined();
    expect(JSON.stringify(result)).not.toContain('Riyadh');
    expect(JSON.stringify(result)).not.toContain('Engineer');
    expect(JSON.stringify(result)).not.toContain('living profile description');
  });

  it('normalizes and caps the optional descriptive line without exposing the full source text', () => {
    const longDescription = `Family historian ${'and archive keeper '.repeat(10)}`;
    const graph: PreviewSanitizerRawGraph = {
      nodes: [{ ...sampleRawGraph.nodes[0], description: longDescription }],
      edges: [],
    };
    const result = productionPreviewSanitizer.sanitize(graph, {
      privacyMode: 'owner-full',
      includePhotos: false,
      includeYears: false,
      includeDescription: true,
      maxNodes: 1,
      language: 'en',
    });

    expect(result.nodes[0].descriptionLabel).toHaveLength(90);
    expect(result.nodes[0].descriptionLabel).toMatch(/\.\.\.$/);
    expect(result.nodes[0].descriptionLabel).not.toBe(longDescription.trim());
  });

  it('verifies owner-full policy mode enforces data rules while displaying public ancestor details', () => {
    const policy = {
      privacyMode: 'owner-full' as const,
      includePhotos: true,
      includeYears: true,
      maxNodes: 10,
      language: 'en' as const,
    };

    const result = productionPreviewSanitizer.sanitize(sampleRawGraph, policy);

    // Yahya: Public/Deceased -> Unmasked
    const yahya = result.nodes.find((n) => n.previewId === 'preview-node-1')!;
    expect(yahya.displayName).toBe('Ancestor Yahya');
    expect(yahya.isMasked).toBe(false);

    // Mona: Public/Living -> Unmasked in owner-full
    const mona = result.nodes.find((n) => n.previewId === 'preview-node-2')!;
    expect(mona.displayName).toBe('Parent Mona');
    expect(mona.isMasked).toBe(false);

    // Private Cousin: Private/Living -> Masked
    const cousin = result.nodes.find((n) => n.previewId === 'preview-node-3')!;
    expect(cousin.displayName).toBe('Masked person');
    expect(cousin.isMasked).toBe(true);
  });

  it('evaluates complete policy matrix for owner-full / masked / includePhotos / hideLivingPhotos', () => {
    const rawGraph: PreviewSanitizerRawGraph = {
      nodes: [
        { rawId: 'n1', displayName: 'Deceased Person', isLiving: false, isPrivate: false, hasProfilePhoto: true },
        { rawId: 'n2', displayName: 'Living Public Person', isLiving: true, isPrivate: false, hasProfilePhoto: true },
        { rawId: 'n3', displayName: 'Living Private Person', isLiving: true, isPrivate: true, hasProfilePhoto: true },
      ],
      edges: [],
    };

    // Matrix 1: masked, includePhotos: true, hideLivingPhotos: false
    const res1 = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode: 'masked',
      includePhotos: true,
      hideLivingPhotos: false,
      includeYears: true,
      maxNodes: 10,
      language: 'en',
    });
    expect(res1.nodes[0].hasPhoto).toBe(true);  // Deceased -> photo shown
    expect(res1.nodes[1].hasPhoto).toBe(false); // Living in masked -> photo hidden
    expect(res1.nodes[2].hasPhoto).toBe(false); // Private in masked -> photo hidden

    // Matrix 2: masked, includePhotos: true, hideLivingPhotos: true
    const res2 = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode: 'masked',
      includePhotos: true,
      hideLivingPhotos: true,
      includeYears: true,
      maxNodes: 10,
      language: 'en',
    });
    expect(res2.nodes[0].hasPhoto).toBe(true);  // Deceased -> photo shown
    expect(res2.nodes[1].hasPhoto).toBe(false); // Living -> hideLivingPhotos hides it
    expect(res2.nodes[2].hasPhoto).toBe(false); // Living private -> hidden

    // Matrix 3: owner-full, includePhotos: true, hideLivingPhotos: false
    const res3 = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode: 'owner-full',
      includePhotos: true,
      hideLivingPhotos: false,
      includeYears: true,
      maxNodes: 10,
      language: 'en',
    });
    expect(res3.nodes[0].hasPhoto).toBe(true);  // Deceased -> photo shown
    expect(res3.nodes[1].hasPhoto).toBe(true);  // Living public in owner-full -> photo shown
    expect(res3.nodes[2].hasPhoto).toBe(false); // Living private in owner-full -> photo hidden

    // Matrix 4: owner-full, includePhotos: true, hideLivingPhotos: true
    const res4 = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode: 'owner-full',
      includePhotos: true,
      hideLivingPhotos: true,
      includeYears: true,
      maxNodes: 10,
      language: 'en',
    });
    expect(res4.nodes[0].hasPhoto).toBe(true);  // Deceased -> photo shown
    expect(res4.nodes[1].hasPhoto).toBe(false); // Living public with hideLivingPhotos: true -> photo hidden
    expect(res4.nodes[2].hasPhoto).toBe(false); // Living private -> photo hidden

    // Matrix 5: includePhotos: false (overrides all photo settings)
    const res5 = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode: 'owner-full',
      includePhotos: false,
      hideLivingPhotos: false,
      includeYears: true,
      maxNodes: 10,
      language: 'en',
    });
    expect(res5.nodes[0].hasPhoto).toBe(false);
    expect(res5.nodes[1].hasPhoto).toBe(false);
    expect(res5.nodes[2].hasPhoto).toBe(false);
  });

  it('asserts compile-time types safety checks', () => {
    // @ts-expect-error email is intentionally not allowed in PreviewSanitizerRawNode
    const invalidNodeEmail: PreviewSanitizerRawNode = { rawId: '1', displayName: 'Ali', email: 'ali@test.com' };

    // @ts-expect-error phone is intentionally not allowed in PreviewSanitizerRawNode
    const invalidNodePhone: PreviewSanitizerRawNode = { rawId: '2', displayName: 'Bassam', phone: '+96612345' };

    // @ts-expect-error photoUrl is intentionally not allowed in PreviewSanitizerRawNode
    const invalidNodePhotoUrl: PreviewSanitizerRawNode = { rawId: '3', displayName: 'Cousin', photoUrl: 'https://cdn.com/bassam.jpg' };

    expect(invalidNodeEmail).toBeDefined();
    expect(invalidNodePhone).toBeDefined();
    expect(invalidNodePhotoUrl).toBeDefined();
  });
});
