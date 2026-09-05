import { db, type PersonMediaCleanupJobRec } from '../utils/db';
import { getSupabaseFull } from './supabaseClient';
import { logError, logInfo } from '../utils/errorLogger';
import { isPersonMediaAssetRef, type Person } from '../types';

export interface PersonMediaStorageTarget {
  readonly bucket: 'person-media' | 'avatars';
  readonly objectPath: string;
  readonly assetId: string;
}

export interface PersonMediaCleanupContext {
  readonly treeId: string;
  readonly userId: string;
  readonly token?: string;
}

interface FlushPersonMediaCleanupOptions extends PersonMediaCleanupContext {
  readonly now?: Date;
  readonly removeObject?: (target: PersonMediaStorageTarget) => Promise<void>;
  readonly isTargetReferenced: (target: PersonMediaStorageTarget) => boolean | Promise<boolean>;
}

const MAX_BACKOFF_MS = 60 * 60 * 1000;

const assertTarget = (treeId: string, target: PersonMediaStorageTarget): void => {
  if (!treeId || !target.assetId || !target.objectPath.startsWith(`${treeId}/`)) {
    throw new Error('Invalid person media cleanup target');
  }
  if (
    target.objectPath.includes('..')
    || target.objectPath.includes('\\')
    || target.objectPath.startsWith('/')
    || !['person-media', 'avatars'].includes(target.bucket)
  ) {
    throw new Error('Unsafe person media cleanup target');
  }
};

const toDedupeKey = (target: PersonMediaStorageTarget): string =>
  `${target.bucket}:${target.objectPath}`;

const toTarget = (job: PersonMediaCleanupJobRec): PersonMediaStorageTarget => ({
  bucket: job.bucket,
  objectPath: job.object_path,
  assetId: job.asset_id,
});

const normalizeLegacyObjectPath = (path: string): string =>
  path.startsWith('avatars/') ? path.slice('avatars/'.length) : path;

const targetMatchesAsset = (
  target: PersonMediaStorageTarget,
  value: unknown
): boolean => isPersonMediaAssetRef(value)
  && value.bucket === target.bucket
  && value.assetId === target.assetId
  && value.objectPath === target.objectPath;

export const isPersonMediaStorageTargetReferenced = (
  people: Readonly<Record<string, Person>>,
  target: PersonMediaStorageTarget
): boolean => Object.values(people).some((person) => {
  if (targetMatchesAsset(target, person.photoAsset)) return true;
  if (
    target.bucket === 'avatars'
    && person.photoPath
    && normalizeLegacyObjectPath(person.photoPath) === target.objectPath
  ) {
    return true;
  }

  return (Array.isArray(person.gallery) ? person.gallery : []).some((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return false;
    if (targetMatchesAsset(target, item.asset)) return true;
    return target.bucket === 'avatars'
      && typeof item.path === 'string'
      && normalizeLegacyObjectPath(item.path) === target.objectPath;
  });
});

export const enqueuePersonMediaCleanup = async (
  context: PersonMediaCleanupContext,
  target: PersonMediaStorageTarget,
  now = new Date()
): Promise<void> => {
  assertTarget(context.treeId, target);
  const dedupeKey = toDedupeKey(target);
  const existing = await db.person_media_cleanup.where('dedupe_key').equals(dedupeKey).first();
  if (existing) return;

  const timestamp = now.toISOString();
  await db.person_media_cleanup.add({
    dedupe_key: dedupeKey,
    tree_id: context.treeId,
    user_id: context.userId,
    bucket: target.bucket,
    object_path: target.objectPath,
    asset_id: target.assetId,
    created_at: timestamp,
    attempt_count: 0,
    next_attempt_at: timestamp,
  });
};

const createDefaultRemover = (token?: string) => async (target: PersonMediaStorageTarget) => {
  if (!token) throw new Error('Missing cleanup session');
  const client = getSupabaseFull(undefined, undefined, token);
  const { error } = await client.storage.from(target.bucket).remove([target.objectPath]);
  if (error) throw error;
};

const toSafeErrorCode = (error: unknown): string => {
  if (error && typeof error === 'object' && 'statusCode' in error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    if (typeof statusCode === 'string' || typeof statusCode === 'number') return `storage-${statusCode}`;
  }
  return 'storage-cleanup-failed';
};

export const flushPersonMediaCleanupQueue = async (
  options: FlushPersonMediaCleanupOptions
): Promise<{ removed: number; deferred: number }> => {
  if (!options.treeId || !options.userId) return { removed: 0, deferred: 0 };
  const now = options.now ?? new Date();
  const removeObject = options.removeObject ?? createDefaultRemover(options.token);
  const jobs = (await db.person_media_cleanup.where('tree_id').equals(options.treeId).toArray())
    .filter((job) => Date.parse(job.next_attempt_at) <= now.getTime());

  let removed = 0;
  let deferred = 0;
  for (const job of jobs) {
    if (job.id === undefined) continue;
    try {
      const target = toTarget(job);
      assertTarget(options.treeId, target);
      if (await options.isTargetReferenced(target)) {
        deferred += 1;
        continue;
      }
      await removeObject(target);
      await db.person_media_cleanup.delete(job.id);
      removed += 1;
    } catch (error) {
      const attemptCount = job.attempt_count + 1;
      const backoffMs = Math.min(MAX_BACKOFF_MS, 2 ** Math.min(attemptCount, 10) * 1000);
      await db.person_media_cleanup.update(job.id, {
        attempt_count: attemptCount,
        next_attempt_at: new Date(now.getTime() + backoffMs).toISOString(),
        last_error_code: toSafeErrorCode(error),
      });
      deferred += 1;
    }
  }

  if (removed > 0) {
    logInfo('PERSON_MEDIA_CLEANUP_COMPLETED', 'Deferred person media objects were removed.', {
      treeId: options.treeId,
      operationType: 'person_media_cleanup',
      removedCount: removed,
    });
  }
  return { removed, deferred };
};

export const deferPersonMediaObjectCleanup = async (
  context: PersonMediaCleanupContext,
  target: PersonMediaStorageTarget
): Promise<void> => {
  try {
    await enqueuePersonMediaCleanup(context, target);
  } catch (error) {
    logError('PERSON_MEDIA_CLEANUP_QUEUE_FAILED', error, {
      showToast: false,
      metadata: { treeId: context.treeId, assetId: target.assetId },
    });
  }
};

export const removePersonMediaObjectOrEnqueue = async (
  context: PersonMediaCleanupContext,
  target: PersonMediaStorageTarget,
  removeObject?: (target: PersonMediaStorageTarget) => Promise<void>
): Promise<void> => {
  assertTarget(context.treeId, target);
  try {
    await (removeObject ?? createDefaultRemover(context.token))(target);
  } catch (error) {
    try {
      await enqueuePersonMediaCleanup(context, target);
    } catch (queueError) {
      logError('PERSON_MEDIA_CLEANUP_QUEUE_FAILED', queueError, {
        showToast: false,
        metadata: { treeId: context.treeId, assetId: target.assetId },
      });
    }
    logError('PERSON_MEDIA_CLEANUP_DEFERRED', error, {
      showToast: false,
      metadata: { treeId: context.treeId, assetId: target.assetId },
    });
  }
};
