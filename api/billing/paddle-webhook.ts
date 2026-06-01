import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const signatureHeader = req.headers['paddle-signature'];
  if (!signatureHeader || Array.isArray(signatureHeader)) {
    return res.status(400).json({ error: 'Missing paddle-signature header' });
  }

  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[PADDLE_WEBHOOK] PADDLE_WEBHOOK_SECRET is not configured.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const rawBody = await getRawBody(req);

  // 1. Strict Timestamp & Replay Protection (assert ts is within 5 seconds)
  const parts = signatureHeader.split(';');
  const tsPart = parts.find(p => p.startsWith('ts='));
  if (!tsPart) {
    console.warn('[PADDLE_WEBHOOK] Webhook rejected: Missing timestamp in signature');
    return res.status(400).json({ error: 'Invalid signature format: missing timestamp' });
  }
  const ts = parseInt(tsPart.split('=')[1], 10);
  if (isNaN(ts)) {
    console.warn('[PADDLE_WEBHOOK] Webhook rejected: Invalid timestamp in signature');
    return res.status(400).json({ error: 'Invalid signature format: ts is not a number' });
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 5) {
    console.warn(`[PADDLE_WEBHOOK] Webhook signature timestamp expired. Diff: ${Math.abs(now - ts)}s`);
    return res.status(401).json({ error: 'Signature timestamp expired (replay attack protection)' });
  }

  // 2. Verify paddle signature using Paddle Node SDK
  try {
    const paddle = new Paddle(process.env.PADDLE_API_KEY || 'dummy_key');
    await paddle.webhooks.unmarshal(rawBody, webhookSecret, signatureHeader);
  } catch (err) {
    console.error('[PADDLE_WEBHOOK] SDK verification error:', err);
    console.warn('[PADDLE_WEBHOOK] Signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const eventType = event.event_type;
  if (!eventType || !eventType.startsWith('subscription.')) {
    return res.status(200).json({ status: 'ignored', reason: 'Not a subscription event' });
  }

  const data = event.data;
  const subscriptionId = data.id;
  const userId = data.custom_data?.userId;
  const status = data.status;
  const customerId = data.customer_id;
  const currentPeriodEnd = data.current_billing_period?.ends_at;

  if (!userId) {
    console.warn('[PADDLE_WEBHOOK] Missing custom_data.userId in event', event.event_id);
    return res.status(400).json({ error: 'Missing custom_data.userId' });
  }

  // 2. Strict Price Mapping (No includes check)
  let tier: 'free' | 'pro' | 'family' = 'free';
  const proPriceId = process.env.PADDLE_PRO_PRICE_ID;
  const familyPriceId = process.env.PADDLE_FAMILY_PRICE_ID;

  if (status === 'active' || status === 'trialing') {
    const priceId = data.items?.[0]?.price?.id;
    if (priceId === proPriceId) {
      tier = 'pro';
    } else if (priceId === familyPriceId) {
      tier = 'family';
    } else {
      console.warn('[PADDLE_WEBHOOK] Unrecognized price ID:', priceId);
      return res.status(400).json({ error: 'Unrecognized price ID' });
    }
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[PADDLE_WEBHOOK] Supabase keys are not configured.');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // 3. Process webhook event atomically in a single DB transaction via public wrapper RPC
    const priceId = data.items?.[0]?.price?.id || 'unknown';
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
      return res.status(200).json({ status: 'ignored', reason: 'duplicate or out-of-order' });
    }

    console.log(`[PADDLE_WEBHOOK] Successfully processed event ${event.event_id} for user ${userId} -> Tier: ${tier}`);
    return res.status(200).json({ status: 'success', tier });
  } catch (err: any) {
    console.error('[PADDLE_WEBHOOK] Database update transaction failed:', err);
    return res.status(500).json({ error: err.message || 'Database transaction failed' });
  }
}
