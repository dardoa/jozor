
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithOAuthMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const signUpMock = vi.fn();
const resetPasswordForEmailMock = vi.fn();
const signOutMock = vi.fn();
const stopAutoRefreshMock = vi.fn();
const getSessionMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const setStoredSupabaseTokenMock = vi.fn();

vi.mock('../authTokenService', () => ({
  authTokenService: {
    setStoredSupabaseToken: setStoredSupabaseTokenMock,
  },
}));

vi.mock('../supabaseClient', () => ({
  supabaseAuth: {
    auth: {
      signInWithOAuth: signInWithOAuthMock,
      signInWithPassword: signInWithPasswordMock,
      signUp: signUpMock,
      resetPasswordForEmail: resetPasswordForEmailMock,
      signOut: signOutMock,
      stopAutoRefresh: stopAutoRefreshMock,
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  },
}));

describe('supabaseAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

  it('normalizes password login errors to non-Firebase copy', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { session: null },
      error: new Error('Invalid login credentials'),
    });

    const { supabaseAuthService } = await import('../supabaseAuthService');

    await expect(supabaseAuthService.signInWithPassword('a@b.com', 'bad-pass')).rejects.toThrow(
      'Incorrect email or password.'
    );
  });

  it('preserves deep-link redirectTo when starting Google sign-in', async () => {
    signInWithOAuthMock.mockResolvedValue({ error: null });

    const { supabaseAuthService } = await import('../supabaseAuthService');

    await supabaseAuthService.startGoogleSignIn('/person/person-1');

    expect(signInWithOAuthMock).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: '/person/person-1',
        queryParams: {
          prompt: 'select_account',
        },
      },
    });
  });

  it('forgets a deleted account locally even when native sign-out is offline', async () => {
    for (const suffix of ['', '-code-verifier', '-user']) localStorage.setItem('jozor-supabase-auth' + suffix, 'old-secret');
    localStorage.setItem('unrelated-preference', 'keep');
    signOutMock.mockRejectedValue(new Error('offline'));
    const { supabaseAuthService } = await import('../supabaseAuthService');
    await expect(supabaseAuthService.forgetDeletedAccount()).resolves.toBeUndefined();
    expect(stopAutoRefreshMock).toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
    expect(setStoredSupabaseTokenMock).toHaveBeenCalledWith(null);
    for (const suffix of ['', '-code-verifier', '-user']) expect(localStorage.getItem('jozor-supabase-auth' + suffix)).toBeNull();
    expect(localStorage.getItem('unrelated-preference')).toBe('keep');
  });
  it('finishes a bounded local logout and clears keys again after a late SDK operation', async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    signOutMock.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const { supabaseAuthService } = await import('../supabaseAuthService');
    const logout = supabaseAuthService.forgetDeletedAccount();
    await vi.advanceTimersByTimeAsync(3000);
    await expect(logout).resolves.toBeUndefined();
    localStorage.setItem('jozor-supabase-auth', 'late-write');
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(localStorage.getItem('jozor-supabase-auth')).toBeNull();
  });
  it('does not reject accepted deletion when browser storage access fails', async () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('storage disabled'); });
    setStoredSupabaseTokenMock.mockImplementationOnce(() => { throw new Error('storage disabled'); });
    signOutMock.mockResolvedValueOnce({ error: null });
    const { supabaseAuthService } = await import('../supabaseAuthService');
    await expect(supabaseAuthService.forgetDeletedAccount()).resolves.toBeUndefined();
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
  });
});

