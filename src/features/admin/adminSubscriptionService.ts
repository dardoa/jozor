import type { UserProfile } from '../../types';

export type AdminBillingTier = 'free' | 'pro' | 'family';
export type AdminSubscriptionOverrideSource = 'manual_comp' | 'sandbox_test' | 'internal_test';

export interface AdminSubscriptionOverride {
  id: string;
  user_id: string;
  tier: AdminBillingTier;
  source: AdminSubscriptionOverrideSource;
  reason: string | null;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
}

export type AdminSubscriptionAuditAction = 'grant' | 'revoke' | 'replace';

export interface AdminSubscriptionAuditEvent {
  id: string;
  target_user_id: string;
  actor_user_id: string | null;
  action: AdminSubscriptionAuditAction;
  override_id: string | null;
  tier: AdminBillingTier | null;
  source: AdminSubscriptionOverrideSource | null;
  reason: string | null;
  expires_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface AdminPaddleSubscription {
  user_id: string;
  id: string;
  status: string;
  plan_id: string;
  paddle_customer_id: string | null;
  current_period_end: string | null;
  updated_at: string | null;
}

export interface AdminSubscriptionUser {
  id: string;
  email: string;
  displayName: string;
  paddleTier: AdminBillingTier;
  effectiveTier: AdminBillingTier;
  paddleSubscription: AdminPaddleSubscription | null;
  override: AdminSubscriptionOverride | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export const ADMIN_SUBSCRIPTION_OVERRIDE_SOURCES: AdminSubscriptionOverrideSource[] = [
  'manual_comp',
  'sandbox_test',
  'internal_test',
];

const requestAdminSubscriptions = async <T>(
  user: UserProfile,
  path: string,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(user.supabaseToken ? { Authorization: `Bearer ${user.supabaseToken}` } : {}),
      ...init?.headers,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || 'Admin subscription request failed.';
    throw new Error(message);
  }

  return payload as T;
};

export const fetchAdminSubscriptions = async (
  user: UserProfile,
  query = ''
): Promise<{ users: AdminSubscriptionUser[]; auditEvents: AdminSubscriptionAuditEvent[] }> => {
  const params = new URLSearchParams();
  if (query.trim()) params.set('q', query.trim());
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const payload = await requestAdminSubscriptions<{
    users: AdminSubscriptionUser[];
    auditEvents?: AdminSubscriptionAuditEvent[];
  }>(
    user,
    `/api/admin/subscriptions${suffix}`
  );
  if (!Array.isArray(payload.users)) {
    throw new Error('Admin subscriptions response is missing users.');
  }

  return {
    users: payload.users,
    auditEvents: Array.isArray(payload.auditEvents) ? payload.auditEvents : [],
  };
};

export const grantAdminSubscriptionOverride = async (
  user: UserProfile,
  input: {
    userId: string;
    tier: Exclude<AdminBillingTier, 'free'>;
    source: AdminSubscriptionOverrideSource;
    reason?: string;
    expiresAt?: string;
  }
): Promise<AdminSubscriptionOverride> => {
  const payload = await requestAdminSubscriptions<{ override: AdminSubscriptionOverride }>(
    user,
    '/api/admin/subscriptions',
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'grant',
        ...input,
        expiresAt: input.expiresAt || null,
      }),
    }
  );
  return payload.override;
};

export const revokeAdminSubscriptionOverride = async (
  user: UserProfile,
  userId: string
): Promise<number> => {
  const payload = await requestAdminSubscriptions<{ revokedCount: number }>(
    user,
    '/api/admin/subscriptions',
    {
      method: 'POST',
      body: JSON.stringify({
        action: 'revoke',
        userId,
      }),
    }
  );
  return payload.revokedCount;
};
