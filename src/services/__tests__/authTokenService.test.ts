
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JOZOR_SUPABASE_TOKEN_KEY } from '../supabaseConfig';
import { authTokenService } from '../authTokenService';

describe('authTokenService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('owns Supabase token storage reads and writes', () => {
    authTokenService.setStoredSupabaseToken('token-1');

    expect(localStorage.getItem(JOZOR_SUPABASE_TOKEN_KEY)).toBe('token-1');
    expect(authTokenService.getStoredSupabaseToken()).toBe('token-1');
    expect(authTokenService.getStoredSupabaseTokenOrUndefined()).toBe('token-1');

    authTokenService.setStoredSupabaseToken(null);

    expect(localStorage.getItem(JOZOR_SUPABASE_TOKEN_KEY)).toBeNull();
    expect(authTokenService.getStoredSupabaseToken()).toBeNull();
    expect(authTokenService.getStoredSupabaseTokenOrUndefined()).toBeUndefined();
  });

  it('prefers explicit tokens before stored or session tokens', async () => {
    const sessionReader = vi.fn(async () => 'session-token');
    authTokenService.configureSessionTokenReader(sessionReader);
    authTokenService.setStoredSupabaseToken('stored-token');

    await expect(authTokenService.getPreferredSupabaseToken('explicit-token')).resolves.toBe('explicit-token');
    expect(sessionReader).not.toHaveBeenCalled();
  });

  it('falls back from storage to the configured Supabase session reader', async () => {
    const sessionReader = vi.fn(async () => 'session-token');
    authTokenService.configureSessionTokenReader(sessionReader);

    await expect(authTokenService.getPreferredSupabaseToken()).resolves.toBe('session-token');
    expect(sessionReader).toHaveBeenCalledTimes(1);
  });
});


