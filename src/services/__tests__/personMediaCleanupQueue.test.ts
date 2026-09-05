import { beforeEach, describe, expect, it, vi } from 'vitest';

const { records, sequence, tableMock } = vi.hoisted(() => {
  const records: Array<Record<string, unknown>> = [];
  const sequence = { nextId: 1 };
  const tableMock = {
    where: vi.fn((field: string) => ({
      equals: vi.fn((value: string) => ({
        first: vi.fn(async () => records.find((record) => record[field] === value)),
        toArray: vi.fn(async () => records.filter((record) => record[field] === value)),
      })),
    })),
    add: vi.fn(async (record: Record<string, unknown>) => {
      records.push({ ...record, id: sequence.nextId });
      sequence.nextId += 1;
      return sequence.nextId - 1;
    }),
    delete: vi.fn(async (id: number) => {
      const index = records.findIndex((record) => record.id === id);
      if (index >= 0) records.splice(index, 1);
    }),
    update: vi.fn(async (id: number, updates: Record<string, unknown>) => {
      const record = records.find((entry) => entry.id === id);
      if (record) Object.assign(record, updates);
    }),
  };
  return { records, sequence, tableMock };
});

vi.mock('../../utils/db', () => ({
  db: { person_media_cleanup: tableMock },
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import {
  deferPersonMediaObjectCleanup,
  enqueuePersonMediaCleanup,
  flushPersonMediaCleanupQueue,
  isPersonMediaStorageTargetReferenced,
  removePersonMediaObjectOrEnqueue,
  type PersonMediaStorageTarget,
} from '../personMediaCleanupQueue';

const context = { treeId: 'tree-1', userId: 'user-1', token: 'session-token' };
const QUEUE_TIME = new Date('2026-09-05T00:00:00.000Z');
const target: PersonMediaStorageTarget = {
  bucket: 'person-media',
  objectPath: 'tree-1/profile-photo/123e4567-e89b-42d3-a456-426614174000.webp',
  assetId: '123e4567-e89b-42d3-a456-426614174000',
};

describe('person media cleanup queue', () => {
  beforeEach(() => {
    records.splice(0);
    sequence.nextId = 1;
    vi.clearAllMocks();
  });

  it('enqueues cleanup idempotently without persisting an auth token', async () => {
    await enqueuePersonMediaCleanup(context, target);
    await enqueuePersonMediaCleanup(context, target);

    expect(records).toHaveLength(1);
    expect(records[0]).not.toHaveProperty('token');
    expect(records[0]).not.toHaveProperty('session-token');
  });

  it('removes successful jobs and retains failed jobs with bounded backoff metadata', async () => {
    await enqueuePersonMediaCleanup(context, target, QUEUE_TIME);
    const removeObject = vi.fn().mockRejectedValueOnce({ statusCode: 503 });
    const now = QUEUE_TIME;

    await expect(flushPersonMediaCleanupQueue({
      ...context,
      now,
      removeObject,
      isTargetReferenced: () => false,
    }))
      .resolves.toEqual({ removed: 0, deferred: 1 });
    expect(records).toHaveLength(1);
    expect(records[0].attempt_count).toBe(1);
    expect(records[0].last_error_code).toBe('storage-503');

    const nextAttempt = new Date(String(records[0].next_attempt_at));
    await expect(flushPersonMediaCleanupQueue({
      ...context,
      now: nextAttempt,
      removeObject: vi.fn().mockResolvedValue(undefined),
      isTargetReferenced: () => false,
    })).resolves.toEqual({ removed: 1, deferred: 0 });
    expect(records).toHaveLength(0);
  });

  it('falls back to the durable queue when immediate cleanup fails', async () => {
    await removePersonMediaObjectOrEnqueue(
      context,
      target,
      vi.fn().mockRejectedValue(new Error('offline'))
    );

    expect(records).toHaveLength(1);
  });

  it('defers obsolete-object cleanup without attempting storage immediately', async () => {
    await deferPersonMediaObjectCleanup(context, target);

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ object_path: target.objectPath });
  });

  it('keeps a job while the confirmed tree still references its object', async () => {
    await enqueuePersonMediaCleanup(context, target, QUEUE_TIME);
    const removeObject = vi.fn().mockResolvedValue(undefined);

    await expect(flushPersonMediaCleanupQueue({
      ...context,
      now: new Date('2026-09-05T00:00:01.000Z'),
      removeObject,
      isTargetReferenced: () => true,
    })).resolves.toEqual({ removed: 0, deferred: 1 });

    expect(removeObject).not.toHaveBeenCalled();
    expect(records).toHaveLength(1);
  });

  it('detects private and legacy references in confirmed person records', () => {
    const privateAsset = {
      schemaVersion: 1 as const,
      provider: 'supabase-private' as const,
      bucket: 'person-media' as const,
      assetId: target.assetId,
      kind: 'profile-photo' as const,
      objectPath: target.objectPath,
      mimeType: 'image/webp' as const,
      byteLength: 128,
      version: 1,
      createdAt: '2026-09-05T00:00:00.000Z',
    };
    const people = {
      'person-1': {
        id: 'person-1',
        photoAsset: privateAsset,
        gallery: [],
      },
    } as never;

    expect(isPersonMediaStorageTargetReferenced(people, target)).toBe(true);
    expect(isPersonMediaStorageTargetReferenced(people, {
      bucket: 'avatars',
      objectPath: 'tree-1/person-1.webp',
      assetId: 'legacy-profile-tree-1',
    })).toBe(false);
  });

  it('allows another authorized tree editor to finish an existing deferred cleanup job', async () => {
    await enqueuePersonMediaCleanup(context, target, QUEUE_TIME);
    const removeObject = vi.fn().mockResolvedValue(undefined);

    await expect(flushPersonMediaCleanupQueue({
      ...context,
      userId: 'tree-owner-2',
      now: new Date('2026-09-05T00:00:01.000Z'),
      removeObject,
      isTargetReferenced: () => false,
    })).resolves.toEqual({ removed: 1, deferred: 0 });

    expect(removeObject).toHaveBeenCalledWith(target);
    expect(records).toHaveLength(0);
  });

  it('rejects paths outside the active tree scope', async () => {
    await expect(enqueuePersonMediaCleanup(context, {
      ...target,
      objectPath: 'other-tree/profile-photo/asset.webp',
    })).rejects.toThrow('Invalid person media cleanup target');
  });

  it('revalidates persisted jobs before attempting deletion', async () => {
    await enqueuePersonMediaCleanup(context, target, QUEUE_TIME);
    records[0].object_path = 'other-tree/profile-photo/private.webp';
    const removeObject = vi.fn();
    await expect(flushPersonMediaCleanupQueue({
      ...context, removeObject, isTargetReferenced: () => false,
      now: new Date('2026-09-05T00:00:01.000Z'),
    })).resolves.toEqual({ removed: 0, deferred: 1 });
    expect(removeObject).not.toHaveBeenCalled();
    expect(records).toHaveLength(1);
  });
});
