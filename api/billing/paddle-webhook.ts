import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

// Disable Vercel's default body parser so we can get the raw body for signature verification
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

function verifyPaddleSignature(rawBody: string, signatureHeader: string, secretKey: string): boolean {
  try {
    const parts = signatureHeader.split(';');
    const tsPart = parts.find(p => p.startsWith('ts='));
    const h1Part = parts.find(p => p.startsWith('h1='));
    
    if (!tsPart || !h1Part) return false;
    
    const ts = tsPart.split('=')[1];
    const h1 = h1Part.split('=')[1];
    
    const signedPayload = `${ts}:${rawBody}`;
    
    const computedHmac = crypto
      .createHmac('sha256', secretKey)
      .update(signedPayload)
      .digest('hex');
      
    return crypto.timingSafeEqual(Buffer.from(computedHmac), Buffer.from(h1));
  } catch (err) {
    console.error('[PADDLE_WEBHOOK] Signature parsing error:', err);
    return false;
  }
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

  // Verify the signature
  const isSignatureValid = verifyPaddleSignature(rawBody, signatureHeader, webhookSecret);
  if (!isSignatureValid) {
    console.warn('[PADDLE_WEBHOOK] Signature verification failed');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch (err) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const eventType = event.event_type;
  if (!eventType || !eventType.startsWith('subscription.')) {
    // We only process subscription events
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

  // Determine user's subscription tier
  let tier: 'free' | 'pro' | 'family' = 'free';
  const proPriceId = process.env.PADDLE_PRO_PRICE_ID;
  const familyPriceId = process.env.PADDLE_FAMILY_PRICE_ID;
  const proProductId = process.env.PADDLE_PRO_PRODUCT_ID;
  const familyProductId = process.env.PADDLE_FAMILY_PRODUCT_ID;

  if (status === 'active' || status === 'trialing') {
    const priceId = data.items?.[0]?.price?.id;
    const productId = data.items?.[0]?.price?.product_id;
    
    if (priceId === proPriceId || productId === proProductId) {
      tier = 'pro';
    } else if (priceId === familyPriceId || productId === familyProductId) {
      tier = 'family';
    } else {
      // Fallback: check if price ID contains pro/family in case env var isn't configured yet
      const lowercasePrice = String(priceId || '').toLowerCase();
      const lowercaseProduct = String(productId || '').toLowerCase();
      if (lowercasePrice.includes('pro') || lowercaseProduct.includes('pro')) {
        tier = 'pro';
      } else if (lowercasePrice.includes('family') || lowercaseProduct.includes('family')) {
        tier = 'family';
      }
    }
  }

  console.log(`[PADDLE_WEBHOOK] Processing event ${eventType} for user ${userId}. Tier resolved to: ${tier}`);

  // Create Supabase Admin client to perform updates
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
    // 1. Update user profile tier
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .update({ tier, updated_at: new Date().toISOString() })
      .eq('id', userId);

    if (profileError) {
      throw new Error(`Failed to update user profile tier: ${profileError.message}`);
    }

    // 2. Insert or update subscription details
    const priceId = data.items?.[0]?.price?.id || 'unknown';
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        id: subscriptionId,
        user_id: userId,
        paddle_customer_id: customerId,
        status: status,
        plan_id: priceId,
        current_period_end: currentPeriodEnd,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (subError) {
      throw new Error(`Failed to upsert subscription: ${subError.message}`);
    }

    // 3. Initialize or reset AI quota for Pro users
    if (tier === 'pro') {
      const resetAt = currentPeriodEnd ? new Date(currentPeriodEnd).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { error: quotaError } = await supabaseAdmin
        .from('ai_monthly_usage')
        .upsert({
          user_id: userId,
          cloud_requests_limit: 30,
          reset_at: resetAt,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (quotaError) {
        throw new Error(`Failed to reset AI usage record: ${quotaError.message}`);
      }
    }

    return res.status(200).json({ status: 'success', tier });
  } catch (err: any) {
    console.error('[PADDLE_WEBHOOK] Database update failed:', err);
    return res.status(500).json({ error: err.message || 'Database update failed' });
  }
}
