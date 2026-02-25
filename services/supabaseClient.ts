import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing! Check your .env file.');
  throw new Error('Supabase credentials missing.');
}

// Sandbox cache: map uniquely generated context keys to isolated Supabase client instances.
// This prevents cross-contamination of headers during rapidly fired parallel requests.
const clientInstances = new Map<string, SupabaseClient>();

/**
 * Custom fetch factory that creates an isolated interceptor mapping to a specific Auth context.
 */
const createAuthInterceptorFetch = (token?: string, uid?: string, email?: string) => {
  return (url: string | URL | Request, options?: RequestInit) => {
    const headers = new Headers(options?.headers);

    // 1. Secure approach: Use standard Authorization header with server-signed JWT
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
  };
};

/**
 * Creates and returns an isolated Supabase Client.
 */
const createIsolatedInstance = (token?: string): SupabaseClient => {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `sb-${Math.random().toString(36).substring(2, 12)}`
    },
    global: {
      fetch: createAuthInterceptorFetch(token) as any
    }
  });
};

/**
 * Unified way to get the Supabase client.
 * Generates an isolated client securely bound to the calling user context.
 */
export const getSupabase = (uid?: string, email?: string, token?: string) => {
  const cacheKey = token ? token : (uid && email ? `${uid}:${email.toLowerCase()}` : 'anonymous');

  if (!clientInstances.has(cacheKey)) {
    console.log(`[SupabaseClient] Initializing isolated client for context: ${cacheKey === 'anonymous' ? cacheKey : 'authenticated'}`);
    clientInstances.set(cacheKey, createIsolatedInstance(token));

    // Memory limit: Purge old instances if the map grows too large (e.g. lots of users logging in/out).
    if (clientInstances.size > 20) {
      const firstKey = clientInstances.keys().next().value;
      if (firstKey) clientInstances.delete(firstKey);
    }
  }

  return clientInstances.get(cacheKey)!;
};

export const getSupabaseWithAuth = (uid: string, email: string, token?: string) => getSupabase(uid, email, token);

// Initial lazy-loaded anonymous instance
export const supabase = getSupabase();

/**
 * Clears all cached Supabase client instances.
 * Must be called on user logout to prevent stale authenticated instances
 * from persisting across sessions, which causes Multiple GoTrueClient warnings.
 */
export const clearSupabaseInstances = (): void => {
  clientInstances.clear();
  console.log('[SupabaseClient] All instances cleared on logout.');
};
