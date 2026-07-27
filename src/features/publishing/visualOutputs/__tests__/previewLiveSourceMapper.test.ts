import { describe, expect, it } from 'vitest';
import {
  mapPreviewStoreSourceToLiveTreeSource,
  productionPreviewSanitizer,
  selectPosterPreviewGraph,
  selectSnapshotPreviewGraph,
  type PreviewStorePersonInput,
} from '../../index';

describe('Preview Live Source Mapper', () => {
  const source = mapPreviewStoreSourceToLiveTreeSource({
    sourceKind: 'store',
    people: [
      {
        rawId: 'root-raw',
        firstName: 'Living',
        lastName: 'Root',
        birthDate: '1980-01-01',
        isDeceased: false,
        hasProfilePhoto: true,
      },
      {
        rawId: 'father-raw',
        firstName: 'Public',
        lastName: 'Father',
        birthDate: '1950-01-01',
        deathDate: '2020-01-01',
        birthPlace: 'Damascus',
        occupation: 'Teacher',
        description: 'Family educator and community mentor',
        isDeceased: true,
        hasProfilePhoto: true,
      },
      {
        rawId: 'mother-raw',
        displayName: 'Private Mother',
        birthDate: '1955-01-01',
        deathDate: '2021-01-01',
        isDeceased: true,
        isPrivate: true,
        hasProfilePhoto: true,
      },
    ],
    relationships: [
      { fromPersonId: 'father-raw', toPersonId: 'root-raw', type: 'BIOLOGICAL_PARENT' },
      { fromPersonId: 'mother-raw', toPersonId: 'root-raw', type: 'BIOLOGICAL_PARENT' },
    ],
  });

  it('maps allowed store-shaped fields into PreviewLiveTreeSource without forbidden attributes', () => {
    expect(source.sourceKind).toBe('store');
    expect(source.people['root-raw'].displayName).toBe('Living Root');
    expect(source.people['root-raw'].isLiving).toBe(true);
    expect(source.relationships).toEqual([
      { fromRawId: 'father-raw', toRawId: 'root-raw', relationshipType: 'parent-child' },
      { fromRawId: 'mother-raw', toRawId: 'root-raw', relationshipType: 'parent-child' },
    ]);

    const serialized = JSON.stringify(source);
    expect(serialized).not.toContain('email');
    expect(serialized).not.toContain('phone');
    expect(serialized).not.toContain('address');
    expect(serialized).not.toContain('photoUrl');
    expect(serialized).not.toContain('photoPath');
    expect(serialized).not.toContain('notes');
  });

  it('feeds poster selector and sanitizer without leaking raw ids into the sanitized graph', () => {
    const rawGraph = selectPosterPreviewGraph.selectRawGraph(source, {
      productType: 'poster',
      definitionId: 'classic-ancestor-poster',
      rootPersonId: 'root-raw',
      maxDepth: 2,
      maxNodes: 10,
      language: 'en',
    });

    const sanitizedGraph = productionPreviewSanitizer.sanitize(rawGraph, {
      privacyMode: 'masked',
      includePhotos: true,
      includeYears: true,
      includeBirthPlace: true,
      includeOccupation: true,
      includeDescription: true,
      maxNodes: 10,
      language: 'en',
    });

    expect(sanitizedGraph.nodes).toHaveLength(3);
    expect(sanitizedGraph.nodes[0].displayName).toBe('Masked person');
    expect(sanitizedGraph.nodes[1].displayName).toBe('Public Father');
    expect(sanitizedGraph.nodes[1].birthPlaceLabel).toBe('Damascus');
    expect(sanitizedGraph.nodes[1].occupationLabel).toBe('Teacher');
    expect(sanitizedGraph.nodes[1].descriptionLabel).toBe('Family educator and community mentor');
    expect(sanitizedGraph.nodes[2].displayName).toBe('Masked person');
    expect(JSON.stringify(sanitizedGraph)).not.toContain('root-raw');
    expect(JSON.stringify(sanitizedGraph)).not.toContain('father-raw');
  });

  it('feeds snapshot selector with an explicit visible-node subset only', () => {
    const rawGraph = selectSnapshotPreviewGraph.selectRawGraph(source, {
      productType: 'snapshot',
      definitionId: 'current-tree-snapshot',
      visibleNodeIds: ['root-raw', 'father-raw'],
      maxNodes: 10,
      language: 'en',
    });

    expect(rawGraph.nodes.map((node) => node.rawId)).toEqual(['root-raw', 'father-raw']);
    expect(rawGraph.edges).toHaveLength(1);
  });

  it('rejects contact and media URL fields at compile time', () => {
    const validPerson: PreviewStorePersonInput = {
      rawId: 'allowed',
      firstName: 'Allowed',
    };

    const invalidPerson: PreviewStorePersonInput = {
      rawId: 'blocked',
      // @ts-expect-error PreviewStorePersonInput must not accept contact or URL fields.
      email: 'blocked@example.com',
    };

    expect(validPerson.rawId).toBe('allowed');
    expect(invalidPerson.rawId).toBe('blocked');
  });
});
