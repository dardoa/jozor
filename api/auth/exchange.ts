import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import CryptoJS from 'crypto-js';

// Prefer non-VITE vars for Vercel/server; fallback to VITE_ for local dev
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const ENCRYPTION_SECRET = process.env.ENCRYPTION_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = 'postmessage';

// Make Supabase optional - only initialize if credentials are provided
const supabase = SUPABASE_URL && SUPABASE_SERVICE_ROLE
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE)
  : null;

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function signJwt(payload: any, secret: string) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = CryptoJS.HmacSHA256(encodedHeader + '.' + encodedPayload, secret);
  const encodedSignature = signature.toString(CryptoJS.enc.Base64)
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

function encryptToken(token: string, secret: string): string {
  return CryptoJS.AES.encrypt(token, secret).toString();
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Missing auth code' });
  }

  // Check for required secrets
  if (!SUPABASE_JWT_SECRET || !ENCRYPTION_SECRET) {
    console.error('Missing critical environment variables: SUPABASE_JWT_SECRET or ENCRYPTION_SECRET');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (tokens.error) {
      console.error('Google Token Exchange Error:', tokens);
      throw new Error(tokens.error_description || 'Failed to exchange code');
    }

    const { access_token, refresh_token } = tokens;

    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = await userRes.json();

    const uid = userInfo.sub;

    // 1. Store encrypted refresh token if Supabase is configured
    if (refresh_token && supabase) {
      try {
        const encryptedToken = encryptToken(refresh_token, ENCRYPTION_SECRET);
        const { error: dbError } = await supabase.from('user_keys').upsert(
          {
            user_id: uid,
            google_refresh_token: encryptedToken,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

        if (dbError) {
          console.error('Supabase DB Error:', dbError);
        }
      } catch (dbErr) {
        console.warn('Failed to store refresh token:', dbErr);
      }
    }

    // 2. Issue a secure JWT for the client to use with Supabase direct calls
    // This JWT allows the client to satisfy RLS using 'role', 'aud', and 'sub' claims.
    let jozor_token = '';
    if (SUPABASE_JWT_SECRET) {
      jozor_token = signJwt({
        aud: 'authenticated',      // Mandatory for Supabase
        role: 'authenticated',     // Mandatory for Supabase
        sub: uid,                  // Firebase UID
        email: userInfo.email,
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      }, SUPABASE_JWT_SECRET);
    }

    return res.status(200).json({
      access_token, // Google access token (for Drive API)
      supabase_token: jozor_token, // JWT for Supabase RLS
      user: {
        uid: userInfo.sub,
        email: userInfo.email,
        displayName: userInfo.name,
        photoURL: userInfo.picture,
      },
    });
  } catch (e: unknown) {
    console.error('Auth Handler Error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return res.status(500).json({ error: errorMessage });
  }
}
