import { getSupabaseWithAuth } from './supabaseClient';
import { authTokenService } from './authTokenService';

export const getStoredSupabaseToken = (): string | undefined => {
  return authTokenService.getStoredSupabaseTokenOrUndefined();
};

export const getTreeClient = (uid: string, email: string, token?: string) =>
  getSupabaseWithAuth(uid, email, token || getStoredSupabaseToken());
