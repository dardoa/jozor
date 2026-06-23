﻿import { describe, it, expect } from 'vitest';
import { Person } from '../index';
import {
  generateDeterministicUuid,
  getNormalizedSourceKey,
  deriveSourcesAndCitationsFromPeople,
  applyCitationsToLegacyPersonFields,
  mergeDerivedSourcesAndCitations,
} from '../citation';

describe('Citation Engine Kernel', () => {
  const treeId = 'test-tree';

  const mockPerson1: Person = {
    id: 'p1',
    title: '',
    firstName: 'John',
    middleName: '',
    lastName: 'Doe',
    birthName: '',
    nickName: '',
    suffix: '',
    gender: 'male',
    birthDate: '1900-01-01',
    birthPlace: 'New York',
    birthSource: 'Birth Certificate of John Doe',
    deathDate: '',
    deathPlace: '',
    deathSource: '',
    burialPlace: '',
    residence: '',
    isDeceased: false,
    profession: '',
    company: '',
    interests: '',
    bio: '',
    gallery: [],
    voiceNotes: [],
    sources: [
      { id: 's-old-1', title: '1920 US Census', type: 'document', url: 'https://census.gov' },
    ],
    events: [],
    email: '',
    website: '',
    blog: '',
    address: '',
    parents: [],
    spouses: [],
    children: [],
  };

  const mockPerson2: Person = {
    ...mockPerson1,
    id: 'p2',
    firstName: 'Jane',
    birthSource: 'Family Bible',
    deathDate: '1980-05-05',
    deathPlace: 'Boston',
    deathSource: 'Death Certificate of Jane Doe',
    sources: [
      { id: 's-old-1', title: '1920 US Census', type: 'document', url: 'https://census.gov' },
    ],
  };

  const peopleMap: Record<string, Person> = {
    p1: mockPerson1,
    p2: mockPerson2,
  };

  describe('generateDeterministicUuid', () => {
    it('should generate identical UUIDs for identical inputs', () => {
      const input = 'test-normalized-key';
      const uuid1 = generateDeterministicUuid(input);
      const uuid2 = generateDeterministicUuid(input);
      expect(uuid1).toBe(uuid2);
      expect(uuid1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
    });

    it('should generate different UUIDs for different inputs', () => {
      const uuid1 = generateDeterministicUuid('input-1');
      const uuid2 = generateDeterministicUuid('input-2');
      expect(uuid1).not.toBe(uuid2);
    });
  });

  describe('getNormalizedSourceKey', () => {
    it('should normalize type to uppercase and title to trimmed lowercase with single spaces', () => {
      const key1 = getNormalizedSourceKey('tree-1', 'book', '  My   Great Book  ');
      const key2 = getNormalizedSourceKey('tree-1', 'BOOK', 'my great book');
      expect(key1).toBe(key2);
      expect(key1).toBe('tree-1:BOOK:my great book');
    });
  });

  describe('deriveSourcesAndCitationsFromPeople', () => {
    it('should derive sources and citations correctly and deduplicate common sources', () => {
      const { sources, citations } = deriveSourcesAndCitationsFromPeople(treeId, peopleMap);

      // Unique sources:
      // 1. '1920 US Census' (referenced by both p1 and p2) -> deduplicated to 1 source!
      // 2. 'Birth Certificate of John Doe' (p1 birthSource)
      // 3. 'Family Bible' (p2 birthSource)
      // 4. 'Death Certificate of Jane Doe' (p2 deathSource)
      const sourceList = Object.values(sources);
      expect(sourceList).toHaveLength(4);

      // Confirm '1920 US Census' source fields
      const censusSource = sourceList.find((s) => s.title === '1920 US Census');
      expect(censusSource).toBeDefined();
      expect(censusSource?.type).toBe('DOCUMENT');
      expect(censusSource?.url).toBe('https://census.gov');

      // Citations count:
      // - p1: 1 general (1920 Census), 1 birthSource
      // - p2: 1 general (1920 Census), 1 birthSource, 1 deathSource
      // Total citations = 5
      const citationList = Object.values(citations);
      expect(citationList).toHaveLength(5);

      // Verify John Doe (p1) birth citation
      const p1BirthCit = citationList.find(
        (c) => c.targetId === 'p1' && c.targetField === 'person.birth.date'
      );
      expect(p1BirthCit).toBeDefined();
      expect(p1BirthCit?.confidence).toBe('HIGH');
      expect(sources[p1BirthCit!.sourceId].title).toBe('Birth Certificate of John Doe');

      // Verify Jane Doe (p2) general citation
      const p2GeneralCit = citationList.find(
        (c) => c.targetId === 'p2' && c.targetField === 'person.profile.sources'
      );
      expect(p2GeneralCit).toBeDefined();
      expect(sources[p2GeneralCit!.sourceId].title).toBe('1920 US Census');
    });
  });

  describe('mergeDerivedSourcesAndCitations', () => {
    it('preserves non-derived sources and citations while replacing derived records', () => {
      const derived = deriveSourcesAndCitationsFromPeople(treeId, peopleMap);
      const manualSource = {
        id: 'manual-source',
        treeId,
        type: 'BOOK' as const,
        title: 'Family Archive',
        normalizedKey: `${treeId}:BOOK:family archive`,
        origin: 'USER_CREATED',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      const manualCitation = {
        id: 'manual-citation',
        treeId,
        sourceId: manualSource.id,
        targetType: 'PERSON' as const,
        targetId: 'p1',
        targetField: 'person.profile.sources',
        origin: 'USER_CREATED',
        createdAt: '2026-01-01T00:00:00.000Z',
      };
      const staleDerivedSource = {
        id: 'stale-derived-source',
        treeId,
        type: 'DOCUMENT' as const,
        title: 'Removed legacy source',
        normalizedKey: `${treeId}:DOCUMENT:removed legacy source`,
        origin: 'migration',
        createdAt: '2026-01-01T00:00:00.000Z',
      };

      const merged = mergeDerivedSourcesAndCitations(
        { [manualSource.id]: manualSource, [staleDerivedSource.id]: staleDerivedSource },
        { [manualCitation.id]: manualCitation },
        derived.sources,
        derived.citations
      );

      expect(merged.sources[manualSource.id]).toBe(manualSource);
      expect(merged.citations[manualCitation.id]).toBe(manualCitation);
      expect(merged.sources[staleDerivedSource.id]).toBeUndefined();
      expect(Object.keys(merged.sources).length).toBe(Object.keys(derived.sources).length + 1);
    });
  });

  describe('applyCitationsToLegacyPersonFields', () => {
    it('should reconstruct legacy fields from sources and citations correctly', () => {
      // 1. Derive structured sources and citations
      const { sources, citations } = deriveSourcesAndCitationsFromPeople(treeId, peopleMap);

      // 2. Clear unstructured fields on the mock records
      const clearedPeople: Record<string, Person> = {
        p1: { ...mockPerson1, birthSource: '', sources: [] },
        p2: { ...mockPerson2, birthSource: '', deathSource: '', sources: [] },
      };

      // 3. Apply the reconstruction sync helper
      const reconstructed = applyCitationsToLegacyPersonFields(clearedPeople, citations, sources);

      // 4. Assert reconstructed match original mocks!
      expect(reconstructed.p1.birthSource).toBe(mockPerson1.birthSource);
      expect(reconstructed.p1.sources).toHaveLength(1);
      expect(reconstructed.p1.sources[0].title).toBe('1920 US Census');
      expect(reconstructed.p1.sources[0].url).toBe('https://census.gov');

      expect(reconstructed.p2.birthSource).toBe(mockPerson2.birthSource);
      expect(reconstructed.p2.deathSource).toBe(mockPerson2.deathSource);
      expect(reconstructed.p2.sources).toHaveLength(1);
      expect(reconstructed.p2.sources[0].title).toBe('1920 US Census');
    });
  });
});
