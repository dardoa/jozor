import { logError, logWarn } from '../utils/errorLogger';
import { getTreeClient } from './supabaseTreeClient';
import { clearAccountDeletionReceipt, getAccountDeletionReceipt, readAccountDeletionStatus } from './accountDeletionReceipt';

type BillingTier = 'free' | 'pro' | 'family';

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

  const { data: overrideData, error: overrideError } = await client
    .from('subscription_overrides')
    .select('tier, expires_at, is_active, revoked_at')
    .eq('user_id', uid)
    .eq('is_active', true)
    .is('revoked_at', null)
    .maybeSingle();

  if (overrideError) {
    logWarn('SupabaseProfileService fetchUserProfile', 'Failed to fetch subscription override.', {
      category: 'NETWORK',
      metadata: { message: overrideError.message },
    });
    return data;
  }

  const isBillingTier = (value: unknown): value is BillingTier =>
    value === 'free' || value === 'pro' || value === 'family';

  const baseTier: BillingTier = isBillingTier(data?.tier) ? data.tier : 'free';
  const overrideTier = overrideData?.tier;
  const overrideIsActive = Boolean(
    overrideData?.is_active &&
    !overrideData.revoked_at &&
    (!overrideData.expires_at || new Date(overrideData.expires_at).getTime() > Date.now())
  );

  if (!overrideIsActive || !isBillingTier(overrideTier) || overrideTier === 'free') {
    return data;
  }

  const rank = { free: 0, pro: 1, family: 2 } as const;
  const effectiveTier = rank[overrideTier] > rank[baseTier] ? overrideTier : baseTier;

  return {
    ...data,
    tier: effectiveTier,
    metadata: {
      ...(data?.metadata ?? {}),
      subscription_override_active: true,
    },
  };
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

export class AccountDeletionSubscriptionError extends Error {
  constructor() {
    super('Subscription cancellation must take effect before deleting the account.');
    this.name = 'AccountDeletionSubscriptionError';
  }
}

export class AccountDeletionCheckoutError extends AccountDeletionSubscriptionError {
  constructor() {
    super();
    this.name = 'AccountDeletionCheckoutError';
    this.message = 'An unresolved checkout must be verified before account deletion.';
  }
}

export class AccountDeletionRetainedFilesError extends Error {
  constructor() { super('Retained shared uploads require ownership review before account deletion.'); this.name = 'AccountDeletionRetainedFilesError'; }
}

export const deleteUserAccount = async (uid: string, _email?: string, token?: string): Promise<'complete' | 'pending'> => {
  const { receipt, existing } = await getAccountDeletionReceipt(uid, token);
  const recover = async () => {
    const status = await readAccountDeletionStatus(receipt);
    if (status === 'complete') clearAccountDeletionReceipt(receipt);
    return status;
  };
  if (existing) {
    const previous = await recover();
    if (previous) return previous;
  }
  try {
    const response = await fetch('/api/auth/delete-account', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify({ receipt }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 409 && errorData?.code === 'ACCOUNT_HAS_RETAINED_UPLOADS') {
        clearAccountDeletionReceipt(receipt);
        throw new AccountDeletionRetainedFilesError();
      }
      if (response.status === 409 && (errorData?.code === 'ACCOUNT_HAS_OPEN_SUBSCRIPTION' || errorData?.code === 'ACCOUNT_HAS_PENDING_CHECKOUT')) {
        clearAccountDeletionReceipt(receipt);
        if (errorData.code === 'ACCOUNT_HAS_PENDING_CHECKOUT') throw new AccountDeletionCheckoutError();
        throw new AccountDeletionSubscriptionError();
      }
      const message = typeof errorData?.error === 'string' ? errorData.error : 'Failed to delete account';
      const errorObj = new Error(message);
      logError('SupabaseProfileService deleteUserAccount', errorObj, {
        category: 'DATABASE',
        severity: 'HIGH',
        metadata: { responseStatus: response.status },
      });
      throw errorObj;
    }
    const result = await response.json().catch(() => null);
    if (response.status === 202 && result?.success === true && result.status === 'pending') return 'pending';
    if (response.status === 200 && result?.success === true && (result.status === 'complete' || result.status === undefined)) {
      clearAccountDeletionReceipt(receipt);
      return 'complete';
    }
    throw new Error('Unable to confirm account deletion');
  } catch (error) {
    if (error instanceof AccountDeletionSubscriptionError || error instanceof AccountDeletionRetainedFilesError) throw error;
    // Recovery is read-only and does not reuse the now-revoked account bearer.
    try { const status = await recover(); if (status) return status; } catch { /* Keep the receipt for a later retry. */ }
    throw error;
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
