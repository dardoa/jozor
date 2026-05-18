import CryptoJS from 'crypto-js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolvedSupabaseKey, resolvedSupabaseUrl } from '../services/supabaseConfig';

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;
let directAuthClient: SupabaseClient | null = null;

export interface AuthenticatedUser {
    uid: string;
    email: string;
    token?: string;
    type?: 'internal';
}

/**
 * Creates a Supabase client instance for a given authenticated user.
 * Strictly requires an 'internal' JWT issued by our auth server.
 */
export function createSupabaseClientForUser(user: { uid: string; email: string | null | undefined; token?: string; type?: 'internal' }): SupabaseClient {
    if (!resolvedSupabaseUrl || !resolvedSupabaseKey) {
        throw new Error('Supabase environment variables are not configured');
    }

    if (!user.token || user.type !== 'internal') {
        throw new Error('Action requires a valid internal Supabase JWT');
    }

    return createClient(resolvedSupabaseUrl, resolvedSupabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
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

        const base64UrlDecode = (str: string) => {
            let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
            // Pad base64 string
            while (b64.length % 4) {
                b64 += '=';
            }
            return atob(b64);
        };

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
    } catch {
        return null;
    }
}

function getSupabaseAuthClient(): SupabaseClient | null {
    if (!resolvedSupabaseUrl || !resolvedSupabaseKey) {
        return null;
    }

    directAuthClient ??= createClient(resolvedSupabaseUrl, resolvedSupabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });

    return directAuthClient;
}

/**
 * Validates the Supabase JWT used by our runtime APIs.
 */
export async function authenticateUser(authHeader?: string): Promise<AuthenticatedUser | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.split(' ')[1];

    const internalUser = verifyInternalToken(token);
    if (internalUser) {
        return internalUser;
    }

    const supabaseClient = getSupabaseAuthClient();
    if (!supabaseClient) {
        return null;
    }

    try {
        const { data, error } = await supabaseClient.auth.getUser(token);
        if (error || !data.user) {
            return null;
        }

        return {
            uid: data.user.id,
            email: data.user.email ?? '',
            token,
            type: 'internal',
        };
    } catch {
        return null;
    }
}
