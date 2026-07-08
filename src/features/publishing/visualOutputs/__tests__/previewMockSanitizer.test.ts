import { describe, expect, it } from 'vitest';
import {
  mockPreviewSanitizer,
  type MockPreviewRawGraph,
} from '../../index';

describe('Preview Mock Sanitizer Rules', () => {
  const sampleRawGraph: MockPreviewRawGraph = {
    nodes: [
      {
        rawId: 'db-person-1',
        name: 'Grandfather Ali',
        isLiving: false,
        isPrivate: false,
        generation: 1,
        relationshipHint: 'ancestor',
        birthDate: '1910-05-12',
        deathDate: '1985-11-20',
        photoUrl: 'https://cdn.com/photos/ali.jpg',
        email: 'ali@gmail.com',
        phone: '+966123456',
        address: 'Riyadh, Saudi Arabia',
        notes: 'Founder of the family business.',
      },
      {
        rawId: 'db-person-2',
        name: 'Father Bassam',
        isLiving: true,
        isPrivate: false,
        generation: 2,
        relationshipHint: 'parent',
        birthDate: '1955-08-30',
        photoUrl: 'https://cdn.com/photos/bassam.jpg',
        email: 'bassam@gmail.com',
        phone: '+966789123',
        notes: 'Mechanical engineer.',
      },
      {
        rawId: 'db-person-3',
        name: 'Secret Cousin',
        isLiving: true,
        isPrivate: true,
        generation: 3,
        relationshipHint: 'relative',
        birthDate: '1995-12-01',
      },
    ],
    edges: [
      {
        fromRawId: 'db-person-1',
        toRawId: 'db-person-2',
        relationshipType: 'parent-child',
      },
      {
        fromRawId: 'db-person-2',
        toRawId: 'db-person-3',
        relationshipType: 'parent-child',
      },
    ],
  };

  it('performs basic sanitization and strictly excludes all forbidden database/contact fields', () => {
    const policy = {
      privacyMode: 'masked' as const,
      includePhotos: true,
      includeYears: true,
      maxNodes: 10,
      language: 'en' as const,
    };

    const result = mockPreviewSanitizer.sanitize(sampleRawGraph, policy);

    expect(result.nodes.length).toBe(3);
    expect(result.metadata.truncated).toBe(false);

    // Verify all nodes conform to SanitizedPreviewNode structure and omit forbidden keys
    result.nodes.forEach((node) => {
      expect(node.previewId).toMatch(/^preview-node-\d+$/);
      
      const forbiddenKeys = [
        'id',
        'rawId',
        'email',
        'phone',
        'address',
        'photoUrl',
        'mediaPath',
        'notes',
        'note',
        'sourceText',
      ];
      expect(Object.keys(node)).not.toEqual(expect.arrayContaining(forbiddenKeys));
    });
  });

  it('enforces privacy masking rules for living and private profiles in English and Arabic', () => {
    // English masked request
    const policyEn = {
      privacyMode: 'masked' as const,
      includePhotos: true,
      includeYears: true,
      maxNodes: 10,
      language: 'en' as const,
    };

    const resultEn = mockPreviewSanitizer.sanitize(sampleRawGraph, policyEn);

    // Ali: Deceased/Public -> Unmasked, has birth/death years, has photo
    const aliEn = resultEn.nodes.find((n) => n.previewId === 'preview-node-1')!;
    expect(aliEn.displayName).toBe('Grandfather Ali');
    expect(aliEn.isMasked).toBe(false);
    expect(aliEn.hasPhoto).toBe(true);
    expect(aliEn.birthYear).toBe(1910);
    expect(aliEn.deathYear).toBe(1985);

    // Bassam: Living/Public -> Masked, no years, no photo
    const bassamEn = resultEn.nodes.find((n) => n.previewId === 'preview-node-2')!;
    expect(bassamEn.displayName).toBe('Masked person');
    expect(bassamEn.isMasked).toBe(true);
    expect(bassamEn.hasPhoto).toBe(false);
    expect(bassamEn.birthYear).toBeUndefined();

    // Arabic masked request
    const policyAr = {
      privacyMode: 'masked' as const,
      includePhotos: true,
      includeYears: true,
      maxNodes: 10,
      language: 'ar' as const,
    };

    const resultAr = mockPreviewSanitizer.sanitize(sampleRawGraph, policyAr);
    const bassamAr = resultAr.nodes.find((n) => n.previewId === 'preview-node-2')!;
    expect(bassamAr.displayName).toBe('شخص مخفي');
  });

  it('respects node limits, sets truncated metadata, and filters out disconnected edges', () => {
    const policy = {
      privacyMode: 'masked' as const,
      includePhotos: true,
      includeYears: true,
      maxNodes: 2, // Only Ali and Bassam will pass
      language: 'en' as const,
    };

    const result = mockPreviewSanitizer.sanitize(sampleRawGraph, policy);

    expect(result.nodes.length).toBe(2);
    expect(result.metadata.truncated).toBe(true);
    expect(result.warnings.length).toBe(1);
    expect(result.warnings[0]).toContain('truncated to 2');

    // Edges verification: Bassam -> Secret Cousin edge must be deleted because Secret Cousin is truncated
    expect(result.edges.length).toBe(1);
    expect(result.edges[0].fromPreviewId).toBe('preview-node-1');
    expect(result.edges[0].toPreviewId).toBe('preview-node-2');
  });

  it('verifies owner-full policy mode enforces data rules while displaying public ancestor details', () => {
    const policy = {
      privacyMode: 'owner-full' as const, // Censors only private nodes, unmasks living if public
      includePhotos: true,
      includeYears: true,
      maxNodes: 10,
      language: 'en' as const,
    };

    const result = mockPreviewSanitizer.sanitize(sampleRawGraph, policy);

    // Grandfather Ali: Public/Deceased -> Unmasked
    const ali = result.nodes.find((n) => n.previewId === 'preview-node-1')!;
    expect(ali.displayName).toBe('Grandfather Ali');
    expect(ali.isMasked).toBe(false);

    // Father Bassam: Public/Living -> Unmasked in owner-full mode (public profiles are unmasked)
    const bassam = result.nodes.find((n) => n.previewId === 'preview-node-2')!;
    expect(bassam.displayName).toBe('Father Bassam');
    expect(bassam.isMasked).toBe(false);

    // Secret Cousin: Private/Living -> Masked (Private settings always override)
    const cousin = result.nodes.find((n) => n.previewId === 'preview-node-3')!;
    expect(cousin.displayName).toBe('Masked person');
    expect(cousin.isMasked).toBe(true);

    // Absolute Rule: Even in owner-full, forbidden contact fields must NEVER be leaked
    result.nodes.forEach((node) => {
      const stringified = JSON.stringify(node);
      expect(stringified).not.toContain('@');
      expect(stringified).not.toContain('phone');
      expect(stringified).not.toContain('notes');
    });
  });
});
