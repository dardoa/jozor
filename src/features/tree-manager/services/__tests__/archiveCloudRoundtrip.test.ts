import JSZip from 'jszip';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DEFAULT_TREE_SETTINGS } from '../../../../constants';
import { buildBlueprintArchive } from '../../../../services/archiveService';
import { buildTreeFetchResult } from '../../../../services/supabaseTreeMapper';
import { createPersonMediaAssetRef, type FullState, type Person, type PersonMediaAssetRef } from '../../../../types';
import { validatePerson } from '../../../../utils/familyLogic';
import { importTreeFromFileItem } from '../importTreeService';

const cloud = vi.hoisted(() => ({
  treeId: 'roundtrip-destination-1',
  insert: vi.fn(), update: vi.fn(), rpc: vi.fn(), upload: vi.fn(), cleanup: vi.fn(),
}));

// Only external persistence/delivery is replaced. Archive, import, and row mappers are real.
vi.mock('../../../../services/supabaseTreeClient', () => ({
  getTreeClient: () => ({
    from: (table: string) => {
      if (table !== 'trees') throw new Error('Unexpected cloud table');
      return { insert: cloud.insert, update: cloud.update };
    },
    rpc: cloud.rpc,
  }),
}));
vi.mock('../../../../services/supabaseStorageService', () => ({
  SupabaseStorageService: { uploadPersonMediaBlob: cloud.upload },
}));
vi.mock('../../../../services/archiveImportCleanupQueue', () => ({ enqueueArchiveImportCleanup: cloud.cleanup }));
vi.mock('../../../../features/activity-log/service', () => ({ activityService: { logAction: vi.fn() } }));
vi.mock('../../../../utils/errorLogger', () => ({ logError: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn() }));
vi.mock('../../../../utils/showToast', () => ({ showToast: { warning: vi.fn() } }));

const DATE = '2026-09-07T00:00:00.000Z';
const PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jkFoAAAAASUVORK5CYII='), (char) => char.charCodeAt(0));
const GALLERY_PNG = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='), (char) => char.charCodeAt(0));
const image = (kind: PersonMediaAssetRef['kind'] = 'profile-photo') =>
  new Blob([kind === 'gallery-photo' ? GALLERY_PNG : PNG], { type: 'image/png' });
const readBytes = (blob: Blob): Promise<ArrayBuffer> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(reader.error);
  reader.onload = () => resolve(reader.result as ArrayBuffer);
  reader.readAsArrayBuffer(blob);
});

const sourceAsset = (kind: PersonMediaAssetRef['kind']) => createPersonMediaAssetRef({
  treeId: 'roundtrip-source', assetId: crypto.randomUUID(), kind,
  mimeType: 'image/png', byteLength: PNG.length, createdAt: DATE,
});

const makeSource = (): FullState => {
  const married = { type: 'married', startDate: '2000-02-03', startPlace: 'دمشق' } as const;
  const divorced = { type: 'divorced', startDate: '1990-01-01', endDate: '1995-01-01', endPlace: 'حلب' } as const;
  const galleryAsset = sourceAsset('gallery-photo');
  return {
    version: 1, focusId: 'source-child',
    settings: { language: 'ar', treeSettings: { ...DEFAULT_TREE_SETTINGS,
      ownerPersonId: 'source-father', highlightedBranchRootId: 'source-child', highlightBranch: true } },
    people: {
      'source-father': validatePerson({ id: 'source-father', firstName: 'سامي', lastName: 'الاختبار',
        spouses: ['source-mother', 'source-former'], children: ['source-child'],
        partnerDetails: { 'source-mother': married, 'source-former': divorced }, photoAsset: sourceAsset('profile-photo'),
        sources: [{ id: 'record-source', title: 'وثيقة العائلة', url: 'https://example.test/record' }],
        events: [{ id: 'memory', title: 'لقاء العائلة', date: '2020-06-01', place: 'دمشق' }],
      }),
      'source-mother': validatePerson({ id: 'source-mother', firstName: 'ليلى', gender: 'female',
        spouses: ['source-father'], children: ['source-child'], partnerDetails: { 'source-father': married }, isPrivate: true }),
      'source-former': validatePerson({ id: 'source-former', firstName: 'نور', gender: 'female',
        spouses: ['source-father'], partnerDetails: { 'source-father': divorced } }),
      'source-child': validatePerson({ id: 'source-child', firstName: 'مريم', gender: 'female',
        parents: ['source-father', 'source-mother'], isDeceased: true,
        gallery: [{ id: galleryAsset.assetId, asset: galleryAsset, version: 1, createdAt: '2020-06-01T00:00:00.000Z', caption: 'صورة من لقاء العائلة' }] }),
    },
  };
};

type ImportPayload = {
  p_tree_id: string;
  p_people: Array<{ id: string; firstName: string; lastName: string; gender: string; customFields: Record<string, unknown> }>;
  p_relationships: Array<{ person_id: string; relative_id: string; type: 'parent' | 'child' | 'spouse' }>;
};

describe('real archive to new cloud tree roundtrip', () => {
  const uploaded = new Map<string, Blob>();

  beforeEach(() => {
    vi.clearAllMocks();
    uploaded.clear();
    vi.stubGlobal('fetch', vi.fn(() => { throw new Error('Unexpected network access'); }));
    cloud.insert.mockImplementation(() => ({ select: () => ({ single: async () => ({ data: { id: cloud.treeId }, error: null }) }) }));
    cloud.update.mockImplementation(() => ({ eq: async () => ({ error: null }) }));
    cloud.rpc.mockResolvedValue({ error: null });
    cloud.upload.mockImplementation(async (input: { treeId: string; blob: Blob; kind: PersonMediaAssetRef['kind'] }) => {
      const asset = createPersonMediaAssetRef({ treeId: input.treeId, assetId: crypto.randomUUID(), kind: input.kind,
        mimeType: 'image/png', byteLength: input.blob.size, createdAt: DATE });
      uploaded.set(asset.assetId, input.blob);
      return asset;
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('preserves Arabic people, relationships, marriage details, settings, focus and exact image bytes in independent imports', async () => {
    const source = makeSource();
    const original = JSON.stringify(source);
    const { blob, manifest } = await buildBlueprintArchive(source, {
      label: 'نسخة العائلة', createdAt: DATE, personMediaFetcher: async (asset) => image(asset.kind),
    });
    const file = new File([blob], 'family-roundtrip.jozor', { type: 'application/zip' });
    expect(manifest.metadata).toMatchObject({ personCount: 4, photoCount: 2 });
    const archive = await JSZip.loadAsync(file);
    const originalTreeJson = await archive.file('tree.json')!.async('string');
    expect(originalTreeJson).not.toMatch(/roundtrip-source|objectPath|supabase-private|blob:/);
    const allDestinationIds = new Set<string>();

    for (const copy of [1, 2]) {
      cloud.treeId = `roundtrip-destination-${copy}`;
      cloud.rpc.mockClear(); cloud.update.mockClear(); cloud.insert.mockClear(); cloud.upload.mockClear();
      await expect(importTreeFromFileItem('test-owner', 'owner@example.test', file, 'test-token')).resolves.toBe(cloud.treeId);
      expect(cloud.rpc).toHaveBeenCalledOnce();
      const [rpcName, payload] = cloud.rpc.mock.calls[0] as [string, ImportPayload];
      expect(rpcName).toBe('import_tree_content');
      expect(payload.p_tree_id).toBe(cloud.treeId);
      expect(payload.p_people).toHaveLength(4);
      expect(payload.p_relationships).toHaveLength(4);
      expect(JSON.stringify(payload)).not.toMatch(/source-(father|mother|former|child)|roundtrip-source|blob:|test-token/);
      for (const row of payload.p_people) {
        expect(allDestinationIds.has(row.id)).toBe(false);
        allDestinationIds.add(row.id);
      }

      // Model only the RPC's column shape; actual database/RLS behavior has a separate hosted gate.
      const restored = buildTreeFetchResult({
        owner_id: 'test-owner', focus_id: cloud.update.mock.calls[0][0].focus_id,
        settings: cloud.insert.mock.calls[0][0].settings,
      }, payload.p_people.map((row) => ({
        id: row.id, first_name: row.firstName, last_name: row.lastName, gender: row.gender, custom_fields: row.customFields,
      })), payload.p_relationships, null);
      const byName = (name: string): Person => {
        const person = Object.values(restored.people).find((item) => item.firstName === name);
        expect(person).toBeDefined();
        return person!;
      };
      const father = byName('سامي'), mother = byName('ليلى'), former = byName('نور'), child = byName('مريم');
      expect(father.spouses.sort()).toEqual([mother.id, former.id].sort());
      expect(child.parents.sort()).toEqual([father.id, mother.id].sort());
      expect(father.partnerDetails).toEqual({ [mother.id]: source.people['source-father'].partnerDetails!['source-mother'],
        [former.id]: source.people['source-father'].partnerDetails!['source-former'] });
      expect(mother.partnerDetails).toEqual({ [father.id]: father.partnerDetails![mother.id] });
      expect(former.partnerDetails).toEqual({ [father.id]: father.partnerDetails![former.id] });
      expect(father.sources).toEqual(source.people['source-father'].sources);
      expect(father.events).toEqual(source.people['source-father'].events);
      expect(mother.isPrivate).toBe(true);
      expect(child.isDeceased).toBe(true);
      expect(restored.focusId).toBe(child.id);
      expect(restored.settings).toEqual({ ...source.settings,
        treeSettings: { ...source.settings.treeSettings, ownerPersonId: father.id, highlightedBranchRootId: child.id } });
      expect(cloud.upload).toHaveBeenCalledTimes(2);
      for (const [request] of cloud.upload.mock.calls) {
        expect(request.treeId).toBe(cloud.treeId);
        expect(restored.people[request.personId]).toBeDefined();
        expect(new Uint8Array(await readBytes(request.blob))).toEqual(request.kind === 'gallery-photo' ? GALLERY_PNG : PNG);
      }
      expect(child.gallery[0]).toMatchObject({ caption: 'صورة من لقاء العائلة', createdAt: '2020-06-01T00:00:00.000Z' });

      const reexport = await buildBlueprintArchive({ version: 1, ...restored }, {
        label: 'نسخة مستعادة', createdAt: DATE,
        personMediaFetcher: async (asset) => {
          expect(asset.objectPath.startsWith(`${cloud.treeId}/`)).toBe(true);
          const bytes = uploaded.get(asset.assetId);
          expect(bytes).toBeDefined();
          return bytes!;
        },
      });
      const zip = await JSZip.loadAsync(reexport.blob);
      const paths = [...Object.values(reexport.manifest.media.avatars), ...Object.values(reexport.manifest.media.gallery).flat()];
      expect(paths).toHaveLength(2);
      for (const path of paths) expect(await zip.file(path)!.async('uint8array')).toEqual(path.startsWith('media/gallery/') ? GALLERY_PNG : PNG);
      expect(await zip.file('tree.json')!.async('string')).not.toMatch(/roundtrip-destination|objectPath|supabase-private|blob:/);
      expect(cloud.cleanup).not.toHaveBeenCalled();
      expect(JSON.stringify(source)).toBe(original);
    }
  });

  it('rejects a real archive with a missing image before any cloud allocation', async () => {
    const { blob, manifest } = await buildBlueprintArchive(makeSource(), {
      label: 'missing-image', createdAt: DATE, personMediaFetcher: async () => image(),
    });
    const zip = await JSZip.loadAsync(blob);
    zip.remove(Object.values(manifest.media.avatars)[0]);
    const file = new File([await zip.generateAsync({ type: 'blob' })], 'broken.jozor');
    await expect(importTreeFromFileItem('test-owner', 'owner@example.test', file)).rejects.toThrow('media is incomplete');
    expect(cloud.insert).not.toHaveBeenCalled();
    expect(cloud.upload).not.toHaveBeenCalled();
    expect(cloud.rpc).not.toHaveBeenCalled();
  });
});
