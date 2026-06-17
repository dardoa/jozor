import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { verifyInternalToken } from '../../shared/auth/internalJwt.js';

type AuthenticatedUser = { uid: string; email: string; token: string };
type ProcessingStatus = 'received' | 'processed' | 'ignored' | 'failed';

type BillingWebhookDiagnosticRow = {
  id: string;
  provider: 'paddle';
  event_id: string | null;
  event_type: string | null;
  processing_status: ProcessingStatus;
  reason: string | null;
  target_user_id: string | null;
  subscription_id: string | null;
  customer_id: string | null;
  price_id: string | null;
  tier: 'free' | 'pro' | 'family' | null;
  http_status: number | null;
  occurred_at: string | null;
  received_at: string;
  metadata: Record<string, unknown>;
};

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function getSupabaseClient(key: string): SupabaseClient {
  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  if (!supabaseUrl) {
    throw new Error('Supabase URL is not configured.');
  }

  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function getSupabaseAdminClient(): SupabaseClient {
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!serviceRoleKey) {
    throw new Error('Supabase service role is not configured.');
  }

  return getSupabaseClient(serviceRoleKey);
}

function getSupabaseAuthClient(): SupabaseClient {
  const anonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
  if (!anonKey) {
    throw new Error('Supabase anon key is not configured.');
  }

  return getSupabaseClient(anonKey);
}

async function authenticateRequest(authHeader?: string): Promise<AuthenticatedUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);

  // 1. Attempt local JWT verification
  const internalUser = await verifyInternalToken(token, getEnv('SUPABASE_JWT_SECRET'));
  if (internalUser) {
    return {
      uid: internalUser.uid,
      email: internalUser.email,
      token,
    };
  }

  // 2. Fall back to Supabase client auth
  const authClient = getSupabaseAuthClient();
  const { data, error } = await authClient.auth.getUser(token);

  if (error || !data.user) return null;

  return {
    uid: data.user.id,
    email: data.user.email ?? '',
    token,
  };
}

async function assertAdmin(supabaseAdmin: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('user_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

function isProcessingStatus(value: unknown): value is ProcessingStatus {
  return value === 'processed' || value === 'ignored' || value === 'failed' || value === 'received';
}

function sanitizeSearchQuery(value: unknown): string {
  if (typeof value !== 'string') return '';

  const sanitized = value
    .normalize('NFKC')
    .replace(/[^\w@.:\-/\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100);

  return sanitized.replace(/_/g, '\\_');
}

function json(res: VercelResponse, status: number, payload: unknown) {
  return res.status(status).json(payload);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', ['GET', 'OPTIONS']);
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return json(res, 405, { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed.' } });
  }

  try {
    const user = await authenticateRequest(req.headers.authorization);
    if (!user) {
      return json(res, 401, { error: { code: 'UNAUTHORIZED', message: 'Invalid or expired auth token.' } });
    }

    const supabaseAdmin = getSupabaseAdminClient();
    const isAdmin = await assertAdmin(supabaseAdmin, user.uid);
    if (!isAdmin) {
      return json(res, 403, { error: { code: 'FORBIDDEN', message: 'Admin access is required.' } });
    }

    const status = typeof req.query.status === 'string' ? req.query.status : 'all';
    const query = sanitizeSearchQuery(req.query.q);
    const limitValue = typeof req.query.limit === 'string' ? Number.parseInt(req.query.limit, 10) : 50;
    const limit = Number.isFinite(limitValue) ? Math.min(Math.max(limitValue, 1), 100) : 50;

    let builder = supabaseAdmin
      .from('billing_webhook_diagnostics')
      .select('id, provider, event_id, event_type, processing_status, reason, target_user_id, subscription_id, customer_id, price_id, tier, http_status, occurred_at, received_at, metadata')
      .order('received_at', { ascending: false })
      .limit(limit);

    if (isProcessingStatus(status)) {
      builder = builder.eq('processing_status', status);
    }

    if (query) {
      builder = builder.or(`event_id.ilike.%${query}%,target_user_id.ilike.%${query}%,subscription_id.ilike.%${query}%,customer_id.ilike.%${query}%,price_id.ilike.%${query}%`);
    }

    const { data, error } = await builder;
    if (error) throw error;

    return json(res, 200, {
      events: (data ?? []) as BillingWebhookDiagnosticRow[],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin billing diagnostics request failed.';
    console.error('[ADMIN_BILLING_DIAGNOSTICS] Request failed.', { message });
    return json(res, 500, {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Admin billing diagnostics request failed.',
      },
    });
  }
}
