import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { verifyInternalToken } from '../../../auth/internalJwt.js';
import {
  buildCorsHeaders,
  getHeaderOrigin,
  isRequestOriginAllowed,
  resolveAllowedOriginFromEnv,
} from '../../../http/cors.js';
import { MAX_JSON_BODY_SIZE, PayloadTooLargeError } from '../../http/bodyLimits.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

type AuthenticatedUser = {
  uid: string;
  email: string;
};

type PortalAction = 'overview' | 'cancel' | 'payment';

interface PortalRequestBody {
  action?: PortalAction;
}

type SubscriptionRow = {
  id: string;
  user_id: string;
  status: string;
  paddle_customer_id: string | null;
};

async function readJsonBody(req: VercelRequest): Promise<PortalRequestBody> {
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
      if (chunks.length === 0) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as PortalRequestBody);
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

const selectPortalUrl = (portalData: unknown, action: PortalAction, subscriptionId: string): string | null => {
  const data = portalData as {
    urls?: {
      general?: { overview?: unknown };
      subscriptions?: Array<{
        id?: unknown;
        cancel_subscription?: unknown;
        update_subscription_payment_method?: unknown;
      }>;
    };
  };

  const overview = data.urls?.general?.overview;
  const subscriptionLinks = data.urls?.subscriptions?.find((entry) => entry.id === subscriptionId);

  if (action === 'cancel' && typeof subscriptionLinks?.cancel_subscription === 'string') {
    return subscriptionLinks.cancel_subscription;
  }

  if (action === 'payment' && typeof subscriptionLinks?.update_subscription_payment_method === 'string') {
    return subscriptionLinks.update_subscription_payment_method;
  }

  return typeof overview === 'string' ? overview : null;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const allowedOrigin = resolveAllowedOrigin();

  if (!allowedOrigin) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Server configuration error: APP_ORIGIN is not configured in production.' }));
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

  let body: PortalRequestBody;
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

  const user = await authenticateUser(req.headers.authorization);
  if (!user) {
    res.writeHead(401, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Unauthorized: Invalid session.' }));
  }

  const action = body.action ?? 'overview';
  if (action !== 'overview' && action !== 'cancel' && action !== 'payment') {
    res.writeHead(400, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Invalid portal action.' }));
  }

  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const paddleApiKey = getEnv('PADDLE_API_KEY');

  if (!supabaseUrl || !serviceRoleKey || !paddleApiKey) {
    console.error('[CUSTOMER_PORTAL] Required server configuration is missing.');
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
    const { data: subscription, error: subscriptionError } = await supabaseAdmin
      .from('subscriptions')
      .select('id, user_id, status, paddle_customer_id')
      .eq('user_id', user.uid)
      .in('status', ['active', 'trialing', 'past_due'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (subscriptionError) {
      throw new Error(`Subscription lookup failed: ${subscriptionError.message}`);
    }

    const row = subscription as SubscriptionRow | null;
    if (!row?.id || !row.paddle_customer_id) {
      res.writeHead(404, { ...headers, 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'No active Paddle subscription found.' }));
    }

    const paddleEnv = getEnv('PADDLE_ENVIRONMENT') || getEnv('VITE_PADDLE_ENVIRONMENT') || 'sandbox';
    const paddleHost = paddleEnv === 'production' ? 'api.paddle.com' : 'sandbox-api.paddle.com';
    const response = await fetch(`https://${paddleHost}/customers/${row.paddle_customer_id}/portal-sessions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${paddleApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ subscription_ids: [row.id] }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Paddle portal response error (${response.status}): ${errorText}`);
    }

    const paddleResult = await response.json();
    const portalUrl = selectPortalUrl(paddleResult.data, action, row.id);

    if (!portalUrl) {
      throw new Error('Paddle portal response is missing the requested portal URL.');
    }

    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ portalUrl }));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CUSTOMER_PORTAL] Failed to create portal session:', message);
    res.writeHead(500, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'Failed to open subscription management.' }));
  }
}
