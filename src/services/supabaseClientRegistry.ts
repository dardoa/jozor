import { PostgrestClient } from '@supabase/postgrest-js';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logInfo } from '../utils/errorLogger';
import {
  createSupabaseAuthHeaders,
  supabaseKey,
  supabaseUrl,
} from './supabaseConfig';

type ClientContext = {
  uid?: string;
  email?: string;
  token?: string;
};

const MAX_CACHED_CLIENTS = 20;

const createAuthInterceptorFetch = (token?: string) => {
  return (url: string | URL | Request, options?: RequestInit) => {
    const headers = new Headers(options?.headers);

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return fetch(url, { ...options, headers });
  };
};

const createCacheKey = ({ uid, email, token }: ClientContext): string =>
  token ? token : (uid && email ? `${uid}:${email.toLowerCase()}` : 'anonymous');

const pruneFirstEntry = <T>(map: Map<string, T>) => {
  if (map.size <= MAX_CACHED_CLIENTS) return;
  const firstKey = map.keys().next().value;
  if (firstKey) map.delete(firstKey);
};

class SupabaseClientRegistry {
  private restClients = new Map<string, PostgrestClient>();
  private sdkClients = new Map<string, SupabaseClient>();
  private adminSdk: SupabaseClient | null = null;

  getRest(context: ClientContext = {}): PostgrestClient {
    const cacheKey = createCacheKey(context);

    if (!this.restClients.has(cacheKey)) {
      logInfo('SupabaseRegistry getRest', 'Initializing isolated REST client instance.', {
        operationType: 'init_supabase_rest_client',
        authContext: cacheKey === 'anonymous' ? 'anonymous' : 'authenticated',
      });
      this.restClients.set(cacheKey, new PostgrestClient(`${supabaseUrl}/rest/v1`, {
        headers: createSupabaseAuthHeaders(context.token),
        fetch: createAuthInterceptorFetch(context.token) as typeof fetch,
      }));
      pruneFirstEntry(this.restClients);
    }

    return this.restClients.get(cacheKey)!;
  }

  getSdk(context: ClientContext = {}): SupabaseClient {
    const cacheKey = createCacheKey(context);

    if (!this.sdkClients.has(cacheKey)) {
      this.sdkClients.set(cacheKey, createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storageKey: `sb-full-${Math.random().toString(36).substring(2, 12)}`,
        },
        global: {
          headers: createSupabaseAuthHeaders(context.token),
          fetch: createAuthInterceptorFetch(context.token) as typeof fetch,
        },
      }));
      pruneFirstEntry(this.sdkClients);
    }

    const client = this.sdkClients.get(cacheKey)!;
    if (context.token) {
      client.realtime.setAuth(context.token);
    }

    return client;
  }

  getAdminSdk(url: string, serviceRoleKey: string): SupabaseClient {
    if (!this.adminSdk) {
      this.adminSdk = createClient(url, serviceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    }

    return this.adminSdk;
  }

  clear(): void {
    this.restClients.clear();
    this.sdkClients.clear();
    this.adminSdk = null;
    logInfo('SupabaseRegistry clear', 'All Supabase client instances cleared.', {
      operationType: 'clear_supabase_clients',
    });
  }
}

export const SupabaseRegistry = new SupabaseClientRegistry();
