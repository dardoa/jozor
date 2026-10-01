import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { isAccountSessionActive } from '../../shared/auth/accountSession.js';
import { verifyInternalToken } from '../../shared/auth/internalJwt.js';
import { runAccountDeletionCleanup } from '../../shared/server/accountDeletionCleanup.js';
import { reconcileAccountCheckouts } from '../../shared/server/accountCheckoutFence.js';
import { buildCorsHeaders, getHeaderOrigin, isRequestOriginAllowed, resolveAllowedOriginFromEnv } from '../../shared/http/cors.js';
import { ACCOUNT_ADMISSION_PAUSE_BODY, ACCOUNT_ADMISSION_PAUSE_HEADERS, isAccountAdmissionPaused } from '../../shared/http/accountAdmission.js';

export const config = { maxDuration: 60 };
const getEnv = (name: string) => process.env[name]?.trim() || undefined;
const clientOptions = {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => fetch(input, {
      ...init, signal: AbortSignal.any([AbortSignal.timeout(5000), ...(init?.signal ? [init.signal] : [])]),
    }),
  },
};

async function authenticateUser(header?: string) {
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  if (!await isAccountSessionActive(token)) return null;
  const internal = await verifyInternalToken(token, getEnv('SUPABASE_JWT_SECRET'));
  if (internal) return internal;
  const url = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const key = getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  const { data, error } = await createClient(url, key, clientOptions).auth.getUser(token);
  return !error && data.user ? { uid: data.user.id } : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const scheduled = req.method === 'GET';
  if (scheduled) {
    const secret = getEnv('CRON_SECRET');
    if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'Unauthorized' });
    if (getEnv('ACCOUNT_DELETION_CLEANUP_ENABLED') !== 'true') return res.status(200).json({ enabled: false });
  } else {
    const allowed = resolveAllowedOriginFromEnv(process.env);
    if (!allowed) return res.status(500).json({ error: 'Server configuration error' });
    const origin = getHeaderOrigin(req.headers);
    Object.entries(buildCorsHeaders(allowed, { methods: 'POST, OPTIONS', allowCredentials: true }, origin))
      .forEach(([key, value]) => res.setHeader(key, value));
    if (!isRequestOriginAllowed(origin, allowed)) return res.status(400).json({ error: 'Invalid request origin.' });
    if (req.method === 'OPTIONS') return res.status(204).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  }
  const receipt = req.body?.receipt;
  const statusOnly = !scheduled && req.body?.action === 'status';
  if (!scheduled && !statusOnly && isAccountAdmissionPaused(process.env)) {
    Object.entries(ACCOUNT_ADMISSION_PAUSE_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
    return res.status(503).json(ACCOUNT_ADMISSION_PAUSE_BODY);
  }
  if ((receipt !== undefined && (typeof receipt !== 'string' || !/^[0-9a-f]{64}$/.test(receipt)))
    || (statusOnly && receipt === undefined)) return res.status(400).json({ error: 'Invalid deletion receipt' });
  const receiptHash = typeof receipt === 'string' ? createHash('sha256').update(receipt).digest('hex') : null;
  if (statusOnly) {
    const url = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
    const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !key) return res.status(503).json({ error: 'Account status is temporarily unavailable' });
    try {
      const { data, error } = await createClient(url, key, clientOptions).rpc('get_account_deletion_status', { p_receipt_hash: receiptHash });
      if (error) throw error;
      if (data !== 'pending' && data !== 'complete') return res.status(404).json({ status: 'unconfirmed' });
      return res.status(200).json({ status: data });
    } catch { return res.status(503).json({ error: 'Account status is temporarily unavailable' }); }
  }
  let user: { uid: string } | null = null;
  if (!scheduled) {
    try { user = await authenticateUser(req.headers.authorization); } catch { /* Fail closed. */ }
    if (!user) return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    // The flag stages SQL, worker scheduling and user admission as one release.
    if (getEnv('ACCOUNT_DELETION_CLEANUP_ENABLED') !== 'true' || !getEnv('CRON_SECRET')) return res.status(503).json({ error: 'Account deletion is temporarily unavailable' });
  }
  const url = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const serviceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const anonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
  if (!url || !serviceKey || (!scheduled && !anonKey)) return res.status(503).json({ error: 'Account cleanup is not configured' });
  const admin = createClient(url, serviceKey, clientOptions);
  if (scheduled) {
    try { return res.status(200).json(await runAccountDeletionCleanup(admin)); }
    catch { return res.status(503).json({ error: 'Account cleanup is temporarily unavailable' }); }
  }
  try {
    const billing = await admin.from('subscriptions').select('id').eq('user_id', user!.uid).neq('status', 'canceled').limit(1);
    if (billing.error || !Array.isArray(billing.data)) return res.status(503).json({ error: 'Unable to verify subscription status. Try again later.' });
    if (billing.data.length > 0) return res.status(409).json({ code: 'ACCOUNT_HAS_OPEN_SUBSCRIPTION', error: 'Subscription cancellation must take effect before deleting the account.' });
    if (!await reconcileAccountCheckouts(admin, user!.uid)) return res.status(409).json({ code: 'ACCOUNT_HAS_PENDING_CHECKOUT', error: 'An unresolved checkout needs verification before account deletion.' });
    const userClient = createClient(url, anonKey!, {
      ...clientOptions, global: { ...clientOptions.global, headers: { Authorization: req.headers.authorization! } },
    });
    // SQL derives identity/targets, queues cleanup, deletes rows and revokes the
    // caller atomically. No Storage/Auth deletion is attempted before this commit.
    const requested = receiptHash
      ? await userClient.rpc('request_account_deletion', { p_receipt_hash: receiptHash })
      : await userClient.rpc('request_account_deletion');
    if (requested.error?.message === 'ACCOUNT_HAS_OPEN_SUBSCRIPTION') return res.status(409).json({
      code: 'ACCOUNT_HAS_OPEN_SUBSCRIPTION', error: 'Subscription cancellation must take effect before deleting the account.',
    });
    if (requested.error?.message === 'ACCOUNT_HAS_PENDING_CHECKOUT') return res.status(409).json({ code: 'ACCOUNT_HAS_PENDING_CHECKOUT', error: 'An unresolved checkout needs verification before account deletion.' });
    if (requested.error?.message === 'ACCOUNT_HAS_RETAINED_UPLOADS') return res.status(409).json({ code: 'ACCOUNT_HAS_RETAINED_UPLOADS', error: 'Retained shared uploads require ownership review before account deletion.' });
    if (requested.error || typeof requested.data !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requested.data)) {
      return res.status(503).json({ error: 'Unable to confirm account deletion. Try signing in again before retrying.' });
    }
    try {
      const result = await runAccountDeletionCleanup(admin, requested.data);
      if (result.completedJobs > 0) return res.status(200).json({ success: true, status: 'complete' });
    } catch { /* The durable job is retained even if the immediate attempt fails. */ }
    return res.status(202).json({ success: true, status: 'pending' });
  } catch {
    return res.status(503).json({ error: 'Account deletion is temporarily unavailable' });
  }
}
