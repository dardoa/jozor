import type { UserProfile } from '../../types';

export type AdminBillingWebhookStatus = 'received' | 'processed' | 'ignored' | 'failed';
export type AdminBillingWebhookTier = 'free' | 'pro' | 'family';

export interface AdminBillingWebhookDiagnosticEvent {
  id: string;
  provider: 'paddle';
  event_id: string | null;
  event_type: string | null;
  processing_status: AdminBillingWebhookStatus;
  reason: string | null;
  target_user_id: string | null;
  subscription_id: string | null;
  customer_id: string | null;
  price_id: string | null;
  tier: AdminBillingWebhookTier | null;
  http_status: number | null;
  occurred_at: string | null;
  received_at: string;
  metadata: Record<string, unknown>;
}

const requestAdminBillingDiagnostics = async <T>(
  user: UserProfile,
  path: string
): Promise<T> => {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(user.supabaseToken ? { Authorization: `Bearer ${user.supabaseToken}` } : {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || payload?.error || 'Admin billing diagnostics request failed.';
    throw new Error(message);
  }

  return payload as T;
};

export const fetchAdminBillingDiagnostics = async (
  user: UserProfile,
  input: {
    status?: 'all' | AdminBillingWebhookStatus;
    query?: string;
    limit?: number;
  } = {}
): Promise<AdminBillingWebhookDiagnosticEvent[]> => {
  const params = new URLSearchParams();
  if (input.status && input.status !== 'all') params.set('status', input.status);
  if (input.query?.trim()) params.set('q', input.query.trim());
  if (input.limit) params.set('limit', String(input.limit));
  const suffix = params.toString() ? `?${params.toString()}` : '';
  const payload = await requestAdminBillingDiagnostics<{
    events?: AdminBillingWebhookDiagnosticEvent[];
  }>(user, `/api/admin/billing-diagnostics${suffix}`);

  return Array.isArray(payload.events) ? payload.events : [];
};
