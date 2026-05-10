import { AuthClient, type User } from '@supabase/auth-js';
import type { PostgrestClient } from '@supabase/postgrest-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { UserProfile } from '../types';
import { logInfo } from '../utils/errorLogger';
import {
  SUPABASE_SESSION_STORAGE_KEY,
  assertSupabaseConfig,
  createSupabaseAuthHeaders,
  supabaseUrl,
} from './supabaseConfig';
import { authTokenService } from './authTokenService';
import { SupabaseRegistry } from './supabaseClientRegistry';

assertSupabaseConfig();

type SupabaseAuthAdapter = {
  auth: any;
};

const getSupabaseAuthAdapter = (): SupabaseAuthAdapter => {
  const globalKey = '__jozorSupabaseAuthAdapter';
  const globalScope = globalThis as typeof globalThis & {
    [globalKey]?: SupabaseAuthAdapter;
  };

  globalScope[globalKey] ??= {
    auth: new AuthClient({
      url: `${supabaseUrl}/auth/v1`,
      headers: createSupabaseAuthHeaders(),
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
      storageKey: SUPABASE_SESSION_STORAGE_KEY,
    }),
  };

  return globalScope[globalKey];
};

export const supabaseAuth = getSupabaseAuthAdapter();

/**
 * Unified way to get the lightweight Supabase client.
 * Generates an isolated client securely bound to the calling user context.
 */
export const getSupabase = (uid?: string, email?: string, token?: string): PostgrestClient =>
  SupabaseRegistry.getRest({ uid, email, token });

export const getSupabaseWithAuth = (uid: string, email: string, token?: string) => getSupabase(uid, email, token);

// Initial lazy-loaded anonymous instance
export const supabase = getSupabase();

/**
 * Unified way to get the full Supabase SDK client.
 */
export const getSupabaseFull = (uid?: string, email?: string, token?: string): SupabaseClient =>
  SupabaseRegistry.getSdk({ uid, email, token });

export const setStoredSupabaseToken = (token: string | null): void => {
  authTokenService.setStoredSupabaseToken(token);
};

export const mapSupabaseUserToUserProfile = (user: User): UserProfile => {
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const displayName =
    (typeof metadata.full_name === 'string' && metadata.full_name) ||
    (typeof metadata.name === 'string' && metadata.name) ||
    (typeof metadata.display_name === 'string' && metadata.display_name) ||
    user.email ||
    '';
  const photoURL =
    (typeof metadata.avatar_url === 'string' && metadata.avatar_url) ||
    (typeof metadata.picture === 'string' && metadata.picture) ||
    '';

  return {
    uid: user.id,
    displayName,
    email: user.email || '',
    photoURL,
    metadata,
  };
};

authTokenService.configureSessionTokenReader(async (): Promise<string | null> => {
  const {
    data: { session },
  } = await supabaseAuth.auth.getSession();

  return session?.access_token ?? null;
});

export const getSupabaseSessionAccessToken = () => authTokenService.getSupabaseSessionAccessToken();

/**
 * Clears all cached Supabase client instances.
 * Must be called on user logout to prevent stale authenticated instances
 * from persisting across sessions.
 */
export const clearSupabaseInstances = (): void => {
  SupabaseRegistry.clear();
  logInfo('supabaseClient clearSupabaseInstances', 'All instances cleared on logout.', {
    operationType: 'clear_supabase_clients'
  });
};
