import type { SupabaseClient } from '@supabase/supabase-js';

export interface UserAvatarCleanupCounts {
  checked: number;
  removed: number;
  retained: number;
  failed: number;
}

export const isUserAvatarObjectPath = (value: unknown, owner?: string, allowLegacy = true): value is string => {
  if (typeof value !== 'string' || value.length > 1024 || /[\\%?#\u0000-\u001f\u007f]/.test(value)) return false;
  const parts = value.split('/');
  if (parts.length !== 3 || parts[0] !== 'users' || !parts[1] || ['.', '..'].includes(parts[1])) return false;
  if (owner !== undefined && parts[1] !== owner) return false;
  return /^profile-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webp$/i.test(parts[2])
    || (allowLegacy && /^profile\.(webp|png|jpg|jpeg)$/.test(parts[2]));
};

const removeRecordedAvatar = async (client: SupabaseClient, objectPath: string): Promise<boolean> => {
  const args = { p_object_path: objectPath };
  const claim = await client.rpc('claim_user_avatar_cleanup', args);
  if (claim.error) throw new Error('Avatar cleanup claim failed');
  if (claim.data !== true) return false;
  const removed = await client.storage.from('avatars').remove([objectPath]);
  if (removed.error) throw new Error('Avatar object cleanup failed');
  const completed = await client.rpc('complete_user_avatar_cleanup', args);
  if (completed.error || completed.data !== true) throw new Error('Avatar cleanup acknowledgement failed');
  return true;
};

const cleanup = async (client: SupabaseClient, inventoryRpc: string): Promise<UserAvatarCleanupCounts> => {
  const inventory = await client.rpc(inventoryRpc);
  if (inventory.error || !Array.isArray(inventory.data) || inventory.data.length > 20) {
    throw new Error('Avatar cleanup inventory failed');
  }
  // Validate the whole batch before issuing a Storage request.
  const paths: string[] = [];
  for (const item of inventory.data as unknown[]) {
    if (!item || typeof item !== 'object' || Object.keys(item).some(key => key !== 'object_path')
      || !('object_path' in item) || !isUserAvatarObjectPath(item.object_path) || paths.includes(item.object_path)) {
      throw new Error('Invalid avatar cleanup inventory');
    }
    paths.push(item.object_path);
  }
  const counts = { checked: 0, removed: 0, retained: 0, failed: 0 };
  for (const objectPath of paths) {
    counts.checked += 1;
    try {
      if (await removeRecordedAvatar(client, objectPath)) counts.removed += 1;
      else counts.retained += 1;
    } catch { counts.failed += 1; }
  }
  return counts;
};

export const cleanupMyUserAvatars = (client: SupabaseClient): Promise<UserAvatarCleanupCounts> =>
  cleanup(client, 'list_my_user_avatar_cleanup');

export const sweepUserAvatarCleanup = (admin: SupabaseClient): Promise<UserAvatarCleanupCounts> =>
  cleanup(admin, 'list_user_avatar_cleanup_candidates');
