import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

type AuthenticatedUser = {
  uid: string;
  email: string;
};

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function base64UrlDecode(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '='), 'base64');
}

function verifyInternalToken(token: string): AuthenticatedUser | null {
  const jwtSecret = getEnv('SUPABASE_JWT_SECRET');
  if (!jwtSecret) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [header, payload, signature] = parts;
    const expectedSignature = crypto
      .createHmac('sha256', jwtSecret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      return null;
    }

    const parsed = JSON.parse(base64UrlDecode(payload).toString('utf8')) as {
      sub?: string;
      email?: string;
      exp?: number;
    };

    if (!parsed.sub || !parsed.email) return null;
    if (parsed.exp && parsed.exp < Math.floor(Date.now() / 1000)) return null;

    return { uid: parsed.sub, email: parsed.email };
  } catch {
    return null;
  }
}

async function authenticateUser(authHeader?: string): Promise<AuthenticatedUser | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice('Bearer '.length);
  const internalUser = verifyInternalToken(token);
  if (internalUser) return internalUser;

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  const origin = req.headers.origin;
  const allowedOrigin = getEnv('VITE_APP_ORIGIN') || getEnv('APP_ORIGIN') || 'http://localhost:5173';

  const headers = {
    'Access-Control-Allow-Origin': origin === allowedOrigin ? origin : allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  // 1. Authenticate user
  const authHeader = req.headers.authorization;
  const user = await authenticateUser(authHeader);
  if (!user) {
    res.writeHead(401, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized: Invalid session.' }));
  }

  interface CheckoutRequestBody {
    tier?: string;
  }

  // 2. Parse body
  let body: CheckoutRequestBody = {};
  if (req.body) {
    body = req.body as CheckoutRequestBody;
  } else {
    // If Vercel bodyParser is not used, get raw body and parse
    try {
      const chunks: Uint8Array[] = [];
      for await (const chunk of req) {
        chunks.push(chunk);
      }
      const raw = Buffer.concat(chunks).toString('utf8');
      body = JSON.parse(raw) as CheckoutRequestBody;
    } catch {
      res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON body' }));
    }
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
    const paddleHost = paddleEnv === 'production' ? 'api.paddle.com' : 'sandbox-api.paddle.com';
    const paddleUrl = `https://${paddleHost}/transactions`;

    // 6. Request transaction creation from Paddle API
    const response = await fetch(paddleUrl, {
      method: 'POST',
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
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Paddle API response error (${response.status}): ${errorText}`);
    }

    const paddleResult = await response.json();
    const transactionId = paddleResult.data?.id;

    if (!transactionId) {
      throw new Error('Paddle transaction creation response is missing data.id');
    }

    // 7. Return securely generated transactionId to client
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ transactionId }));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[CREATE_CHECKOUT] Failed to create checkout transaction:', message);
    res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to initiate checkout session' }));
  }
}
