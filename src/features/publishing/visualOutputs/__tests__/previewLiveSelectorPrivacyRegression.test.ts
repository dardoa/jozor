import { describe, expect, it } from 'vitest';
import {
  productionPreviewSanitizer,
  type PreviewSanitizerRawGraph,
  type PreviewSanitizerRawNode,
} from '../../index';

interface StoreShapedPersonFixture {
  readonly id: string;
  readonly firstName: string;
  readonly middleName?: string;
  readonly lastName?: string;
  readonly birthDate?: string;
  readonly deathDate?: string;
  readonly isDeceased: boolean;
  readonly isPrivate?: boolean;
  readonly photoUrl?: string;
  readonly photoPath?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly address?: string;
  readonly notes?: string;
  readonly sources?: readonly unknown[];
  readonly metadata?: Record<string, unknown>;
}

interface StoreShapedRelationshipFixture {
  readonly id: string;
  readonly fromPersonId: string;
  readonly toPersonId: string;
  readonly type: 'BIOLOGICAL_PARENT' | 'SPOUSE' | 'PARTNER';
  readonly metadata?: Record<string, unknown>;
}

const toDisplayName = (person: StoreShapedPersonFixture): string =>
  [person.firstName, person.middleName, person.lastName].filter(Boolean).join(' ');

const mapStoreFixtureToPreviewRawGraph = (
  people: Record<string, StoreShapedPersonFixture>,
  relationships: Record<string, StoreShapedRelationshipFixture>
): PreviewSanitizerRawGraph => ({
  nodes: Object.values(people).map((person): PreviewSanitizerRawNode => ({
    rawId: person.id,
    displayName: toDisplayName(person),
    isLiving: !person.isDeceased,
    isPrivate: person.isPrivate,
    generation: 1,
    relationshipHint: 'relative',
    birthDate: person.birthDate,
    deathDate: person.deathDate,
    hasProfilePhoto: Boolean(person.photoUrl || person.photoPath),
  })),
  edges: Object.values(relationships).map((relationship) => ({
    fromRawId: relationship.fromPersonId,
    toRawId: relationship.toPersonId,
    relationshipType: relationship.type === 'SPOUSE' || relationship.type === 'PARTNER'
      ? 'spouse'
      : 'parent-child',
  })),
});

describe('Preview Live Selector Privacy Regression Fixture', () => {
  const people: Record<string, StoreShapedPersonFixture> = {
    'person-public': {
      id: 'person-public',
      firstName: 'Public',
      lastName: 'Ancestor',
      birthDate: '1910-05-12',
      deathDate: '1988-09-01',
      isDeceased: true,
      photoUrl: 'https://storage.example.com/private/public-photo.jpg',
      email: 'public@example.com',
      phone: '+966500000001',
      address: 'Private Address 1',
      notes: 'Free-form private note',
      metadata: { client_id: 'client-secret' },
    },
    'person-living': {
      id: 'person-living',
      firstName: 'Living',
      lastName: 'Person',
      birthDate: '1980-01-01',
      isDeceased: false,
      photoPath: '/local/private/living.jpg',
      email: 'living@example.com',
      phone: '+966500000002',
      address: 'Private Address 2',
      notes: 'Living private note',
    },
    'person-private': {
      id: 'person-private',
      firstName: 'Private',
      lastName: 'Relative',
      birthDate: '1940-01-01',
      deathDate: '2001-01-01',
      isDeceased: true,
      isPrivate: true,
      photoUrl: 'https://storage.example.com/private/relative.jpg',
      email: 'private@example.com',
      phone: '+966500000003',
      address: 'Private Address 3',
      sources: [{ id: 'source-secret', text: 'Raw source text' }],
    },
  };

  const relationships: Record<string, StoreShapedRelationshipFixture> = {
    'rel-parent': {
      id: 'rel-parent',
      fromPersonId: 'person-public',
      toPersonId: 'person-living',
      type: 'BIOLOGICAL_PARENT',
      metadata: { startDate: '1979-01-01', internalNote: 'relationship note' },
    },
  };

  it('maps store-shaped fixtures into preview raw graphs without contact/media URL fields', () => {
    const rawGraph = mapStoreFixtureToPreviewRawGraph(people, relationships);
    const serializedRawGraph = JSON.stringify(rawGraph);

    expect(rawGraph.nodes).toHaveLength(3);
    expect(rawGraph.edges).toHaveLength(1);
    expect(serializedRawGraph).not.toContain('public@example.com');
    expect(serializedRawGraph).not.toContain('+966500000001');
    expect(serializedRawGraph).not.toContain('Private Address');
    expect(serializedRawGraph).not.toContain('storage.example.com');
    expect(serializedRawGraph).not.toContain('/local/private');
    expect(serializedRawGraph).not.toContain('Free-form private note');
    expect(serializedRawGraph).not.toContain('client-secret');
    expect(serializedRawGraph).not.toContain('Raw source text');
    expect(serializedRawGraph).not.toContain('rel-parent');
  });

  it('passes through production sanitizer and masks living/private people before adapter ingestion', () => {
    const rawGraph = mapStoreFixtureToPreviewRawGraph(people, relationships);
    const sanitizedGraph = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode: 'masked',
      includePhotos: true,
      includeYears: true,
      maxNodes: 10,
      language: 'en',
    });

    const publicNode = sanitizedGraph.nodes[0];
    const livingNode = sanitizedGraph.nodes[1];
    const privateNode = sanitizedGraph.nodes[2];

    expect(publicNode.displayName).toBe('Public Ancestor');
    expect(publicNode.birthYear).toBe(1910);
    expect(publicNode.hasPhoto).toBe(true);

    expect(livingNode.displayName).toBe('Masked person');
    expect(livingNode.birthYear).toBeUndefined();
    expect(livingNode.hasPhoto).toBe(false);

    expect(privateNode.displayName).toBe('Masked person');
    expect(privateNode.deathYear).toBeUndefined();
    expect(privateNode.hasPhoto).toBe(false);

    const serializedSanitizedGraph = JSON.stringify(sanitizedGraph);
    expect(serializedSanitizedGraph).not.toContain('person-public');
    expect(serializedSanitizedGraph).not.toContain('person-living');
    expect(serializedSanitizedGraph).not.toContain('person-private');
    expect(serializedSanitizedGraph).not.toContain('email');
    expect(serializedSanitizedGraph).not.toContain('phone');
    expect(serializedSanitizedGraph).not.toContain('photoUrl');
    expect(serializedSanitizedGraph).not.toContain('notes');
  });
});
