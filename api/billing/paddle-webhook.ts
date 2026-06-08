import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Paddle } from '@paddle/paddle-node-sdk';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function getRawBody(req: VercelRequest): Promise<string> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function createSupabaseAdminClient(): SupabaseClient | null {
  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) return null;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function recordBillingWebhookDiagnostic(input: {
  supabaseAdmin?: SupabaseClient | null;
  eventId?: string | null;
  eventType?: string | null;
  processingStatus: 'received' | 'processed' | 'ignored' | 'failed';
  reason?: string | null;
  targetUserId?: string | null;
  subscriptionId?: string | null;
  customerId?: string | null;
  priceId?: string | null;
  tier?: 'free' | 'pro' | 'family' | null;
  httpStatus?: number | null;
  occurredAt?: string | null;
  metadata?: Record<string, unknown>;
}) {
  if (process.env.VITEST === 'true') return;

  const supabaseAdmin = input.supabaseAdmin ?? createSupabaseAdminClient();
  if (!supabaseAdmin) return;

  const { error } = await supabaseAdmin
    .from('billing_webhook_diagnostics')
    .insert({
      provider: 'paddle',
      event_id: input.eventId ?? null,
      event_type: input.eventType ?? null,
      processing_status: input.processingStatus,
      reason: input.reason ?? null,
      target_user_id: input.targetUserId ?? null,
      subscription_id: input.subscriptionId ?? null,
      customer_id: input.customerId ?? null,
      price_id: input.priceId ?? null,
      tier: input.tier ?? null,
      http_status: input.httpStatus ?? null,
      occurred_at: input.occurredAt ?? null,
      metadata: input.metadata ?? {},
    });

  if (error) {
    console.warn('[PADDLE_WEBHOOK] Failed to record diagnostic event.', { message: error.message });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const signatureHeader = req.headers['paddle-signature'];
  if (!signatureHeader || Array.isArray(signatureHeader)) {
    await recordBillingWebhookDiagnostic({
      processingStatus: 'failed',
      reason: 'missing_signature',
      httpStatus: 400,
    });
    return res.status(400).json({ error: 'Missing paddle-signature header' });
  }

  const webhookSecret = getEnv('PADDLE_WEBHOOK_SECRET');
  if (!webhookSecret) {
    console.error('[PADDLE_WEBHOOK] PADDLE_WEBHOOK_SECRET is not configured.');
    await recordBillingWebhookDiagnostic({
      processingStatus: 'failed',
      reason: 'missing_webhook_secret',
      httpStatus: 500,
    });
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const rawBody = await getRawBody(req);

  // 1. Strict Timestamp & Replay Protection (assert ts is within 5 seconds)
  const parts = signatureHeader.split(';');
  const tsPart = parts.find(p => p.startsWith('ts='));
  if (!tsPart) {
    console.warn('[PADDLE_WEBHOOK] Webhook rejected: Missing timestamp in signature');
    await recordBillingWebhookDiagnostic({
      processingStatus: 'failed',
      reason: 'missing_signature_timestamp',
      httpStatus: 400,
    });
    return res.status(400).json({ error: 'Invalid signature format: missing timestamp' });
  }
  const ts = parseInt(tsPart.split('=')[1], 10);
  if (isNaN(ts)) {
    console.warn('[PADDLE_WEBHOOK] Webhook rejected: Invalid timestamp in signature');
    await recordBillingWebhookDiagnostic({
      processingStatus: 'failed',
      reason: 'invalid_signature_timestamp',
      httpStatus: 400,
    });
    return res.status(400).json({ error: 'Invalid signature format: ts is not a number' });
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 5) {
    console.warn(`[PADDLE_WEBHOOK] Webhook signature timestamp expired. Diff: ${Math.abs(now - ts)}s`);
    await recordBillingWebhookDiagnostic({
      processingStatus: 'failed',
      reason: 'expired_signature_timestamp',
      httpStatus: 401,
      metadata: { timestampDiffSeconds: Math.abs(now - ts) },
    });
    return res.status(401).json({ error: 'Signature timestamp expired (replay attack protection)' });
  }

  // 2. Verify paddle signature using Paddle Node SDK
  try {
    const paddle = new Paddle(getEnv('PADDLE_API_KEY') || 'dummy_key');
    const isSignatureValid = await paddle.webhooks.isSignatureValid(rawBody, webhookSecret, signatureHeader);
    if (!isSignatureValid) {
      throw new Error('[Paddle] Webhook signature verification failed');
    }
  } catch (err) {
    console.error('[PADDLE_WEBHOOK] SDK verification error:', err);
    console.warn('[PADDLE_WEBHOOK] Signature verification failed');
    await recordBillingWebhookDiagnostic({
      processingStatus: 'failed',
      reason: 'invalid_signature',
      httpStatus: 401,
    });
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    await recordBillingWebhookDiagnostic({
      processingStatus: 'failed',
      reason: 'invalid_json',
      httpStatus: 400,
    });
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const eventType = event.event_type;
  if (!eventType || !eventType.startsWith('subscription.')) {
    await recordBillingWebhookDiagnostic({
      eventId: event.event_id,
      eventType,
      processingStatus: 'ignored',
      reason: 'not_subscription_event',
      httpStatus: 200,
      occurredAt: event.occurred_at,
    });
    return res.status(200).json({ status: 'ignored', reason: 'Not a subscription event' });
  }

  const data = event.data;
  const subscriptionId = data.id;
  const userId = data.custom_data?.userId;
  const status = data.status;
  const customerId = data.customer_id;
  const currentPeriodEnd = data.current_billing_period?.ends_at;
  const priceId = data.items?.[0]?.price?.id || 'unknown';

  if (!userId) {
    console.warn('[PADDLE_WEBHOOK] Missing custom_data.userId in event', event.event_id);
    await recordBillingWebhookDiagnostic({
      eventId: event.event_id,
      eventType,
      processingStatus: 'failed',
      reason: 'missing_custom_data_user_id',
      subscriptionId,
      customerId,
      priceId,
      httpStatus: 400,
      occurredAt: event.occurred_at,
    });
    return res.status(400).json({ error: 'Missing custom_data.userId' });
  }

  // 2. Strict Price Mapping (No includes check)
  let tier: 'free' | 'pro' | 'family' = 'free';
  const proPriceId = getEnv('PADDLE_PRO_PRICE_ID');
  const familyPriceId = getEnv('PADDLE_FAMILY_PRICE_ID');

  if (status === 'active' || status === 'trialing') {
    if (priceId === proPriceId) {
      tier = 'pro';
    } else if (priceId === familyPriceId) {
      tier = 'family';
    } else {
      console.warn('[PADDLE_WEBHOOK] Unrecognized price ID:', priceId);
      await recordBillingWebhookDiagnostic({
        eventId: event.event_id,
        eventType,
        processingStatus: 'failed',
        reason: 'unrecognized_price_id',
        targetUserId: userId,
        subscriptionId,
        customerId,
        priceId,
        tier,
        httpStatus: 400,
        occurredAt: event.occurred_at,
      });
      return res.status(400).json({ error: 'Unrecognized price ID' });
    }
  }

  const supabaseAdmin = createSupabaseAdminClient();

  if (!supabaseAdmin) {
    console.error('[PADDLE_WEBHOOK] Supabase keys are not configured.');
    await recordBillingWebhookDiagnostic({
      eventId: event.event_id,
      eventType,
      processingStatus: 'failed',
      reason: 'missing_supabase_admin_config',
      targetUserId: userId,
      subscriptionId,
      customerId,
      priceId,
      tier,
      httpStatus: 500,
      occurredAt: event.occurred_at,
    });
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // 3. Process webhook event atomically in a single DB transaction via public wrapper RPC
    const { data: processed, error: rpcError } = await supabaseAdmin.rpc(
      'process_paddle_subscription_event',
      {
        p_event_id: event.event_id,
        p_occurred_at: event.occurred_at,
        p_user_id: userId,
        p_subscription_id: subscriptionId,
        p_customer_id: customerId,
        p_status: status,
        p_plan_id: priceId,
        p_current_period_end: currentPeriodEnd,
        p_tier: tier,
      }
    );

    if (rpcError) {
      throw new Error(`RPC process_paddle_subscription_event failed: ${rpcError.message}`);
    }

    if (!processed) {
      console.log(`[PADDLE_WEBHOOK] Event ${event.event_id} was ignored (duplicate or older).`);
      await recordBillingWebhookDiagnostic({
        supabaseAdmin,
        eventId: event.event_id,
        eventType,
        processingStatus: 'ignored',
        reason: 'duplicate_or_out_of_order',
        targetUserId: userId,
        subscriptionId,
        customerId,
        priceId,
        tier,
        httpStatus: 200,
        occurredAt: event.occurred_at,
      });
      return res.status(200).json({ status: 'ignored', reason: 'duplicate or out-of-order' });
    }

    console.log(`[PADDLE_WEBHOOK] Successfully processed event ${event.event_id} for user ${userId} -> Tier: ${tier}`);
    await recordBillingWebhookDiagnostic({
      supabaseAdmin,
      eventId: event.event_id,
      eventType,
      processingStatus: 'processed',
      reason: 'subscription_updated',
      targetUserId: userId,
      subscriptionId,
      customerId,
      priceId,
      tier,
      httpStatus: 200,
      occurredAt: event.occurred_at,
    });
    return res.status(200).json({ status: 'success', tier });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[PADDLE_WEBHOOK] Database update transaction failed:', message);
    await recordBillingWebhookDiagnostic({
      supabaseAdmin,
      eventId: event.event_id,
      eventType,
      processingStatus: 'failed',
      reason: 'database_transaction_failed',
      targetUserId: userId,
      subscriptionId,
      customerId,
      priceId,
      tier,
      httpStatus: 500,
      occurredAt: event.occurred_at,
      metadata: { message: message.slice(0, 300) },
    });
    return res.status(500).json({ error: 'Database transaction failed' });
  }
}
