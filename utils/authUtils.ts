import CryptoJS from 'crypto-js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logError } from './errorLogger';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
const FIREBASE_API_KEY = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export interface AuthenticatedUser {
    uid: string;
    email: string;
    token?: string;
    type?: 'internal' | 'firebase';
}

/**
 * Creates a Supabase client instance for a given authenticated user.
 * Strictly requires an 'internal' JWT issued by our auth server.
 */
export function createSupabaseClientForUser(user: { uid: string; email: string | null | undefined; token?: string; type?: 'internal' | 'firebase' }): SupabaseClient {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        throw new Error('Supabase environment variables are not configured');
    }

    if (!user.token || user.type !== 'internal') {
        throw new Error('Action requires a valid internal Supabase JWT');
    }

    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        global: {
            headers: {
                Authorization: `Bearer ${user.token}`,
            },
        },
    });
}

/**
 * Verifies our internal JWT signed with SUPABASE_JWT_SECRET.
 */
export function verifyInternalToken(token: string): AuthenticatedUser | null {
    if (!SUPABASE_JWT_SECRET) {
        console.warn('SUPABASE_JWT_SECRET is not set on the server');
        return null;
    }
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const [headerB64, payloadB64, signatureB64] = parts;

        // Verify signature
        const signature = CryptoJS.HmacSHA256(headerB64 + '.' + payloadB64, SUPABASE_JWT_SECRET);
        const expectedSignature = signature.toString(CryptoJS.enc.Base64)
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');

        if (signatureB64 !== expectedSignature) return null;

        const base64UrlDecode = (str: string) =>
            Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString();

        const payload = JSON.parse(base64UrlDecode(payloadB64));

        // Check expiration
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return null;
        }

        return {
            uid: payload.sub as string,
            email: payload.email as string,
            token,
            type: 'internal',
        };
    } catch (e) {
        return null;
    }
}

/**
 * Verifies a Firebase ID Token using the Identity Toolkit API.
 */
export async function verifyFirebaseToken(token: string): Promise<AuthenticatedUser | null> {
    if (!FIREBASE_API_KEY) {
        logError('VERIFY_FIREBASE_TOKEN', new Error('FIREBASE_API_KEY is not set on the server'), {
            showToast: false,
        });
        return null;
    }

    try {
        const res = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken: token }),
            }
        );

        if (!res.ok) {
            const text = await res.text();
            logError('VERIFY_FIREBASE_TOKEN', new Error(`Firebase token verification failed: ${text}`), {
                showToast: false,
            });
            return null;
        }

        const data = await res.json();
        if (data.users && data.users.length > 0) {
            const user = data.users[0];
            return {
                uid: user.localId as string,
                email: user.email as string,
            };
        }
        return null;
    } catch (error) {
        logError('VERIFY_FIREBASE_TOKEN', error, { showToast: false });
        return null;
    }
}

/**
 * Validates any supported token (Internal JWT or Firebase).
 */
export async function authenticateUser(authHeader?: string): Promise<AuthenticatedUser | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.split(' ')[1];

    // Try internal JWT first
    const internalUser = verifyInternalToken(token);
    if (internalUser) return internalUser;

    // Fallback to Firebase
    const firebaseUser = await verifyFirebaseToken(token);
    if (firebaseUser) return { ...firebaseUser, token, type: 'firebase' };
    return null;
}
