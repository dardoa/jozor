import type { SupabaseClient } from '@supabase/supabase-js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type CleanupObject = { bucket: 'avatars' | 'person-media'; path: string };
type CleanupJob = {
  id: string; userId: string; authId: string | null; treeIds: string[];
  stage: 'storage' | 'auth'; leaseToken: string; objects: CleanupObject[];
};

function isJob(value: unknown): value is CleanupJob {
  if (!value || typeof value !== 'object') return false;
  const job = value as Partial<CleanupJob>;
  if (typeof job.id !== 'string' || !uuid.test(job.id) || typeof job.leaseToken !== 'string' || !uuid.test(job.leaseToken)
    || typeof job.userId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(job.userId)
    || (job.authId !== null && (typeof job.authId !== 'string' || !uuid.test(job.authId) || job.authId !== job.userId))
    || !Array.isArray(job.treeIds) || !job.treeIds.every(id => typeof id === 'string' && uuid.test(id))
    || !Array.isArray(job.objects) || job.objects.length > 100
    || (job.stage !== 'storage' && job.stage !== 'auth')) return false;
  if (job.stage === 'auth') return job.objects.length === 0;
  return job.objects.length > 0 && job.objects.every((object: unknown) => {
    if (!object || typeof object !== 'object') return false;
    const item = object as Partial<CleanupObject>;
    if ((item.bucket !== 'avatars' && item.bucket !== 'person-media') || typeof item.path !== 'string'
      || /[\\%?#]/.test(item.path) || [...item.path].some(char => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127)
      || item.path.split('/').some(part => !part || part === '.' || part === '..')) return false;
    return (item.bucket === 'avatars' && item.path.startsWith(`users/${job.userId}/`))
      || job.treeIds!.some(id => item.path!.startsWith(`${id}/`));
  });
}

/** Uses only service-claimed exact keys; never scans mutable folder prefixes. */
export async function runAccountDeletionCleanup(admin: SupabaseClient, jobId?: string) {
  const started = Date.now();
  const result = { steps: 0, completedJobs: 0, deferred: false };
  while (result.steps < 8 && Date.now() - started < 15_000) {
    const { data, error } = await admin.rpc('claim_account_deletion_cleanup', { p_job_id: jobId ?? null });
    if (error) throw new Error('Account cleanup claim unavailable');
    if (data === null) break;
    if (!isJob(data) || (jobId && data.id !== jobId)) {
      // A malformed manifest must never authorize resource deletion. A valid
      // service-issued lease envelope can still be deferred without starving
      // other scheduled jobs.
      if (!jobId && data && typeof data.id === 'string' && uuid.test(data.id)
        && typeof data.leaseToken === 'string' && uuid.test(data.leaseToken)) {
        const deferred = await admin.rpc('retry_account_deletion_cleanup', { p_job_id: data.id, p_lease_token: data.leaseToken });
        if (deferred.error || deferred.data !== true) throw new Error('Invalid account cleanup claim');
        result.steps++;
        result.deferred = true;
        continue;
      }
      throw new Error('Invalid account cleanup claim');
    }
    const job = data;
    const args = { p_job_id: job.id, p_lease_token: job.leaseToken };
    result.steps++;
    try {
      if (job.stage === 'storage') {
        for (const bucket of ['avatars', 'person-media'] as const) {
          const paths = job.objects.filter(object => object.bucket === bucket).map(object => object.path);
          if (!paths.length) continue;
          const { error: storageError } = await admin.storage.from(bucket).remove(paths);
          if (storageError) throw new Error('Account storage cleanup failed');
        }
      } else if (job.authId !== null) {
        const { error: authError } = await admin.auth.admin.deleteUser(job.authId);
        if (authError && authError.status !== 404 && authError.code !== 'user_not_found') {
          throw new Error('Account authentication cleanup failed');
        }
      }
      // SQL independently verifies Storage/Auth absence before advancing.
      const finished = await admin.rpc('finish_account_deletion_cleanup', args);
      if (finished.error || finished.data !== true) throw new Error('Account cleanup completion not verified');
      if (job.stage === 'auth') {
        result.completedJobs++;
        if (jobId) break;
      }
    } catch {
      // A lost response leaves a recoverable lease, not a false completion.
      try { await admin.rpc('retry_account_deletion_cleanup', args); } catch { /* Lease expiry permits a later retry. */ }
      result.deferred = true;
      if (jobId) break;
    }
  }
  return result;
}
