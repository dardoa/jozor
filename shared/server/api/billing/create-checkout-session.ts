import type { VercelRequest, VercelResponse } from '@vercel/node';
import { isAccountSessionActive } from '../../../auth/accountSession.js';
import { createClient } from '@supabase/supabase-js';
import { verifyInternalToken } from '../../../auth/internalJwt.js';
import {
  buildCorsHeaders,
  getHeaderOrigin,
  isRequestOriginAllowed,
  resolveAllowedOriginFromEnv,
} from '../../../http/cors.js';
import { MAX_JSON_BODY_SIZE, PayloadTooLargeError } from '../../http/bodyLimits.js';
import { ACCOUNT_ADMISSION_PAUSE_BODY, ACCOUNT_ADMISSION_PAUSE_HEADERS, isAccountAdmissionPaused } from '../../../http/accountAdmission.js';
import { isDefinitiveCheckoutRejection } from '../../paddleCheckoutRejection.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

type AuthenticatedUser = {
  uid: string;
  email: string;
};

interface CheckoutRequestBody {
  tier?: string;
}

async function readJsonBody(req: VercelRequest): Promise<CheckoutRequestBody> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let totalLength = 0;

    const onData = (chunk: Buffer | Uint8Array) => {
      const buffer = Buffer.from(chunk);
      totalLength += buffer.length;
      if (totalLength > MAX_JSON_BODY_SIZE) {
        cleanup();
        reject(new PayloadTooLargeError());
      } else {
        chunks.push(buffer);
      }
    };

    const onEnd = () => {
      cleanup();
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString('utf8')) as CheckoutRequestBody;
        resolve(body);
      } catch (err) {
        reject(err);
      }
    };

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };

    function cleanup() {
      req.off('data', onData);
      req.off('end', onEnd);
      req.off('error', onError);
    }

    req.on('data', onData);
    req.on('end', onEnd);
    req.on('error', onError);
  });
}

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

async function authenticateUser(authHeader?: string): Promise<AuthenticatedUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);
  if (!await isAccountSessionActive(token)) return null;
  const internalUser = await verifyInternalToken(token, getEnv('SUPABASE_JWT_SECRET'));
  if (internalUser) {
    return {
      uid: internalUser.uid,
      email: internalUser.email,
    };
  }

  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY') || getEnv('VITE_SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) return null;

  return { uid: data.user.id, email: data.user.email ?? '' };
}

const resolveAllowedOrigin = (): string | null => resolveAllowedOriginFromEnv(process.env);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = resolveAllowedOrigin();

  if (!allowedOrigin) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Server configuration error: APP_ORIGIN is not configured in production.'
    }));
    return;
  }

  const origin = getHeaderOrigin(req.headers);
  const headers = buildCorsHeaders(allowedOrigin, {
    methods: 'POST, OPTIONS',
    allowCredentials: true,
  }, origin);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  if (isAccountAdmissionPaused(process.env)) {
    res.writeHead(503, { ...headers, ...ACCOUNT_ADMISSION_PAUSE_HEADERS, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(ACCOUNT_ADMISSION_PAUSE_BODY));
  }

  let body: CheckoutRequestBody;
  try {
    body = await readJsonBody(req);
  } catch (error: unknown) {
    if (error instanceof PayloadTooLargeError) {
      res.writeHead(413, { ...headers, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Payload Too Large' }));
    }
    res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid JSON body' }));
  }

  if (!isRequestOriginAllowed(origin, allowedOrigin)) {
    res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid request origin.' }));
  }

  // Authenticate only after malformed or oversized payloads have been rejected.
  const authHeader = req.headers.authorization;
  const user = await authenticateUser(authHeader);
  if (!user) {
    res.writeHead(401, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized: Invalid session.' }));
  }

  const { tier } = body;
  if (tier !== 'pro' && tier !== 'family') {
    res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid tier. Must be pro or family.' }));
  }

  // 3. Initialize Supabase Admin Client
  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[CREATE_CHECKOUT] Supabase keys are not configured.');
    res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Server configuration error' }));
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  try {
    // 4. Enforce Database-Backed Rate Limiting (Atomic RPC)
    const { data: allowed, error: rateLimitError } = await supabaseAdmin.rpc(
      'check_checkout_rate_limit',
      { p_user_id: user.uid }
    );

    if (rateLimitError) {
      throw new Error(`Rate limit check failed: ${rateLimitError.message}`);
    }

    if (!allowed) {
      res.writeHead(429, { ...headers, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Too Many Requests. Please wait a minute before trying again.' }));
    }

    // 5. Select proper price ID strictly based on tier
    const proPriceId = getEnv('PADDLE_PRO_PRICE_ID');
    const familyPriceId = getEnv('PADDLE_FAMILY_PRICE_ID');
    const priceId = tier === 'pro' ? proPriceId : familyPriceId;

    if (!priceId) {
      console.error(`[CREATE_CHECKOUT] Price ID for tier ${tier} is not configured.`);
      res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Paddle price ID is not configured.' }));
    }

    const paddleApiKey = getEnv('PADDLE_API_KEY');
    if (!paddleApiKey) {
      console.error('[CREATE_CHECKOUT] PADDLE_API_KEY is not configured.');
      res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Paddle API key is not configured.' }));
    }

    const paddleEnv = getEnv('PADDLE_ENVIRONMENT') || getEnv('VITE_PADDLE_ENVIRONMENT') || 'sandbox';
    if (paddleEnv !== 'sandbox' && paddleEnv !== 'production') throw new Error('Invalid Paddle environment');
    const paddleHost = paddleEnv === 'production' ? 'api.paddle.com' : 'sandbox-api.paddle.com';
    const paddleUrl = `https://${paddleHost}/transactions`;

    // Reserve under the same profile lock used by account deletion, before any
    // external transaction can exist. An uncertain response stays unresolved.
    const attempt = await supabaseAdmin.rpc('begin_account_checkout', { p_user_id: user.uid });
    if (attempt.error || typeof attempt.data !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attempt.data)) {
      res.writeHead(409, { ...headers, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Account checkout is temporarily unavailable.' }));
    }
    // 6. Request transaction creation from Paddle API
    const providerSignal = AbortSignal.timeout(10000);
    const response = await fetch(paddleUrl, {
      method: 'POST',
      signal: providerSignal,
      redirect: 'error',
      headers: {
        'Authorization': `Bearer ${paddleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            price_id: priceId,
            quantity: 1,
          },
        ],
        custom_data: {
          userId: user.uid,
          checkoutAttemptId: attempt.data,
        },
      }),
    });

    if (!response.ok) {
      if (await isDefinitiveCheckoutRejection(response, providerSignal)) {
        const resolved = await supabaseAdmin.rpc('resolve_rejected_account_checkout', {
          p_user_id: user.uid, p_attempt_id: attempt.data,
        });
        if (resolved.error || resolved.data !== true) throw new Error('Checkout rejection persistence unavailable');
      }
      throw new Error(`Paddle API response error (${response.status})`);
    }

    const paddleResult = await response.json();
    const transactionId = paddleResult.data?.id;

    if (typeof transactionId !== 'string' || !/^txn_[a-z0-9]+$/.test(transactionId)) {
      throw new Error('Paddle transaction creation response is missing data.id');
    }

    const recorded = await supabaseAdmin.rpc('record_account_checkout', { p_attempt_id: attempt.data, p_transaction_id: transactionId });
    if (recorded.error || recorded.data !== true) throw new Error('Checkout transaction persistence unavailable');

    // 7. Return securely generated transactionId to client
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ transactionId }));
  } catch {
    console.error('[CREATE_CHECKOUT] Failed to create checkout transaction.');
    res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to initiate checkout session' }));
  }
}
