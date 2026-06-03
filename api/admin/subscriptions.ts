import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient, type User as SupabaseAuthUser } from '@supabase/supabase-js';

type BillingTier = 'free' | 'pro' | 'family';
type OverrideSource = 'manual_comp' | 'sandbox_test' | 'internal_test';
type AuthenticatedUser = { uid: string; email: string; token: string };

type UserProfileRow = {
  id: string;
  display_name: string | null;
  photo_url: string | null;
  metadata: Record<string, unknown> | null;
  tier: BillingTier | null;
  created_at: string | null;
  updated_at: string | null;
};

type SubscriptionRow = {
  user_id: string;
  id: string;
  status: string;
  plan_id: string;
  paddle_customer_id: string | null;
  current_period_end: string | null;
  updated_at: string | null;
};

type OverrideRow = {
  id: string;
  user_id: string;
  tier: BillingTier;
  source: OverrideSource;
  reason: string | null;
  starts_at: string;
  expires_at: string | null;
  is_active: boolean;
  created_by: string | null;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
};

const tierRank: Record<BillingTier, number> = {
  free: 0,
  pro: 1,
  family: 2,
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

function isBillingTier(value: unknown): value is BillingTier {
  return value === 'free' || value === 'pro' || value === 'family';
}

function isOverrideSource(value: unknown): value is OverrideSource {
  return value === 'manual_comp' || value === 'sandbox_test' || value === 'internal_test';
}

function isOverrideActive(row: OverrideRow | undefined): row is OverrideRow {
  if (!row || !row.is_active || row.revoked_at) return false;
  if (!row.expires_at) return true;
  return new Date(row.expires_at).getTime() > Date.now();
}

function resolveEffectiveTier(paddleTier: BillingTier, override: OverrideRow | undefined): BillingTier {
  if (!isOverrideActive(override)) return paddleTier;
  return tierRank[override.tier] > tierRank[paddleTier] ? override.tier : paddleTier;
}

function json(res: VercelResponse, status: number, payload: unknown) {
  return res.status(status).json(payload);
}

async function listAuthUsers(supabaseAdmin: SupabaseClient, query: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
  if (error) throw error;

  const normalized = query.trim().toLowerCase();
  const users = data.users as SupabaseAuthUser[];
  return users
    .filter((user) => {
      if (!normalized) return true;
      const email = user.email?.toLowerCase() ?? '';
      return user.id === query || email.includes(normalized);
    })
    .slice(0, 50)
    .map((user) => ({
      id: user.id,
      email: user.email ?? '',
      created_at: user.created_at,
    }));
}

async function listSubscriptions(req: VercelRequest, res: VercelResponse, supabaseAdmin: SupabaseClient) {
  const query = typeof req.query.q === 'string' ? req.query.q : '';
  const authUsers = await listAuthUsers(supabaseAdmin, query);
  const userIds = authUsers.map((user) => user.id);

  if (userIds.length === 0) {
    return json(res, 200, { users: [] });
  }

  const [{ data: profiles, error: profilesError }, { data: subscriptions, error: subscriptionsError }, { data: overrides, error: overridesError }] = await Promise.all([
    supabaseAdmin
      .from('user_profiles')
      .select('id, display_name, photo_url, metadata, tier, created_at, updated_at')
      .in('id', userIds),
    supabaseAdmin
      .from('subscriptions')
      .select('user_id, id, status, plan_id, paddle_customer_id, current_period_end, updated_at')
      .in('user_id', userIds),
    supabaseAdmin
      .from('subscription_overrides')
      .select('id, user_id, tier, source, reason, starts_at, expires_at, is_active, created_by, revoked_at, created_at, updated_at')
      .in('user_id', userIds)
      .is('revoked_at', null)
      .eq('is_active', true),
  ]);

  if (profilesError) throw profilesError;
  if (subscriptionsError) throw subscriptionsError;
  if (overridesError) throw overridesError;

  const profilesById = new Map((profiles ?? [] as UserProfileRow[]).map((profile) => [profile.id, profile]));
  const subscriptionsByUser = new Map((subscriptions ?? [] as SubscriptionRow[]).map((subscription) => [subscription.user_id, subscription]));
  const overridesByUser = new Map((overrides ?? [] as OverrideRow[]).map((override) => [override.user_id, override]));

  return json(res, 200, {
    users: authUsers.map((authUser) => {
      const profile = profilesById.get(authUser.id);
      const subscription = subscriptionsByUser.get(authUser.id);
      const override = overridesByUser.get(authUser.id);
      const paddleTier = isBillingTier(profile?.tier) ? profile.tier : 'free';
      const effectiveTier = resolveEffectiveTier(paddleTier, override);

      return {
        id: authUser.id,
        email: authUser.email,
        displayName: profile?.display_name ?? '',
        paddleTier,
        effectiveTier,
        paddleSubscription: subscription ?? null,
        override: override ?? null,
        createdAt: profile?.created_at ?? authUser.created_at ?? null,
        updatedAt: profile?.updated_at ?? null,
      };
    }),
  });
}

async function ensureProfile(supabaseAdmin: SupabaseClient, userId: string) {
  const { error } = await supabaseAdmin
    .from('user_profiles')
    .upsert({
      id: userId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) throw error;
}

async function grantOverride(req: VercelRequest, res: VercelResponse, supabaseAdmin: SupabaseClient, adminUser: AuthenticatedUser) {
  const { userId, tier, source, reason, expiresAt } = req.body ?? {};

  if (typeof userId !== 'string' || !userId.trim()) {
    return json(res, 400, { error: { code: 'BAD_REQUEST', message: 'userId is required.' } });
  }

  if (tier !== 'pro' && tier !== 'family') {
    return json(res, 400, { error: { code: 'BAD_REQUEST', message: 'Only pro or family overrides can be granted.' } });
  }

  if (!isOverrideSource(source)) {
    return json(res, 400, { error: { code: 'BAD_REQUEST', message: 'Invalid override source.' } });
  }

  if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
    return json(res, 400, { error: { code: 'BAD_REQUEST', message: 'expiresAt must be a valid date.' } });
  }

  await ensureProfile(supabaseAdmin, userId);

  const now = new Date().toISOString();
  const { error: revokeError } = await supabaseAdmin
    .from('subscription_overrides')
    .update({
      is_active: false,
      revoked_at: now,
      revoked_by: adminUser.uid,
      updated_at: now,
    })
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('revoked_at', null);

  if (revokeError) throw revokeError;

  const { data, error } = await supabaseAdmin
    .from('subscription_overrides')
    .insert({
      user_id: userId,
      tier,
      source,
      reason: typeof reason === 'string' && reason.trim() ? reason.trim().slice(0, 500) : null,
      expires_at: expiresAt || null,
      created_by: adminUser.uid,
    })
    .select('id, user_id, tier, source, reason, starts_at, expires_at, is_active, created_by, revoked_at, created_at, updated_at')
    .single();

  if (error) throw error;
  return json(res, 200, { override: data });
}

async function revokeOverride(req: VercelRequest, res: VercelResponse, supabaseAdmin: SupabaseClient, adminUser: AuthenticatedUser) {
  const { userId } = req.body ?? {};

  if (typeof userId !== 'string' || !userId.trim()) {
    return json(res, 400, { error: { code: 'BAD_REQUEST', message: 'userId is required.' } });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from('subscription_overrides')
    .update({
      is_active: false,
      revoked_at: now,
      revoked_by: adminUser.uid,
      updated_at: now,
    })
    .eq('user_id', userId)
    .eq('is_active', true)
    .is('revoked_at', null)
    .select('id');

  if (error) throw error;
  return json(res, 200, { revokedCount: data?.length ?? 0 });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', ['GET', 'POST', 'OPTIONS']);
    return res.status(204).end();
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
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

    if (req.method === 'GET') {
      return await listSubscriptions(req, res, supabaseAdmin);
    }

    const action = req.body?.action;
    if (action === 'grant') {
      return await grantOverride(req, res, supabaseAdmin, user);
    }

    if (action === 'revoke') {
      return await revokeOverride(req, res, supabaseAdmin, user);
    }

    return json(res, 400, { error: { code: 'BAD_REQUEST', message: 'Unsupported admin action.' } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Admin subscription request failed.';
    console.error('[ADMIN_SUBSCRIPTIONS] Request failed.', { message });
    return json(res, 500, { error: { code: 'INTERNAL_SERVER_ERROR', message } });
  }
}
