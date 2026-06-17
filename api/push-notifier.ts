import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { verifyInternalToken } from '../shared/auth/internalJwt.js';
import { normalizeHttpOrigin } from '../shared/http/origin.js';

type PushSubscriptionRecord = {
  id: string;
  user_id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  created_at: string;
  updated_at: string;
};

type PushNotifierBody = {
  userId?: string;
  title?: string;
  body?: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
  data?: Record<string, unknown>;
};

type SendPushPayload = Required<Pick<PushNotifierBody, 'title' | 'body'>> & PushNotifierBody & {
  userId: string;
};

type AuthenticatedUser = {
  uid: string;
  email: string;
  token: string;
};

let adminClient: SupabaseClient | null = null;
let authClient: SupabaseClient | null = null;

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function getSupabaseUrl() {
  return getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
}

function getSupabaseAnonKey() {
  return getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
}

function getAdminClient(): SupabaseClient {
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Supabase server environment variables are not configured for push delivery.');
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return adminClient;
}

function getAuthClient(): SupabaseClient | null {
  const supabaseUrl = getSupabaseUrl();
  const anonKey = getSupabaseAnonKey();
  if (!supabaseUrl || !anonKey) return null;

  if (!authClient) {
    authClient = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return authClient;
}

async function authenticateUser(authHeader?: string): Promise<AuthenticatedUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);
  const internalUser = await verifyInternalToken(token, getEnv('SUPABASE_JWT_SECRET'));
  if (internalUser) {
    return {
      uid: internalUser.uid,
      email: internalUser.email,
      token: internalUser.token ?? token,
    };
  }

  const client = getAuthClient();
  if (!client) return null;

  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    uid: data.user.id,
    email: data.user.email ?? '',
    token,
  };
}

function isExpiredSubscriptionError(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const statusCode = 'statusCode' in error ? Number(error.statusCode) : NaN;
  return statusCode === 404 || statusCode === 410;
}

function getVapidConfig() {
  const publicKey = getEnv('VAPID_PUBLIC_KEY');
  const privateKey = getEnv('VAPID_PRIVATE_KEY');
  const subject = getEnv('VAPID_SUBJECT') || 'mailto:hello@jozor.app';

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY environment variable.');
  }

  return { publicKey, privateKey, subject };
}

function configureWebPush() {
  const vapid = getVapidConfig();
  webpush.setVapidDetails(vapid.subject, vapid.publicKey, vapid.privateKey);
}

function getCronSecret() {
  return getEnv('CRON_SECRET');
}

function hasInternalAdminAccess(req: VercelRequest) {
  const cronSecret = getCronSecret();
  if (!cronSecret) return false;

  const authorization = req.headers.authorization;
  const bearerToken = authorization?.startsWith('Bearer ')
    ? authorization.slice('Bearer '.length).trim()
    : undefined;
  const explicitSecretHeader = req.headers['x-cron-secret'];
  const headerSecret = Array.isArray(explicitSecretHeader) ? explicitSecretHeader[0] : explicitSecretHeader;

  return bearerToken === cronSecret || headerSecret === cronSecret;
}

function validateBody(body: PushNotifierBody) {
  if (!body.title?.trim() || !body.body?.trim()) {
    return 'Both "title" and "body" are required.';
  }

  return null;
}

function buildPayload(body: Required<Pick<PushNotifierBody, 'title' | 'body'>> & PushNotifierBody) {
  return JSON.stringify({
    title: body.title,
    body: body.body,
    icon: body.icon || '/favicon.png',
    badge: body.badge || '/favicon.png',
    tag: body.tag || 'jozor-push-notification',
    data: {
      url: body.url || '/',
      ...(body.data || {}),
    },
  });
}

async function listSubscriptionsForUserServer(userId: string): Promise<PushSubscriptionRecord[]> {
  const { data, error } = await getAdminClient()
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as PushSubscriptionRecord[];
}

async function removeSubscriptionByEndpointServer(endpoint: string): Promise<void> {
  const { error } = await getAdminClient()
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint);

  if (error) throw error;
}

async function sendPushToSubscription(
  subscription: PushSubscriptionRecord,
  payload: string,
  options?: { signal?: AbortSignal }
): Promise<'sent' | 'pruned'> {
  if (options?.signal?.aborted) {
    throw new Error('Aborted');
  }

  const abortPromise = new Promise<never>((_, reject) => {
    if (options?.signal?.aborted) return reject(new Error('Aborted'));
    options?.signal?.addEventListener('abort', () => reject(new Error('Aborted')), { once: true });
  });

  const sendPromise = (async () => {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      payload,
      { timeout: 5000 }
    );
    return 'sent' as const;
  })();

  try {
    return await Promise.race([sendPromise, abortPromise]);
  } catch (error) {
    if (isExpiredSubscriptionError(error)) {
      await removeSubscriptionByEndpointServer(subscription.endpoint);
      return 'pruned';
    }

    throw error;
  }
}

export async function sendPushNotificationToUser(body: SendPushPayload, options?: { signal?: AbortSignal }) {
  configureWebPush();

  const subscriptions = await listSubscriptionsForUserServer(body.userId);
  if (subscriptions.length === 0) {
    return {
      sent: 0,
      pruned: 0,
      totalSubscriptions: 0,
    };
  }

  const payload = buildPayload({
    ...body,
    title: body.title.trim(),
    body: body.body.trim(),
  });

  const results = await Promise.allSettled(
    subscriptions.map((subscription) => sendPushToSubscription(subscription, payload, options))
  );

  let sent = 0;
  let pruned = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      if (result.value === 'sent') sent += 1;
      if (result.value === 'pruned') pruned += 1;
    }
  }

  return {
    sent,
    pruned,
    totalSubscriptions: subscriptions.length,
  };
}

function resolveAllowedOrigin(): string | null {
  const candidate = getEnv('APP_ORIGIN') || getEnv('VITE_APP_ORIGIN');
  const normalizedCandidate = normalizeHttpOrigin(candidate);
  if (normalizedCandidate) return normalizedCandidate;

  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview';

  if (isProd) return null;

  return 'http://localhost:5173';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = resolveAllowedOrigin();
  if (!allowedOrigin) {
    return res.status(500).json({ error: 'Server configuration error: APP_ORIGIN is not configured.' });
  }

  const origin = req.headers.origin;
  const corsHeaders: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (origin === allowedOrigin) {
    corsHeaders['Access-Control-Allow-Origin'] = origin;
  } else {
    corsHeaders['Access-Control-Allow-Origin'] = allowedOrigin;
  }

  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (origin && origin !== allowedOrigin) {
    return res.status(400).json({ error: 'Invalid request origin.' });
  }

  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(204).end();
  }

  res.setHeader('Allow', ['POST']);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const isInternalAdminCall = hasInternalAdminAccess(req);
  const user = isInternalAdminCall
    ? null
    : await authenticateUser(req.headers.authorization);

  if (!isInternalAdminCall && !user?.uid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = (req.body || {}) as PushNotifierBody;
  const validationError = validateBody(body);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const targetUserId = body.userId ?? user?.uid;
  if (!targetUserId) {
    return res.status(400).json({ error: 'A target userId is required.' });
  }

  if (!isInternalAdminCall && targetUserId !== user?.uid) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const result = await sendPushNotificationToUser({
      ...body,
      userId: targetUserId,
      title: body.title!.trim(),
      body: body.body!.trim(),
    });
    return res.status(200).json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Push delivery failed.';
    console.error('[API_PUSH_NOTIFIER] Delivery failed.', { message });
    return res.status(500).json({ error: 'Push delivery failed.' });
  }
}
