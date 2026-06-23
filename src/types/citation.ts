﻿import CryptoJS from 'crypto-js';
import type { Person } from './person';

export const LEGACY_DERIVED_CITATION_ORIGIN = 'migration';

export type CitationClaimKey =
  | 'person.birth.date'
  | 'person.birth.place'
  | 'person.death.date'
  | 'person.death.place'
  | 'person.profile.sources'
  | 'relationship.parent'
  | 'relationship.spouse'
  | 'event.date'
  | 'event.place';

export interface Source {
  readonly id: string; // Deterministic UUID based on normalizedKey
  readonly treeId: string;
  readonly type: 'DOCUMENT' | 'ORAL' | 'PHOTO' | 'ARCHIVE' | 'BOOK' | 'WEBSITE' | 'OTHER';
  readonly title: string;
  readonly normalizedKey: string;
  readonly author?: string;
  readonly date?: string;
  readonly url?: string;
  readonly notes?: string;
  readonly origin?: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export interface Citation {
  readonly id: string; // Deterministic UUID based on target properties
  readonly treeId: string;
  readonly sourceId: string;
  readonly targetType: 'PERSON' | 'RELATIONSHIP' | 'EVENT';
  readonly targetId: string;
  readonly targetField?: CitationClaimKey | string;
  readonly quote?: string;
  readonly notes?: string;
  readonly confidence?: 'LOW' | 'MEDIUM' | 'HIGH';
  readonly origin?: string;
  readonly createdAt: string;
  readonly updatedAt?: string;
}

export function isLegacyDerivedCitationOrigin(origin?: string): boolean {
  return origin === LEGACY_DERIVED_CITATION_ORIGIN || origin === 'LEGACY_DERIVED';
}

/**
 * Generates a deterministic UUID version 4 compliant string from an input string using SHA-256.
 * Formats: xxxxxxxx-xxxx-4xxx-axxx-xxxxxxxxxxxx
 */
export function generateDeterministicUuid(input: string): string {
  const hash = CryptoJS.SHA256(input).toString();
  const part1 = hash.slice(0, 8);
  const part2 = hash.slice(8, 12);
  const part3 = hash.slice(12, 16);
  const part4 = hash.slice(16, 20);
  const part5 = hash.slice(20, 32);

  // Set version to 4 (replace first char of part3 with '4')
  const part3Overridden = '4' + part3.slice(1);

  // Set variant to RFC 4122 (replace first char of part4 with 'a')
  const part4Overridden = 'a' + part4.slice(1);

  return `${part1}-${part2}-${part3Overridden}-${part4Overridden}-${part5}`;
}

/**
 * Returns a normalized key for duplicate source detection.
 */
export function getNormalizedSourceKey(treeId: string, type: string, title: string): string {
  const cleanTitle = (title || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const cleanType = (type || 'OTHER').trim().toUpperCase();
  return `${treeId}:${cleanType}:${cleanTitle}`;
}

function mapToSourceType(type?: string): 'DOCUMENT' | 'ORAL' | 'PHOTO' | 'ARCHIVE' | 'BOOK' | 'WEBSITE' | 'OTHER' {
  if (!type) return 'OTHER';
  const upper = type.toUpperCase();
  if (['DOCUMENT', 'ORAL', 'PHOTO', 'ARCHIVE', 'BOOK', 'WEBSITE', 'OTHER'].includes(upper)) {
    return upper as Source['type'];
  }
  if (upper === 'SOURCE' || upper === 'LINK') return 'DOCUMENT';
  return 'OTHER';
}

/**
 * Derives shared sources and citations from legacy people records.
 * Uses deterministic hashing for IDs to prevent db write churn.
 */
export function deriveSourcesAndCitationsFromPeople(
  treeId: string,
  people: Record<string, Person>
): { sources: Record<string, Source>; citations: Record<string, Citation> } {
  const sources: Record<string, Source> = {};
  const citations: Record<string, Citation> = {};
  const createdAt = new Date().toISOString();

  Object.values(people).forEach((person) => {
    if (!person || !person.id) return;

    // 1. Convert person.sources
    (person.sources || []).forEach((src) => {
      if (!src || !src.title) return;

      const type = mapToSourceType(src.type);
      const normalizedKey = getNormalizedSourceKey(treeId, type, src.title);
      const sourceId = generateDeterministicUuid(normalizedKey);

      if (!sources[sourceId]) {
        sources[sourceId] = {
          id: sourceId,
          treeId,
          type,
          title: src.title,
          normalizedKey,
          url: src.url || undefined,
          date: src.date || undefined,
          origin: LEGACY_DERIVED_CITATION_ORIGIN,
          createdAt,
        };
      }

      const citationKey = `${treeId}:${sourceId}:PERSON:${person.id}:person.profile.sources`;
      const citationId = generateDeterministicUuid(citationKey);

      if (!citations[citationId]) {
        citations[citationId] = {
          id: citationId,
          treeId,
          sourceId,
          targetType: 'PERSON',
          targetId: person.id,
          targetField: 'person.profile.sources',
          origin: LEGACY_DERIVED_CITATION_ORIGIN,
          createdAt,
        };
      }
    });

    // 2. Convert person.birthSource
    if (person.birthSource && person.birthSource.trim()) {
      const type = 'DOCUMENT';
      const normalizedKey = getNormalizedSourceKey(treeId, type, person.birthSource);
      const sourceId = generateDeterministicUuid(normalizedKey);

      if (!sources[sourceId]) {
        sources[sourceId] = {
          id: sourceId,
          treeId,
          type,
          title: person.birthSource,
          normalizedKey,
          origin: LEGACY_DERIVED_CITATION_ORIGIN,
          createdAt,
        };
      }

      const citationKey = `${treeId}:${sourceId}:PERSON:${person.id}:person.birth.date`;
      const citationId = generateDeterministicUuid(citationKey);

      if (!citations[citationId]) {
        citations[citationId] = {
          id: citationId,
          treeId,
          sourceId,
          targetType: 'PERSON',
          targetId: person.id,
          targetField: 'person.birth.date',
          confidence: 'HIGH',
          origin: LEGACY_DERIVED_CITATION_ORIGIN,
          createdAt,
        };
      }
    }

    // 3. Convert person.deathSource
    if (person.deathSource && person.deathSource.trim()) {
      const type = 'DOCUMENT';
      const normalizedKey = getNormalizedSourceKey(treeId, type, person.deathSource);
      const sourceId = generateDeterministicUuid(normalizedKey);

      if (!sources[sourceId]) {
        sources[sourceId] = {
          id: sourceId,
          treeId,
          type,
          title: person.deathSource,
          normalizedKey,
          origin: LEGACY_DERIVED_CITATION_ORIGIN,
          createdAt,
        };
      }

      const citationKey = `${treeId}:${sourceId}:PERSON:${person.id}:person.death.date`;
      const citationId = generateDeterministicUuid(citationKey);

      if (!citations[citationId]) {
        citations[citationId] = {
          id: citationId,
          treeId,
          sourceId,
          targetType: 'PERSON',
          targetId: person.id,
          targetField: 'person.death.date',
          confidence: 'HIGH',
          origin: LEGACY_DERIVED_CITATION_ORIGIN,
          createdAt,
        };
      }
    }
  });

  return { sources, citations };
}

export function mergeDerivedSourcesAndCitations(
  currentSources: Record<string, Source>,
  currentCitations: Record<string, Citation>,
  derivedSources: Record<string, Source>,
  derivedCitations: Record<string, Citation>
): { sources: Record<string, Source>; citations: Record<string, Citation> } {
  const preservedSources = Object.fromEntries(
    Object.entries(currentSources).filter(([, source]) => !isLegacyDerivedCitationOrigin(source.origin))
  );
  const preservedCitations = Object.fromEntries(
    Object.entries(currentCitations).filter(([, citation]) => !isLegacyDerivedCitationOrigin(citation.origin))
  );

  return {
    sources: {
      ...preservedSources,
      ...derivedSources,
    },
    citations: {
      ...preservedCitations,
      ...derivedCitations,
    },
  };
}

/**
 * Reconstructs legacy person fields (sources, birthSource, deathSource) on-demand based on sources & citations.
 */
export function applyCitationsToLegacyPersonFields(
  people: Record<string, Person>,
  citations: Record<string, Citation>,
  sources: Record<string, Source>
): Record<string, Person> {
  const nextPeople = { ...people };

  Object.keys(nextPeople).forEach((personId) => {
    const person = nextPeople[personId];
    if (!person) return;

    const personCitations = Object.values(citations).filter(
      (c) => c.targetType === 'PERSON' && c.targetId === personId
    );

    const legacySourcesMap: Record<string, { id: string; title: string; url?: string; date?: string; type?: string }> = {};
    let birthSource = person.birthSource || '';
    let deathSource = person.deathSource || '';

    personCitations.forEach((cit) => {
      const src = sources[cit.sourceId];
      if (!src) return;

      // Map to legacy person.sources format
      if (cit.targetField === 'person.profile.sources') {
        legacySourcesMap[src.id] = {
          id: src.id,
          title: src.title,
          url: src.url,
          date: src.date,
          type: src.type.toLowerCase(),
        };
      } else if (cit.targetField === 'person.birth.date' || cit.targetField === 'person.birth.place') {
        birthSource = src.title;
      } else if (cit.targetField === 'person.death.date' || cit.targetField === 'person.death.place') {
        deathSource = src.title;
      }
    });

    nextPeople[personId] = {
      ...person,
      sources: Object.values(legacySourcesMap),
      birthSource,
      deathSource,
    };
  });

  return nextPeople;
}
