import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const REDIRECT_URI = 'postmessage';

function getEnv(name: string): string | undefined {
  const value = process.env[name];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

function base64UrlEncode(value: string | Buffer): string {
  const buffer = typeof value === 'string' ? Buffer.from(value) : value;
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const encodedSignature = base64UrlEncode(
    crypto.createHmac('sha256', secret).update(data).digest()
  );

  return `${data}.${encodedSignature}`;
}

function encryptToken(token: string, secret: string): string {
  const key = crypto.createHash('sha256').update(secret).digest();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v2.${base64UrlEncode(iv)}.${base64UrlEncode(tag)}.${base64UrlEncode(encrypted)}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const code = typeof req.body?.code === 'string' ? req.body.code : '';
  if (!code) {
    return res.status(400).json({ error: 'Missing auth code' });
  }

  const supabaseUrl = getEnv('SUPABASE_URL') || getEnv('VITE_SUPABASE_URL');
  const supabaseServiceRole = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseJwtSecret = getEnv('SUPABASE_JWT_SECRET');
  const encryptionSecret = getEnv('ENCRYPTION_SECRET');
  const googleClientId = getEnv('GOOGLE_CLIENT_ID') || getEnv('VITE_GOOGLE_CLIENT_ID');
  const googleClientSecret = getEnv('GOOGLE_CLIENT_SECRET');

  if (!supabaseUrl || !supabaseServiceRole || !supabaseJwtSecret || !encryptionSecret || !googleClientId || !googleClientSecret) {
    console.error('Auth exchange configuration missing.', {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasServiceRole: Boolean(supabaseServiceRole),
      hasJwtSecret: Boolean(supabaseJwtSecret),
      hasEncryptionSecret: Boolean(encryptionSecret),
      hasGoogleClientId: Boolean(googleClientId),
      hasGoogleClientSecret: Boolean(googleClientSecret),
    });
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: googleClientId,
        client_secret: googleClientSecret,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error('Google Token Exchange Error:', {
        error: tokens.error,
        hasDescription: Boolean(tokens.error_description),
        status: tokenResponse.status,
      });
      throw new Error(tokens.error_description || 'Failed to exchange code');
    }

    const accessToken = typeof tokens.access_token === 'string' ? tokens.access_token : '';
    const refreshToken = typeof tokens.refresh_token === 'string' ? tokens.refresh_token : '';
    if (!accessToken) {
      throw new Error('Google token response did not include an access token.');
    }

    const userResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const userInfo = await userResponse.json();
    const uid = typeof userInfo.sub === 'string' ? userInfo.sub : '';
    if (!uid) {
      throw new Error('Google userinfo response did not include a user id.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    // 1. Complete profile onboarding before issuing an application session.
    const { error: profileError } = await supabase.rpc('ensure_user_profile', {
      p_user_id: uid,
      p_display_name: userInfo.name || '',
      p_photo_url: userInfo.picture || '',
    });
    if (profileError) {
      console.error('Failed to ensure user profile:', {
        message: profileError.message,
        code: profileError.code,
      });
      throw new Error('Failed to initialize user profile.');
    }

    // 2. Store Google refresh token if provided
    if (refreshToken) {
      try {
          const { error: dbError } = await supabase.from('user_keys').upsert(
            {
              user_id: uid,
              google_refresh_token: encryptToken(refreshToken, encryptionSecret),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id' }
          );

          if (dbError) {
            console.error('Supabase DB Error saving refresh token:', {
              message: dbError.message,
              code: dbError.code,
            });
          }
      } catch (dbError) {
        console.warn('Failed to store refresh token:', {
          message: dbError instanceof Error ? dbError.message : 'Unknown error',
        });
      }
    }

    const now = Math.floor(Date.now() / 1000);
    const supabaseToken = signJwt({
      aud: 'authenticated',
      role: 'authenticated',
      sub: uid,
      email: userInfo.email,
      iat: now,
      exp: now + (24 * 60 * 60),
    }, supabaseJwtSecret);

    return res.status(200).json({
      access_token: accessToken,
      supabase_token: supabaseToken,
      user: {
        uid,
        email: userInfo.email,
        displayName: userInfo.name,
        photoURL: userInfo.picture,
      },
    });
  } catch (error) {
    console.error('Auth Handler Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return res.status(500).json({
      error: 'Failed to exchange Google authorization code',
    });
  }
}
