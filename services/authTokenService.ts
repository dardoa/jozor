import { JOZOR_SUPABASE_TOKEN_KEY } from './supabaseConfig';

type SupabaseSessionTokenReader = () => Promise<string | null>;

let sessionTokenReader: SupabaseSessionTokenReader | null = null;

const hasBrowserStorage = () => typeof window !== 'undefined' && typeof localStorage !== 'undefined';

export const authTokenService = {
  configureSessionTokenReader(reader: SupabaseSessionTokenReader): void {
    sessionTokenReader = reader;
  },

  getStoredSupabaseToken(): string | null {
    if (!hasBrowserStorage()) return null;
    return localStorage.getItem(JOZOR_SUPABASE_TOKEN_KEY);
  },

  getStoredSupabaseTokenOrUndefined(): string | undefined {
    return this.getStoredSupabaseToken() || undefined;
  },

  setStoredSupabaseToken(token: string | null): void {
    if (!hasBrowserStorage()) return;

    if (token) {
      localStorage.setItem(JOZOR_SUPABASE_TOKEN_KEY, token);
      return;
    }

    localStorage.removeItem(JOZOR_SUPABASE_TOKEN_KEY);
  },

  async getSupabaseSessionAccessToken(): Promise<string | null> {
    return sessionTokenReader ? sessionTokenReader() : null;
  },

  async getPreferredSupabaseToken(customToken?: string | null): Promise<string | null> {
    return customToken || this.getStoredSupabaseToken() || await this.getSupabaseSessionAccessToken();
  },
};

