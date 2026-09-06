const viteEnv = typeof import.meta.env === 'undefined' ? undefined : {
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
};
const runtimeEnv = typeof process !== 'undefined' ? process.env : undefined;

export const resolveSupabaseConfig = (
  clientEnv?: Partial<ImportMetaEnv>,
  serverEnv?: Partial<NodeJS.ProcessEnv>
) => ({
  url: clientEnv?.VITE_SUPABASE_URL ?? serverEnv?.SUPABASE_URL ?? serverEnv?.VITE_SUPABASE_URL,
  key: clientEnv?.VITE_SUPABASE_ANON_KEY ?? serverEnv?.SUPABASE_ANON_KEY ?? serverEnv?.VITE_SUPABASE_ANON_KEY,
});

const resolvedConfig = resolveSupabaseConfig(viteEnv, runtimeEnv);

export const resolvedSupabaseUrl = resolvedConfig.url;
export const resolvedSupabaseKey = resolvedConfig.key;
export const supabaseUrl = resolvedSupabaseUrl || 'http://127.0.0.1';
export const supabaseKey = resolvedSupabaseKey || 'public-anon-key-placeholder';
export const SUPABASE_SESSION_STORAGE_KEY = 'jozor-supabase-auth';
export const JOZOR_SUPABASE_TOKEN_KEY = 'jozor_supabase_token';

export const assertSupabaseConfig = () => {
  if (!resolvedSupabaseUrl || !resolvedSupabaseKey) {
    console.error('Supabase credentials missing! Check your .env file.');
    if (typeof window !== 'undefined') {
      throw new Error('Supabase credentials missing.');
    }
  }
};

export const createSupabaseAuthHeaders = (token?: string): Record<string, string> => {
  const headers: Record<string, string> = { apikey: supabaseKey };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
};
