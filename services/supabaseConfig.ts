const viteEnv = (typeof import.meta !== 'undefined' ? import.meta.env : undefined) as ImportMetaEnv | undefined;

export const resolvedSupabaseUrl = viteEnv?.VITE_SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
export const resolvedSupabaseKey = viteEnv?.VITE_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
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
