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
): Promise<{ metadata: Record<string, unknown>; tier?: 'free' | 'pro' | 'family' } | null> => {
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

export const fetchAiMonthlyUsage = async (
  uid: string,
  email: string,
  token?: string
): Promise<{ cloud_requests_used: number; cloud_requests_limit: number } | null> => {
  const client = getTreeClient(uid, email || '', token);
  const { data, error } = await client
    .from('ai_monthly_usage')
    .select('*')
    .eq('user_id', uid)
    .maybeSingle();

  if (error) {
    logError('SupabaseProfileService fetchAiMonthlyUsage', error, { category: 'NETWORK', severity: 'MEDIUM', showToast: false });
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

  const { error } = await client.rpc('update_my_profile', {
    p_updates: updates,
  });

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

export const deleteUserAccount = async (uid: string, _email?: string, token?: string): Promise<void> => {
  const response = await fetch('/api/auth/delete-account', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.error || 'Failed to delete account';
    const errorObj = new Error(message);
    logError('SupabaseProfileService deleteUserAccount', errorObj, {
      category: 'DATABASE',
      severity: 'HIGH',
      metadata: { uid, responseStatus: response.status },
    });
    throw errorObj;
  }
};

export const updateUserTourStatus = async (
  uid: string,
  email: string,
  hasCompleted: boolean,
  token?: string
): Promise<void> => {
  const client = getTreeClient(uid, email || '', token);
  const { error } = await client.rpc('update_user_tour_status', {
    p_has_completed: hasCompleted,
  });
  if (error) {
    logWarn('SupabaseProfileService updateUserTourStatus', 'Failed to persist tour status.', {
      category: 'DATABASE',
      metadata: { message: error.message },
    });
  }
};
