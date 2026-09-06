import { describe, expect, it, vi } from 'vitest';
import { createPersonMediaAssetRef, type PersonMediaAssetRef } from '../../types';
import {
  buildMigratedGalleryItem,
  migrateLegacyPersonMediaPlan,
  planLegacyPersonMediaMigration,
  resolveLegacyAvatarObjectPath,
  type LegacyPersonMediaMigrationAdapter,
  type LegacyPersonMediaRow,
  type LegacyPersonMediaTask,
} from '../privatePersonMediaLegacyMigration';

const TREE_ID = '11111111-1111-4111-8111-111111111111';
const SUPABASE_URL = 'https://project.supabase.co';
const WEBP_BYTES = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);

const makeRow = (overrides: Partial<LegacyPersonMediaRow> = {}): LegacyPersonMediaRow => ({
  id: 'person-1',
  tree_id: TREE_ID,
  photo_url: null,
  photo_path: null,
  photo_version: 0,
  custom_fields: {},
  ...overrides,
});

const makeAsset = (
  kind: PersonMediaAssetRef['kind'],
  assetId = '22222222-2222-4222-8222-222222222222'
) => createPersonMediaAssetRef({
  treeId: TREE_ID,
  assetId,
  kind,
  mimeType: 'image/webp',
  byteLength: WEBP_BYTES.byteLength,
  version: 2,
  createdAt: '2026-09-05T12:00:00.000Z',
});

const createAdapter = (overrides: Partial<LegacyPersonMediaMigrationAdapter> = {}) => ({
  downloadLegacyObject: vi.fn(async () => new Blob([WEBP_BYTES], { type: 'image/webp' })),
  uploadPrivateObject: vi.fn(async () => undefined),
  downloadPrivateObject: vi.fn(async () => new Blob([WEBP_BYTES], { type: 'image/webp' })),
  attachPrivateAsset: vi.fn(async () => true),
  removePrivateObject: vi.fn(async () => undefined),
  removeLegacyObject: vi.fn(async () => undefined),
  finalizeLegacyReference: vi.fn(async () => true),
  ...overrides,
}) satisfies LegacyPersonMediaMigrationAdapter;

describe('private person media legacy migration', () => {
  it('normalizes only same-project, same-tree public avatar objects', () => {
    const path = `${TREE_ID}/person-1.webp`;
    expect(resolveLegacyAvatarObjectPath(path, TREE_ID, SUPABASE_URL)).toBe(path);
    expect(resolveLegacyAvatarObjectPath(`avatars/${path}`, TREE_ID, SUPABASE_URL)).toBe(path);
    expect(resolveLegacyAvatarObjectPath(
      `${SUPABASE_URL}/storage/v1/object/public/avatars/${path}?v=4`,
      TREE_ID,
      SUPABASE_URL
    )).toBe(path);
  });

  it.each([
    ['external URL', 'https://attacker.example/photo.webp'],
    ['wrong tree', '22222222-2222-4222-8222-222222222222/person.webp'],
    ['user avatar', 'users/user-1/profile.webp'],
    ['path traversal', `${TREE_ID}/%2e%2e/private.webp`],
    ['signed path', `${SUPABASE_URL}/storage/v1/object/sign/avatars/${TREE_ID}/person.webp`],
  ])('rejects %s', (_label, value) => {
    expect(resolveLegacyAvatarObjectPath(value, TREE_ID, SUPABASE_URL)).toBeNull();
  });

  it('plans profile and gallery migration while leaving external gallery URLs untouched', () => {
    const row = makeRow({
      photo_path: `${TREE_ID}/person-1.webp`,
      photo_version: 4,
      custom_fields: {
        gallery: [
          `${TREE_ID}/person-1/gallery-1.webp`,
          { id: 'gallery-2', path: `avatars/${TREE_ID}/person-1/gallery-2.webp`, version: 3 },
          'https://images.example.test/external.webp',
        ],
      },
    });

    const plan = planLegacyPersonMediaMigration(row, SUPABASE_URL);

    expect(plan.tasks).toHaveLength(3);
    expect(plan.tasks.map((task) => task.kind)).toEqual([
      'profile-photo', 'gallery-photo', 'gallery-photo',
    ]);
    expect(plan.tasks[0].currentVersion).toBe(4);
    expect(plan.externalCount).toBe(1);
    expect(plan.blockedCount).toBe(0);
  });

  it('blocks malformed typed references instead of overwriting them', () => {
    const row = makeRow({
      photo_path: `${TREE_ID}/person-1.webp`,
      custom_fields: {
        photoAsset: { provider: 'supabase-private', objectPath: 'malformed' },
        gallery: [{ path: `${TREE_ID}/gallery.webp`, asset: { kind: 'gallery-photo' } }],
      },
    });

    const plan = planLegacyPersonMediaMigration(row, SUPABASE_URL);

    expect(plan.tasks).toEqual([]);
    expect(plan.blockedCount).toBe(2);
  });

  it('preserves legacy source metadata until storage cleanup can finish', () => {
    const asset = makeAsset('gallery-photo');
    expect(buildMigratedGalleryItem(`${TREE_ID}/gallery.webp`, asset)).toMatchObject({
      path: `${TREE_ID}/gallery.webp`,
      asset,
      version: 2,
    });
    expect(buildMigratedGalleryItem({
      id: 'legacy-id',
      url: `${SUPABASE_URL}/storage/v1/object/public/avatars/${TREE_ID}/gallery.webp`,
      caption: 'Family gathering',
      version: 5,
      createdAt: '2020-01-01T00:00:00.000Z',
    }, asset)).toMatchObject({
      id: 'legacy-id',
      caption: 'Family gathering',
      asset,
      version: 5,
      createdAt: '2020-01-01T00:00:00.000Z',
    });
  });

  it('downloads a shared legacy object once and removes it only after every attachment succeeds', async () => {
    const sharedPath = `${TREE_ID}/person-1/shared.webp`;
    const plan = planLegacyPersonMediaMigration(makeRow({
      custom_fields: { gallery: [sharedPath, sharedPath] },
    }), SUPABASE_URL);
    const adapter = createAdapter();
    const assetIds = [
      '33333333-3333-4333-8333-333333333333',
      '44444444-4444-4444-8444-444444444444',
    ];

    const result = await migrateLegacyPersonMediaPlan(plan, adapter, {
      createAssetId: () => assetIds.shift()!,
      now: () => '2026-09-05T12:00:00.000Z',
    });

    expect(result).toEqual({ migratedCount: 2, cleanedCount: 2, failedCount: 0 });
    expect(adapter.downloadLegacyObject).toHaveBeenCalledTimes(1);
    expect(adapter.uploadPrivateObject).toHaveBeenCalledTimes(2);
    expect(adapter.downloadPrivateObject).toHaveBeenCalledTimes(2);
    expect(adapter.removeLegacyObject).toHaveBeenCalledTimes(1);
    expect(adapter.finalizeLegacyReference).toHaveBeenCalledTimes(2);
  });

  it('resumes cleanup for an already attached private asset without copying bytes again', async () => {
    const asset = makeAsset('profile-photo');
    const plan = planLegacyPersonMediaMigration(makeRow({
      photo_path: `${TREE_ID}/person-1.webp`,
      custom_fields: { photoAsset: asset },
    }), SUPABASE_URL);
    const adapter = createAdapter();

    const result = await migrateLegacyPersonMediaPlan(plan, adapter);

    expect(result).toEqual({ migratedCount: 0, cleanedCount: 1, failedCount: 0 });
    expect(adapter.downloadLegacyObject).toHaveBeenCalledTimes(1);
    expect(adapter.uploadPrivateObject).not.toHaveBeenCalled();
    expect(adapter.downloadPrivateObject).toHaveBeenCalledWith(asset);
    expect(adapter.removeLegacyObject).toHaveBeenCalledWith(`${TREE_ID}/person-1.webp`);
  });

  it('compensates a private upload and retains the public source when compare-and-set loses', async () => {
    const plan = planLegacyPersonMediaMigration(makeRow({
      photo_path: `${TREE_ID}/person-1.webp`,
    }), SUPABASE_URL);
    const adapter = createAdapter({ attachPrivateAsset: vi.fn(async () => false) });

    const result = await migrateLegacyPersonMediaPlan(plan, adapter, {
      createAssetId: () => '55555555-5555-4555-8555-555555555555',
    });

    expect(result).toEqual({ migratedCount: 0, cleanedCount: 0, failedCount: 1 });
    expect(adapter.removePrivateObject).toHaveBeenCalledTimes(1);
    expect(adapter.removeLegacyObject).not.toHaveBeenCalled();
  });

  it('never compensates an attachment whose response may have been lost after commit', async () => {
    const plan = planLegacyPersonMediaMigration(makeRow({ photo_path: `${TREE_ID}/person.webp` }), SUPABASE_URL);
    let committedAsset: PersonMediaAssetRef | undefined;
    const adapter = createAdapter({ attachPrivateAsset: vi.fn(async (_task, asset) => {
      committedAsset = asset;
      throw new Error('Response lost after database commit');
    }) });
    const result = await migrateLegacyPersonMediaPlan(plan, adapter);
    expect(committedAsset).toBeDefined();
    expect(result.failedCount).toBe(1);
    expect(adapter.removePrivateObject).not.toHaveBeenCalled();
    expect(adapter.removeLegacyObject).not.toHaveBeenCalled();
  });

  it('verifies exact copied bytes, not just a matching MIME type and byte length', async () => {
    const changed = WEBP_BYTES.slice();
    changed[4] = 1;
    const adapter = createAdapter({ downloadPrivateObject: vi.fn(async () => new Blob([changed], { type: 'image/webp' })) });
    const plan = planLegacyPersonMediaMigration(makeRow({ photo_path: `${TREE_ID}/person.webp` }), SUPABASE_URL);
    expect((await migrateLegacyPersonMediaPlan(plan, adapter)).failedCount).toBe(1);
    expect(adapter.attachPrivateAsset).not.toHaveBeenCalled();
    expect(adapter.removePrivateObject).toHaveBeenCalledTimes(1);
  });

  it('finalizes and queues the source before attempting Storage cleanup', async () => {
    const order: string[] = [];
    const adapter = createAdapter({
      finalizeLegacyReference: vi.fn(async () => { order.push('finalize'); return true; }),
      removeLegacyObject: vi.fn(async () => { order.push('cleanup'); throw new Error('offline'); }),
    });
    const plan = planLegacyPersonMediaMigration(makeRow({ photo_path: `${TREE_ID}/person.webp` }), SUPABASE_URL);
    const result = await migrateLegacyPersonMediaPlan(plan, adapter);
    expect(order).toEqual(['finalize', 'cleanup']);
    expect(result).toEqual({ migratedCount: 1, cleanedCount: 1, failedCount: 1 });
    expect(adapter.removePrivateObject).not.toHaveBeenCalled();
  });

  it('rejects invalid legacy bytes before upload or row mutation', async () => {
    const plan = planLegacyPersonMediaMigration(makeRow({
      photo_path: `${TREE_ID}/person-1.webp`,
    }), SUPABASE_URL);
    const adapter = createAdapter({
      downloadLegacyObject: vi.fn(async () => new Blob(['not-an-image'], { type: 'image/webp' })),
    });

    const result = await migrateLegacyPersonMediaPlan(plan, adapter);

    expect(result.failedCount).toBe(1);
    expect(adapter.uploadPrivateObject).not.toHaveBeenCalled();
    expect(adapter.attachPrivateAsset).not.toHaveBeenCalled();
    expect(adapter.removeLegacyObject).not.toHaveBeenCalled();
  });

  it('retains the public source when the private copy cannot be read back and verified', async () => {
    const asset = makeAsset('profile-photo');
    const plan = planLegacyPersonMediaMigration(makeRow({
      photo_path: `${TREE_ID}/person-1.webp`,
      custom_fields: { photoAsset: asset },
    }), SUPABASE_URL);
    const adapter = createAdapter({
      downloadPrivateObject: vi.fn(async () => new Blob(['corrupt'], { type: 'image/webp' })),
    });

    const result = await migrateLegacyPersonMediaPlan(plan, adapter);

    expect(result).toEqual({ migratedCount: 0, cleanedCount: 0, failedCount: 1 });
    expect(adapter.removeLegacyObject).not.toHaveBeenCalled();
    expect(adapter.finalizeLegacyReference).not.toHaveBeenCalled();
  });

  it('compensates an unverified new private copy before attaching it', async () => {
    const plan = planLegacyPersonMediaMigration(makeRow({
      photo_path: `${TREE_ID}/person-1.webp`,
    }), SUPABASE_URL);
    const adapter = createAdapter({
      downloadPrivateObject: vi.fn(async () => new Blob(['corrupt'], { type: 'image/webp' })),
    });

    const result = await migrateLegacyPersonMediaPlan(plan, adapter, {
      createAssetId: () => '88888888-8888-4888-8888-888888888888',
    });

    expect(result).toEqual({ migratedCount: 0, cleanedCount: 0, failedCount: 1 });
    expect(adapter.attachPrivateAsset).not.toHaveBeenCalled();
    expect(adapter.removePrivateObject).toHaveBeenCalledTimes(1);
    expect(adapter.removeLegacyObject).not.toHaveBeenCalled();
  });

  it('does not remove a shared source when one of its gallery attachments fails', async () => {
    const sharedPath = `${TREE_ID}/person-1/shared.webp`;
    const plan = planLegacyPersonMediaMigration(makeRow({
      custom_fields: { gallery: [sharedPath, sharedPath] },
    }), SUPABASE_URL);
    let attachment = 0;
    const adapter = createAdapter({
      attachPrivateAsset: vi.fn(async (_task: LegacyPersonMediaTask) => ++attachment === 1),
    });
    const assetIds = [
      '66666666-6666-4666-8666-666666666666',
      '77777777-7777-4777-8777-777777777777',
    ];

    const result = await migrateLegacyPersonMediaPlan(plan, adapter, {
      createAssetId: () => assetIds.shift()!,
    });

    expect(result.migratedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(adapter.removeLegacyObject).not.toHaveBeenCalled();
    expect(adapter.finalizeLegacyReference).not.toHaveBeenCalled();
  });
});
