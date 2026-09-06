import type { SupabaseClient } from '@supabase/supabase-js';

export interface PersonMediaCleanupTarget {
  bucket: 'avatars' | 'person-media';
  object_path: string;
}

/** Claims fence future attachments; Storage deletion is deliberately outside SQL. */
export async function cleanPersonMediaObject(admin: SupabaseClient, target: PersonMediaCleanupTarget): Promise<boolean> {
  const args = { p_bucket: target.bucket, p_object_path: target.object_path };
  const claim = await admin.rpc('claim_person_media_cleanup', args);
  if (claim.error) throw new Error('Media cleanup claim failed');
  if (claim.data !== true) return false;
  const removed = await admin.storage.from(target.bucket).remove([target.object_path]);
  if (removed.error) throw new Error('Media object cleanup failed');
  const completed = await admin.rpc('complete_person_media_cleanup', args);
  if (completed.error || completed.data !== true) throw new Error('Media cleanup acknowledgement failed');
  return true;
}

export async function sweepPersonMediaOrphans(admin: SupabaseClient) {
  const candidates = await admin.rpc('list_person_media_cleanup_candidates');
  if (candidates.error || !Array.isArray(candidates.data)) throw new Error('Media orphan inventory failed');
  const result = { checked: 0, removed: 0, retained: 0, failed: 0 };
  for (const target of candidates.data as PersonMediaCleanupTarget[]) {
    if (!['avatars', 'person-media'].includes(target.bucket) || typeof target.object_path !== 'string') {
      throw new Error('Invalid media cleanup inventory');
    }
    result.checked += 1;
    try {
      if (await cleanPersonMediaObject(admin, target)) result.removed += 1;
      else result.retained += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}
