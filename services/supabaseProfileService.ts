import { logError, logWarn } from '../utils/errorLogger';
import { getTreeClient } from './supabaseTreeClient';

export interface UserProfileUpdates {
  displayName?: string;
  photoURL?: string;
  photoPath?: string;
  photoVersion?: number;
  metadata?: Record<string, unknown>;
}

export const fetchUserProfile = async (
  uid: string,
  email: string,
  token?: string
): Promise<{ metadata: Record<string, unknown> } | null> => {
  performance.mark('diagnostic-3-profile-fetch-start');
  const client = getTreeClient(uid, email || '', token);
  const { data, error } = await client
    .from('user_profiles')
    .select('*')
    .eq('id', uid)
    .maybeSingle();
  performance.mark('diagnostic-3-profile-fetch-end');
  performance.measure('Diagnostic Checkpoint 3: Profile Fetch', 'diagnostic-3-profile-fetch-start', 'diagnostic-3-profile-fetch-end');

  if (error) {
    logError('SupabaseProfileService fetchUserProfile', error, { category: 'NETWORK', severity: 'MEDIUM', showToast: false });
    return null;
  }
  return data;
};

export const updateUserProfile = async (
  uid: string,
  email: string,
  updates: UserProfileUpdates,
  token?: string
): Promise<void> => {
  const client = getTreeClient(uid, email, token);

  const { error } = await client
    .from('user_profiles')
    .update({
      ...(updates.displayName && { display_name: updates.displayName }),
      ...(updates.photoURL && { photo_url: updates.photoURL }),
      ...(updates.photoPath && { photo_path: updates.photoPath }),
      ...(updates.photoVersion !== undefined && { photo_version: updates.photoVersion }),
      ...(updates.metadata && { metadata: updates.metadata }),
    })
    .eq('id', uid);

  if (error) {
    logError('SupabaseProfileService updateUserProfile', error, {
      category: 'NETWORK',
      severity: 'MEDIUM',
      showToast: true,
      toastMessage: 'Failed to update profile.',
    });
    throw error;
  }
};

export const deleteUserAccount = async (uid: string, email?: string, token?: string): Promise<void> => {
  const client = getTreeClient(uid, email || '', token);

  const { error: treeError } = await client
    .from('trees')
    .delete()
    .eq('owner_id', uid);

  if (treeError) {
    logError('SupabaseProfileService deleteUserAccount', treeError, {
      category: 'DATABASE',
      severity: 'HIGH',
      metadata: { uid, operation: 'delete_trees' },
    });
    throw treeError;
  }

  const { error: profileError } = await client
    .from('user_profiles')
    .delete()
    .eq('id', uid);

  if (profileError) {
    logError('SupabaseProfileService deleteUserAccount', profileError, {
      category: 'DATABASE',
      severity: 'HIGH',
      metadata: { uid, operation: 'delete_profile' },
    });
    throw profileError;
  }
};

export const updateUserTourStatus = async (
  uid: string,
  email: string,
  hasCompleted: boolean,
  token?: string
): Promise<void> => {
  const client = getTreeClient(uid, email || '', token);
  const { error } = await client
    .from('user_profiles')
    .upsert({ id: uid, metadata: { has_completed_tour: hasCompleted } }, { onConflict: 'id' });
  if (error) {
    logWarn('SupabaseProfileService updateUserTourStatus', 'Failed to persist tour status.', {
      category: 'DATABASE',
      metadata: { message: error.message },
    });
  }
};
