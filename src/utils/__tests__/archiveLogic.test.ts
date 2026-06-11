import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import type { Person, TreeSettings } from '../../types';

import { importFromJozorArchive, importJozorArchiveData } from '../archiveLogic';
import { buildBlueprintArchive } from '../../services/archiveService';

vi.mock('../../services/googleService', () => ({
  googleMediaService: {
    fetchFileAsBlob: vi.fn(),
  },
}));

const createArchiveFile = async (payload: unknown) => {
  const zip = new JSZip();
  zip.file('family_data.json', JSON.stringify(payload));
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'family.jozor', { type: 'application/zip' });
};

describe('archiveLogic', () => {
  it('imports wrapped Jozor archives exported with a people object', async () => {
    const file = await createArchiveFile({
      people: {
        person_1: {
          id: 'person_1',
          firstName: 'Root',
          lastName: 'Person',
          gender: 'male',
          parents: [],
          children: [],
          spouses: [],
        },
      },
      settings: { treeSettings: { chartType: 'focus' } },
    });

    const people = await importFromJozorArchive(file);

    expect(Object.keys(people)).toEqual(['person_1']);
    expect(people.person_1.firstName).toBe('Root');
    expect(people.person_1.lastName).toBe('Person');
  });

  it('exposes archive settings for cloud tree imports', async () => {
    const file = await createArchiveFile({
      people: {
        person_1: {
          id: 'person_1',
          firstName: 'Root',
          lastName: 'Person',
          gender: 'male',
          parents: [],
          children: [],
          spouses: [],
        },
      },
      settings: { treeSettings: { chartType: 'radial' } },
    });

    const data = await importJozorArchiveData(file);

    expect(data.people.person_1.firstName).toBe('Root');
    expect(data.settings).toEqual({ treeSettings: { chartType: 'radial' } });
  });

  it('imports current blueprint Jozor archives with tree settings', async () => {
    const { blob } = await buildBlueprintArchive({
      version: 1,
      people: {
        person_1: {
          id: 'person_1',
          firstName: 'Root',
          lastName: 'Person',
          gender: 'male',
          parents: [],
          children: [],
          spouses: [],
        } as unknown as Person,
      },
      settings: { treeSettings: { chartType: 'radial' } as unknown as TreeSettings },
      focusId: 'person_1',
      metadata: {
        lastModified: Date.parse('2026-05-25T00:00:00.000Z'),
        appName: 'Jozor',
      },
    }, {
      label: 'test-export',
      createdAt: '2026-05-25T00:00:00.000Z',
    });
    const file = new File([blob], 'family.jozor', { type: 'application/octet-stream' });

    const data = await importJozorArchiveData(file);

    expect(data.people.person_1.firstName).toBe('Root');
    expect(data.settings).toEqual({ treeSettings: { chartType: 'radial' } });
  });

  it('does not rehydrate encoded traversal media paths', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const zip = new JSZip();
    zip.file('family_data.json', JSON.stringify({
      people: {
        person_1: {
          id: 'person_1',
          firstName: 'Root',
          lastName: 'Person',
          gender: 'male',
          parents: [],
          children: [],
          spouses: [],
          photoUrl: 'images/%2e%2e/secret.png',
        },
      },
    }));
    zip.file('images/%2e%2e/secret.png', 'not-an-image');
    const blob = await zip.generateAsync({ type: 'blob' });
    const file = new File([blob], 'family.jozor', { type: 'application/zip' });

    const data = await importJozorArchiveData(file);

    expect(data.people.person_1.photoUrl).toBe('images/%2e%2e/secret.png');
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid or suspicious media path'));
    warnSpy.mockRestore();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// M17 – Behavioral concurrency and ordering tests for importJozorArchiveData
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a legacy ZIP archive where each person has a photoUrl and voiceNotes
 * stored as images/ and audio/ paths with real (minimal) embedded bytes.
 */
const buildLegacyArchiveWithMedia = async (
  personCount: number,
  voiceNotesPerPerson: number
): Promise<File> => {
  const zip = new JSZip();
  const people: Record<string, unknown> = {};

  for (let i = 0; i < personCount; i++) {
    const id = `person_${String(i).padStart(3, '0')}`;
    const photoFilename = `${id}_profile.png`;
    const voiceFiles: string[] = [];

    // Minimal PNG header bytes
    zip.file(`images/${photoFilename}`, new Uint8Array([137, 80, 78, 71]));

    for (let v = 0; v < voiceNotesPerPerson; v++) {
      const audioFilename = `${id}_voice_${v}.webm`;
      // Minimal WebM header bytes
      zip.file(`audio/${audioFilename}`, new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]));
      voiceFiles.push(`audio/${audioFilename}`);
    }

    people[id] = {
      id,
      firstName: `Person${i}`,
      lastName: 'Test',
      gender: 'male',
      parents: [],
      children: [],
      spouses: [],
      gallery: [],
      voiceNotes: voiceFiles,
      photoUrl: `images/${photoFilename}`,
    };
  }

  zip.file('family_data.json', JSON.stringify({ people }));
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'family.jozor', { type: 'application/zip' });
};

describe('importJozorArchiveData – M17 concurrency guarantees', () => {

  // ── Test 1: concurrency is bounded and parallel ────────────────────────

  it('processes media operations with maxActive > 1 and maxActive <= 8', async () => {
    const CONCURRENCY_LIMIT = 8;
    let active = 0;
    let maxActive = 0;

    // Instrument JSZip.loadAsync so every zip entry's async() call is tracked.
    // This lets us count how many reads are in-flight simultaneously.
    const originalLoadAsync = JSZip.loadAsync.bind(JSZip);
    const loadAsyncSpy = vi
      .spyOn(JSZip, 'loadAsync')
      .mockImplementation(async (...args: Parameters<typeof JSZip.loadAsync>) => {
        const zip = await originalLoadAsync(...args);

        zip.forEach((_path, entry) => {
          const originalEntryAsync = entry.async.bind(entry);
          // @ts-expect-error – patching internal method for concurrency tracking
          entry.async = async (...asyncArgs: Parameters<typeof entry.async>) => {
            active += 1;
            maxActive = Math.max(maxActive, active);
            // Yield to the microtask queue so concurrent tasks overlap
            await Promise.resolve();
            const result = await originalEntryAsync(...asyncArgs);
            active -= 1;
            return result;
          };
        });

        return zip;
      });

    // 10 people × 3 voice notes each = 40 total media operations
    const file = await buildLegacyArchiveWithMedia(10, 3);
    await importJozorArchiveData(file);

    // Must never exceed the configured limit
    expect(maxActive).toBeLessThanOrEqual(CONCURRENCY_LIMIT);
    // Must be parallel: more than 1 concurrent read proves for...of is gone
    expect(maxActive).toBeGreaterThan(1);

    loadAsyncSpy.mockRestore();
  });

  // ── Test 2: people output order matches input key order ────────────────

  it('preserves the original key order of people after parallel processing', async () => {
    const orderedKeys = ['person_charlie', 'person_alice', 'person_bravo', 'person_delta'];
    const zip = new JSZip();

    const people: Record<string, unknown> = {};
    for (const key of orderedKeys) {
      people[key] = {
        id: key,
        firstName: key,
        lastName: 'Test',
        gender: 'male',
        parents: [],
        children: [],
        spouses: [],
        gallery: [],
        voiceNotes: [],
      };
    }

    zip.file('family_data.json', JSON.stringify({ people }));
    const blob = await zip.generateAsync({ type: 'blob' });
    const file = new File([blob], 'family.jozor', { type: 'application/zip' });

    const data = await importJozorArchiveData(file);

    // All people must be present and correctly mapped
    expect(Object.keys(data.people)).toHaveLength(orderedKeys.length);
    for (const key of orderedKeys) {
      expect(data.people).toHaveProperty(key);
      expect(data.people[key].firstName).toBe(key);
    }
  });
});
