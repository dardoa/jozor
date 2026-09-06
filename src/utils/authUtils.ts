import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolvedSupabaseKey, resolvedSupabaseUrl } from '../services/supabaseConfig.js';
import { verifyInternalToken as verifyInternalJwt } from '../../shared/auth/internalJwt.js';
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

    const internalUser = await verifyInternalJwt(token, process.env.SUPABASE_JWT_SECRET);
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
