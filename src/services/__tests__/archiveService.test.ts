import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';

import { createPersonMediaAssetRef, type Person, type TreeSettings } from '../../types';
import { buildBlueprintArchive } from '../archiveService';

// ────────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ────────────────────────────────────────────────────────────────────────────

const makeMinimalPerson = (id: string, overrides: Partial<Person> = {}): Person =>
  ({
    id,
    firstName: 'Test',
    lastName: 'Person',
    gender: 'male' as const,
    parents: [],
    children: [],
    spouses: [],
    gallery: [],
    voiceNotes: [],
    ...overrides,
  } as unknown as Person);

const makeSnapshot = (people: Record<string, Person>) => ({
  version: 1 as const,
  people,
  settings: { treeSettings: { chartType: 'focus' } as unknown as TreeSettings },
  focusId: Object.keys(people)[0] ?? null,
  metadata: { lastModified: Date.parse('2026-01-01T00:00:00.000Z'), appName: 'Jozor' },
  locations: {},
});

const readBlobAsArrayBuffer = (blob: Blob): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Unable to read archive blob'));
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.readAsArrayBuffer(blob);
  });

// ────────────────────────────────────────────────────────────────────────────
// Test suite: M15 – archive export safety
// ────────────────────────────────────────────────────────────────────────────

describe('buildBlueprintArchive – M15 safety guarantees', () => {
  // ── Test 1: Media integrity ─────────────────────────────────────────────

  it('rejects the archive when any referenced image cannot be fetched', async () => {
    const mediaFetcher = vi.fn(async (url: string): Promise<Blob> => {
      if (url.includes('bad-url')) {
        throw new Error('Simulated network failure');
      }
      return new Blob(['fake-image-data'], { type: 'image/png' });
    });

    const people = {
      person_good: makeMinimalPerson('person_good', {
        photoUrl: 'https://example.com/good-url.png',
      }),
      person_bad: makeMinimalPerson('person_bad', {
        photoUrl: 'https://example.com/bad-url.png',
      }),
    };

    await expect(
      buildBlueprintArchive(makeSnapshot(people), {
        label: 'media-integrity-test',
        mediaFetcher,
      })
    ).rejects.toThrow('Simulated network failure');
  });

  // ── Test 2: Gallery item with empty source is skipped without error ──────

  it('skips gallery items with no resolvable URL without failing the archive', async () => {
    const mediaFetcher = vi.fn(async (): Promise<Blob> => {
      return new Blob(['img'], { type: 'image/png' });
    });

    // Person with one gallery item that has an empty/null source
    const people = {
      person_1: makeMinimalPerson('person_1', {
        // gallery item with no meaningful URL – getGalleryImageUrl returns '' or null
        gallery: [{ id: 'item_empty', url: '' } as unknown as Person['gallery'][0]],
      }),
    };

    const { blob } = await buildBlueprintArchive(makeSnapshot(people), {
      label: 'empty-gallery-test',
      mediaFetcher,
    });

    // Archive should succeed
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);

    // mediaFetcher should NOT have been called for the empty-URL item
    expect(mediaFetcher).not.toHaveBeenCalled();
  });

  // ── Test 3: Concurrency Limit ────────────────────────────────────────────

  it('never exceeds 5 concurrent fetches even with 20+ images', async () => {
    const CONCURRENCY_LIMIT = 5;
    let activeFetches = 0;
    let maxActiveFetches = 0;

    // mediaFetcher that tracks concurrent calls via a small async delay
    const mediaFetcher = vi.fn(async (): Promise<Blob> => {
      activeFetches += 1;
      maxActiveFetches = Math.max(maxActiveFetches, activeFetches);

      // Yield to the microtask queue so concurrent tasks actually overlap
      await new Promise((resolve) => setTimeout(resolve, 10));

      activeFetches -= 1;
      return new Blob(['img'], { type: 'image/png' });
    });

    // Build a tree with 10 people, each having 2 gallery photos → 20 media files total
    const people: Record<string, Person> = {};
    for (let i = 0; i < 10; i++) {
      const id = `person_${i}`;
      people[id] = makeMinimalPerson(id, {
        photoUrl: `https://example.com/avatar-${i}.png`,
        gallery: [
          { id: `g${i}_a`, url: `https://example.com/gallery-${i}-a.png` } as unknown as Person['gallery'][0],
        ],
      });
    }

    await buildBlueprintArchive(makeSnapshot(people), {
      label: 'concurrency-test',
      mediaFetcher,
    });

    // Critical assertion: never more than 5 concurrent fetches
    expect(maxActiveFetches).toBeGreaterThan(0);
    expect(maxActiveFetches).toBeLessThanOrEqual(CONCURRENCY_LIMIT);
  });

  it('embeds canonical private profile and gallery assets without serializing storage references', async () => {
    const profileAsset = createPersonMediaAssetRef({
      treeId: 'tree-1',
      assetId: '123e4567-e89b-42d3-a456-426614174000',
      kind: 'profile-photo',
      mimeType: 'image/webp',
      byteLength: 8,
      createdAt: '2026-09-05T00:00:00.000Z',
    });
    const galleryAsset = createPersonMediaAssetRef({
      treeId: 'tree-1',
      assetId: '223e4567-e89b-42d3-a456-426614174000',
      kind: 'gallery-photo',
      mimeType: 'image/webp',
      byteLength: 8,
      createdAt: '2026-09-05T00:00:00.000Z',
    });
    const personMediaFetcher = vi.fn(async () => new Blob(['RIFFdata'], { type: 'image/webp' }));
    const person = makeMinimalPerson('person-1', {
      photoAsset: profileAsset,
      photoPath: 'tree-1/person-1.webp',
      photoVersion: 8,
      gallery: [{
        id: galleryAsset.assetId,
        asset: galleryAsset,
        version: 1,
        createdAt: galleryAsset.createdAt,
      }],
    });

    const { blob, manifest } = await buildBlueprintArchive(makeSnapshot({ 'person-1': person }), {
      label: 'private-media-test',
      personMediaFetcher,
    });

    expect(personMediaFetcher).toHaveBeenCalledTimes(2);
    expect(personMediaFetcher).toHaveBeenCalledWith(profileAsset, 'person-1');
    expect(personMediaFetcher).toHaveBeenCalledWith(galleryAsset, 'person-1');
    expect(manifest.media.avatars['person-1']).toMatch(/^media\/avatars\/person-1\.webp$/);
    expect(manifest.media.gallery['person-1']).toEqual(['media/gallery/person-1-1.webp']);
    expect(JSON.stringify(manifest)).not.toContain(profileAsset.objectPath);
    expect(JSON.stringify(manifest)).not.toContain(galleryAsset.objectPath);

    const zip = await JSZip.loadAsync(await readBlobAsArrayBuffer(blob));
    const treeJson = await zip.file('tree.json')!.async('string');
    expect(treeJson).not.toContain(profileAsset.objectPath);
    expect(treeJson).not.toContain('tree-1/person-1.webp');
    expect(treeJson).not.toContain('photoVersion');
  });
});
