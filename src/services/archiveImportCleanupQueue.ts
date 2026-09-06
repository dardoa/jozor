import { db, type ArchiveImportCleanupJobRec } from '../utils/db';
import { getSupabaseFull } from './supabaseClient';
import { isUuid } from '../utils/isUuid';
import type { PersonMediaAssetRef } from '../types';

type CleanupTarget = ArchiveImportCleanupJobRec['targets'][number];
type TreeCleanupState = 'ready' | 'removed' | 'review-required';
interface CleanupContext {
  userId: string;
  token?: string;
}
interface FlushOptions extends CleanupContext {
  now?: Date;
  isCurrentSession: () => boolean;
  checkTree?: (treeId: string, finalize: boolean) => Promise<TreeCleanupState>;
  removeObject?: (target: CleanupTarget) => Promise<void>;
}

const assertJob = (job: Pick<ArchiveImportCleanupJobRec, 'tree_id' | 'user_id' | 'targets'>) => {
  if (!isUuid(job.tree_id) || !isUuid(job.user_id) || !Array.isArray(job.targets)) {
    throw new Error('Invalid archive cleanup identity');
  }
  for (const target of job.targets) {
    if (target.bucket !== 'person-media' || !target.assetId
      || !target.objectPath.startsWith(`${job.tree_id}/`)
      || target.objectPath.includes('..') || target.objectPath.includes('\\')) {
      throw new Error('Invalid archive cleanup target');
    }
  }
};

export const enqueueArchiveImportCleanup = async (
  context: CleanupContext & { treeId: string }, assets: readonly PersonMediaAssetRef[]
): Promise<void> => {
  const now = new Date().toISOString();
  const job: ArchiveImportCleanupJobRec = {
    tree_id: context.treeId, user_id: context.userId,
    targets: assets.map(({ bucket, objectPath, assetId }) => ({ bucket, objectPath, assetId })),
    state: 'pending', created_at: now, attempt_count: 0, next_attempt_at: now,
  };
  assertJob(job);
  // Persist the complete compensation intent before attempting any network cleanup.
  await db.archive_import_cleanup.add(job);
};

const activeFlushes = new Map<string, Promise<{ removed: number; deferred: number; reviewRequired: number }>>();

export const flushArchiveImportCleanupQueue = (options: FlushOptions) => {
  const active = activeFlushes.get(options.userId);
  if (active) return active;
  const run = flush(options).finally(() => { activeFlushes.delete(options.userId); });
  activeFlushes.set(options.userId, run);
  return run;
};

async function flush(options: FlushOptions) {
  const result = { removed: 0, deferred: 0, reviewRequired: 0 };
  if (!options.userId || !options.token || !options.isCurrentSession()) return result;
  const now = options.now ?? new Date();
  const jobs = (await db.archive_import_cleanup.where('user_id').equals(options.userId).toArray())
    .filter(job => job.state === 'pending' && Date.parse(job.next_attempt_at) <= now.getTime());
  const client = getSupabaseFull(undefined, undefined, options.token);
  const checkTree = options.checkTree ?? (async (treeId: string, finalize: boolean) => {
    const { data, error } = await client.rpc('cleanup_failed_import_tree', { p_tree_id: treeId, p_finalize: finalize });
    if (error) throw error;
    if (!['ready', 'removed', 'review-required'].includes(data)) throw new Error('Invalid cleanup response');
    return data as TreeCleanupState;
  });
  const removeObject = options.removeObject ?? (async (target: CleanupTarget) => {
    const { error } = await client.storage.from(target.bucket).remove([target.objectPath]);
    if (error) throw error;
  });
  for (const job of jobs) {
    if (!options.isCurrentSession()) break;
    try {
      assertJob(job);
      let state = await checkTree(job.tree_id, false);
      if (!options.isCurrentSession()) break;
      if (state === 'ready') {
        for (const target of job.targets) {
          if (!options.isCurrentSession()) return result;
          await removeObject(target);
        }
        if (!options.isCurrentSession()) break;
        state = await checkTree(job.tree_id, true);
      }
      if (state === 'removed') {
        await db.archive_import_cleanup.delete(job.tree_id);
        result.removed += 1;
      } else {
        await db.archive_import_cleanup.update(job.tree_id, { state: 'review-required' });
        result.reviewRequired += 1;
      }
    } catch {
      const attemptCount = job.attempt_count + 1;
      await db.archive_import_cleanup.update(job.tree_id, {
        attempt_count: attemptCount,
        next_attempt_at: new Date(now.getTime() + Math.min(3600000, 2 ** Math.min(attemptCount, 12) * 1000)).toISOString(),
      });
      result.deferred += 1;
    }
  }
  return result;
}
