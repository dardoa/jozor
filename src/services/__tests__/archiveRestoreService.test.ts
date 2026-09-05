import JSZip from 'jszip';
import { describe, expect, it, vi } from 'vitest';
import { createPersonMediaAssetRef, type Person } from '../../types';
import { buildBlueprintArchive } from '../archiveService';
import {
  extractBlueprintArchiveForCloudImport,
  restoreBlueprintArchive,
} from '../archiveRestoreService';

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const person = (overrides: Partial<Person> = {}): Person => ({
  id: 'person-1', firstName: 'Archive', lastName: 'Person', gender: 'female',
  parents: [], children: [], spouses: [], gallery: [], voiceNotes: [],
  ...overrides,
} as Person);

describe('blueprint archive media restore', () => {
  it('extracts validated blobs for cloud import without temporary or provider references', async () => {
    const profileAsset = createPersonMediaAssetRef({
      treeId: 'tree-1', assetId: '123e4567-e89b-42d3-a456-426614174000',
      kind: 'profile-photo', mimeType: 'image/png', byteLength: PNG_BYTES.byteLength,
      createdAt: '2026-09-05T00:00:00.000Z',
    });
    const galleryAsset = createPersonMediaAssetRef({
      treeId: 'tree-1', assetId: '223e4567-e89b-42d3-a456-426614174000',
      kind: 'gallery-photo', mimeType: 'image/png', byteLength: PNG_BYTES.byteLength,
      createdAt: '2026-09-05T00:00:00.000Z',
    });
    const sourcePerson = person({
      photoAsset: profileAsset,
      photoUrl: 'https://storage.example.test/public-leak.png',
      gallery: [{ id: galleryAsset.assetId, asset: galleryAsset, version: 1, createdAt: galleryAsset.createdAt }],
      voiceNotes: ['https://drive.example.test/private-audio'],
    });
    const { blob } = await buildBlueprintArchive({
      version: 1,
      people: { 'person-1': sourcePerson },
      settings: { treeSettings: { chartType: 'radial' } } as never,
    }, {
      label: 'private-media',
      createdAt: '2026-09-05T00:00:00.000Z',
      personMediaFetcher: async () => new Blob([PNG_BYTES], { type: 'image/png' }),
    });

    const result = await extractBlueprintArchiveForCloudImport(blob);

    expect(result.warnings).toEqual([]);
    expect(result.mediaComplete).toBe(true);
    expect(result.settings).toEqual({ treeSettings: { chartType: 'radial' } });
    expect(result.people['person-1']).toMatchObject({ gallery: [], voiceNotes: [] });
    expect(result.people['person-1']).not.toHaveProperty('photoUrl');
    expect(result.people['person-1']).not.toHaveProperty('photoAsset');
    expect(result.mediaByPersonId['person-1'].avatar).toMatchObject({ type: 'image/png', size: 8 });
    expect(result.mediaByPersonId['person-1'].gallery).toHaveLength(1);
    expect(JSON.stringify(result.people)).not.toContain('storage.example');
    expect(JSON.stringify(result.people)).not.toContain('objectPath');
  });

  it('uses validated image blobs for local object URLs and revokes them', async () => {
    const zip = new JSZip();
    zip.file('tree.json', JSON.stringify({ version: 1, people: { 'person-1': person() } }));
    zip.file('manifest.json', JSON.stringify({
      version: 2, treeFile: 'tree.json',
      metadata: { createdAt: '2026-09-05T00:00:00Z', label: 'test', appVersion: '2', personCount: 1, photoCount: 1 },
      media: { avatars: { 'person-1': 'media/avatars/person-1.png' }, gallery: {} },
    }));
    zip.file('media/avatars/person-1.png', PNG_BYTES);
    const blob = await zip.generateAsync({ type: 'blob' });
    const objectUrlFactory = vi.fn(() => 'blob:validated-image');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);

    const result = await restoreBlueprintArchive(blob, { objectUrlFactory });

    expect(result.state.people['person-1'].photoUrl).toBe('blob:validated-image');
    expect(objectUrlFactory).toHaveBeenCalledWith(expect.objectContaining({ type: 'image/png', size: 8 }));
    result.revokeObjectUrls();
    expect(revokeSpy).toHaveBeenCalledWith('blob:validated-image');
    revokeSpy.mockRestore();
  });

  it.each([
    ['unsupported content', 'media/avatars/person-1.png'],
    ['encoded traversal', 'media/avatars/%2e%2e/private.png'],
  ])('skips %s without creating a cloud-import blob', async (_label, avatarPath) => {
    const zip = new JSZip();
    zip.file('tree.json', JSON.stringify({ version: 1, people: { 'person-1': person() } }));
    zip.file('manifest.json', JSON.stringify({
      version: 2, treeFile: 'tree.json',
      metadata: { createdAt: '2026-09-05T00:00:00Z', label: 'test', appVersion: '2', personCount: 1, photoCount: 1 },
      media: { avatars: { 'person-1': avatarPath }, gallery: {} },
    }));
    zip.file(avatarPath, new Uint8Array([1, 2, 3, 4]));
    const archive = await zip.generateAsync({ type: 'blob' });

    const result = await extractBlueprintArchiveForCloudImport(archive);

    expect(result.mediaByPersonId).toEqual({});
    expect(result.mediaComplete).toBe(false);
    expect(result.warnings).toHaveLength(1);
  });

  it('marks manifest media for unknown people and count mismatches as incomplete', async () => {
    const zip = new JSZip();
    zip.file('tree.json', JSON.stringify({ version: 1, people: { 'person-1': person() } }));
    zip.file('manifest.json', JSON.stringify({
      version: 2, treeFile: 'tree.json',
      metadata: {
        createdAt: '2026-09-05T00:00:00Z', label: 'test', appVersion: '2',
        personCount: 1, photoCount: 3,
      },
      media: { avatars: { 'unknown-person': 'media/avatars/unknown.png' }, gallery: {} },
    }));
    zip.file('media/avatars/unknown.png', PNG_BYTES);

    const result = await extractBlueprintArchiveForCloudImport(
      await zip.generateAsync({ type: 'blob' })
    );

    expect(result.mediaComplete).toBe(false);
    expect(result.mediaByPersonId).toEqual({});
    expect(result.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('unknown person'),
      expect.stringContaining('count does not match'),
    ]));
  });

  it('rejects malformed manifest media structures and mismatched person identities', async () => {
    const malformedManifestZip = new JSZip();
    malformedManifestZip.file('tree.json', JSON.stringify({
      version: 1, people: { 'person-1': person() },
    }));
    malformedManifestZip.file('manifest.json', JSON.stringify({
      version: 2, treeFile: 'tree.json',
      metadata: {
        createdAt: '2026-09-05T00:00:00Z', label: 'test', appVersion: '2',
        personCount: 1, photoCount: 0,
      },
      media: { avatars: {}, gallery: { 'person-1': 'not-an-array' } },
    }));
    await expect(extractBlueprintArchiveForCloudImport(
      await malformedManifestZip.generateAsync({ type: 'blob' })
    )).rejects.toThrow('manifest.json is malformed');

    const mismatchedIdentityZip = new JSZip();
    mismatchedIdentityZip.file('tree.json', JSON.stringify({
      version: 1, people: { 'different-key': person() },
    }));
    mismatchedIdentityZip.file('manifest.json', JSON.stringify({
      version: 2, treeFile: 'tree.json',
      metadata: {
        createdAt: '2026-09-05T00:00:00Z', label: 'test', appVersion: '2',
        personCount: 1, photoCount: 0,
      },
      media: { avatars: {}, gallery: {} },
    }));
    await expect(extractBlueprintArchiveForCloudImport(
      await mismatchedIdentityZip.generateAsync({ type: 'blob' })
    )).rejects.toThrow('person identity does not match');
  });
});
