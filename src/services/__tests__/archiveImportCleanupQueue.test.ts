import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArchiveImportCleanupJobRec } from '../../utils/db';
import type { PersonMediaAssetRef } from '../../types';

const { records, table } = vi.hoisted(() => {
  const records: ArchiveImportCleanupJobRec[] = [];
  return { records, table: {
    add: vi.fn(async (job: ArchiveImportCleanupJobRec) => { records.push(structuredClone(job)); }),
    where: (key: 'user_id') => ({ equals: (value: string) => ({ toArray: async () => records.filter(r => r[key] === value) }) }),
    delete: vi.fn(async (id: string) => { records.splice(records.findIndex(r => r.tree_id === id), 1); }),
    update: vi.fn(async (id: string, changes: Partial<ArchiveImportCleanupJobRec>) => { Object.assign(records.find(r => r.tree_id === id)!, changes); }),
  } };
});
vi.mock('../../utils/db', () => ({ db: { archive_import_cleanup: table } }));
vi.mock('../supabaseClient', () => ({ getSupabaseFull: vi.fn(() => ({})) }));
import { enqueueArchiveImportCleanup, flushArchiveImportCleanupQueue } from '../archiveImportCleanupQueue';

const context = { treeId: '11111111-1111-4111-8111-111111111111', userId: '22222222-2222-4222-8222-222222222222', token: 'secret-not-persisted' };
const asset: PersonMediaAssetRef = {
  schemaVersion: 1, provider: 'supabase-private', bucket: 'person-media', kind: 'profile-photo',
  assetId: '33333333-3333-4333-8333-333333333333', objectPath: `${context.treeId}/profile-photo/photo.webp`,
  mimeType: 'image/webp', byteLength: 3, version: 1, createdAt: '2026-09-06T00:00:00Z',
};
const options = () => ({ ...context, isCurrentSession: () => true,
  now: new Date(Date.now() + 1000),
  checkTree: vi.fn(async (_id: string, finalize: boolean): Promise<'ready' | 'removed' | 'review-required'> => finalize ? 'removed' : 'ready'),
  removeObject: vi.fn(async () => {}),
});

describe('archive import cleanup', () => {
  beforeEach(() => { records.length = 0; vi.clearAllMocks(); });
  it('persists only compensation targets, without credentials or image bytes', async () => {
    await enqueueArchiveImportCleanup(context, [asset]);
    expect(records[0].targets).toEqual([{ bucket: asset.bucket, objectPath: asset.objectPath, assetId: asset.assetId }]);
    expect(JSON.stringify(records)).not.toContain(context.token);
    expect(records[0]).not.toHaveProperty('token');
  });
  it('retries after a failed Storage deletion, respecting backoff and deleting the tree last', async () => {
    await enqueueArchiveImportCleanup(context, [asset]);
    const o = options();
    o.removeObject.mockRejectedValueOnce(new Error('offline'));
    expect(await flushArchiveImportCleanupQueue(o)).toEqual({ removed: 0, deferred: 1, reviewRequired: 0 });
    expect(o.checkTree).toHaveBeenCalledTimes(1);
    expect(records).toHaveLength(1);
    expect(records[0].attempt_count).toBe(1);
    await flushArchiveImportCleanupQueue(o);
    expect(o.removeObject).toHaveBeenCalledTimes(1);
    o.now = new Date(records[0].next_attempt_at);
    expect(await flushArchiveImportCleanupQueue(o)).toEqual({ removed: 1, deferred: 0, reviewRequired: 0 });
    expect(o.checkTree).toHaveBeenLastCalledWith(context.treeId, true);
    expect(records).toHaveLength(0);
  });
  it('keeps a durable job when tree deletion fails after image deletion', async () => {
    await enqueueArchiveImportCleanup(context, [asset]);
    const o = options();
    o.checkTree.mockResolvedValueOnce('ready').mockRejectedValueOnce(new Error('offline'));
    expect((await flushArchiveImportCleanupQueue(o)).deferred).toBe(1);
    o.now = new Date(records[0].next_attempt_at);
    expect((await flushArchiveImportCleanupQueue(o)).removed).toBe(1);
    expect(o.removeObject).toHaveBeenCalledTimes(2);
  });
  it('does not run another account job even when another tree is active', async () => {
    await enqueueArchiveImportCleanup(context, [asset]);
    const o = { ...options(), userId: 'other-account' };
    await flushArchiveImportCleanupQueue(o);
    expect(o.checkTree).not.toHaveBeenCalled();
    expect(records).toHaveLength(1);
    expect((await flushArchiveImportCleanupQueue(options())).removed).toBe(1);
  });
  it('stops before deleting any asset when the session changes during a request', async () => {
    await enqueueArchiveImportCleanup(context, [asset]);
    let current = true;
    const o = options();
    o.isCurrentSession = () => current;
    o.checkTree.mockImplementationOnce(async () => { current = false; return 'ready'; });
    await flushArchiveImportCleanupQueue(o);
    expect(o.removeObject).not.toHaveBeenCalled();
    expect(records).toHaveLength(1);
  });
  it('preserves all assets of a tree with saved people or collaborators and stops automatic retries', async () => {
    await enqueueArchiveImportCleanup(context, [asset]);
    const o = options();
    o.checkTree.mockResolvedValue('review-required');
    expect((await flushArchiveImportCleanupQueue(o)).reviewRequired).toBe(1);
    expect(o.removeObject).not.toHaveBeenCalled();
    expect(records[0].state).toBe('review-required');
    await flushArchiveImportCleanupQueue(o);
    expect(o.checkTree).toHaveBeenCalledTimes(1);
  });
  it('deduplicates concurrent flushes and handles empty-image failed imports', async () => {
    await enqueueArchiveImportCleanup(context, []);
    const o = options();
    await Promise.all([flushArchiveImportCleanupQueue(o), flushArchiveImportCleanupQueue(o)]);
    expect(o.checkTree).toHaveBeenCalledTimes(2);
    expect(o.removeObject).not.toHaveBeenCalled();
    expect(records).toHaveLength(0);
  });
  it('rejects unsafe targets before persistence and revalidates persisted targets', async () => {
    await expect(enqueueArchiveImportCleanup(context, [{ ...asset, objectPath: 'other-tree/photo.webp' }])).rejects.toThrow();
    await enqueueArchiveImportCleanup(context, [asset]);
    records[0].targets[0].objectPath = `${context.treeId}/../private.webp`;
    const o = options();
    expect((await flushArchiveImportCleanupQueue(o)).deferred).toBe(1);
    expect(o.checkTree).not.toHaveBeenCalled();
    expect(o.removeObject).not.toHaveBeenCalled();
  });
  it('does nothing without current authentication', async () => {
    await enqueueArchiveImportCleanup(context, [asset]);
    const o = options();
    await flushArchiveImportCleanupQueue({ ...o, token: undefined });
    await flushArchiveImportCleanupQueue({ ...o, isCurrentSession: () => false });
    expect(o.checkTree).not.toHaveBeenCalled();
  });
});
