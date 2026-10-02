
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
    vi.resetAllMocks();
    vi.resetModules();
    localStorage.clear();
    signOutMock.mockResolvedValue({ error: null });
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
    expect(stopAutoRefreshMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
    expect(setStoredSupabaseTokenMock).toHaveBeenCalledWith(null);
    for (const suffix of ['', '-code-verifier', '-user']) expect(localStorage.getItem('jozor-supabase-auth' + suffix)).toBeNull();
    expect(localStorage.getItem('unrelated-preference')).toBe('keep');
  });
  it('finishes a bounded local logout and clears keys again after a late SDK operation', async () => {
    vi.useFakeTimers();
    localStorage.setItem('jozor-supabase-auth', JSON.stringify({ user: { id: 'deleted' } }));
    let finish!: () => void;
    signOutMock.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const { supabaseAuthService } = await import('../supabaseAuthService');
    const logout = supabaseAuthService.forgetDeletedAccount();
    await vi.advanceTimersByTimeAsync(3000);
    await expect(logout).resolves.toBeUndefined();
    localStorage.setItem('jozor-supabase-auth', JSON.stringify({ user: { id: 'deleted' }, access_token: 'late-write' }));
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(localStorage.getItem('jozor-supabase-auth')).toBeNull();
  });
  it.each(['password', 'signup', 'oauth'])('blocks %s until actual deletion teardown finishes, then allows retry', async method => {
    vi.useFakeTimers();
    let finish!: () => void;
    signOutMock.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    signInWithPasswordMock.mockResolvedValue({ data: { session: { access_token: 'new-token' } }, error: null });
    signUpMock.mockResolvedValue({ data: { session: { access_token: 'new-token' } }, error: null });
    signInWithOAuthMock.mockResolvedValue({ error: null });
    const { supabaseAuthService: service } = await import('../supabaseAuthService');
    const logout = service.forgetDeletedAccount();
    await vi.advanceTimersByTimeAsync(3000);
    await logout;
    const login = () => method === 'password' ? service.signInWithPassword('new@example.test', 'password')
      : method === 'signup' ? service.signUpWithPassword('new@example.test', 'password') : service.startGoogleSignIn();
    const pending = login();
    const outcome = pending.then(() => null, error => error as Error);
    await vi.advanceTimersByTimeAsync(3000);
    expect(await outcome).toBeInstanceOf(Error);
    expect((await outcome)?.message).toMatch(/pending|try again/i);
    expect(signInWithPasswordMock).not.toHaveBeenCalled();
    expect(signUpMock).not.toHaveBeenCalled();
    expect(signInWithOAuthMock).not.toHaveBeenCalled();
    finish();
    await vi.advanceTimersByTimeAsync(0);
    await login();
    if (method !== 'oauth') expect(setStoredSupabaseTokenMock).toHaveBeenLastCalledWith('new-token');
  });

  it.each([JSON.stringify({ user: { id: 'new-user' }, access_token: 'new-token' }), 'unrecognized-new-value'])(
    'preserves a different or unknown newer persisted identity during late cleanup', async newValue => {
      vi.useFakeTimers();
      localStorage.setItem('jozor-supabase-auth', JSON.stringify({ user: { id: 'deleted' } }));
      let finish!: () => void;
      signOutMock.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
      const { supabaseAuthService: service } = await import('../supabaseAuthService');
      const logout = service.forgetDeletedAccount();
      await vi.advanceTimersByTimeAsync(3000);
      await logout;
      localStorage.setItem('jozor-supabase-auth', newValue);
      localStorage.setItem('jozor_supabase_token', 'new-unknown-token');
      finish();
      await vi.advanceTimersByTimeAsync(0);
      expect(localStorage.getItem('jozor-supabase-auth')).toBe(newValue);
      expect(localStorage.getItem('jozor_supabase_token')).toBe('new-unknown-token');
    }
  );
  it('does not reject accepted deletion when browser storage access fails', async () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => { throw new Error('storage disabled'); });
    setStoredSupabaseTokenMock.mockImplementationOnce(() => { throw new Error('storage disabled'); });
    signOutMock.mockResolvedValueOnce({ error: null });
    const { supabaseAuthService } = await import('../supabaseAuthService');
    await expect(supabaseAuthService.forgetDeletedAccount()).resolves.toBeUndefined();
    expect(signOutMock).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('removes a late token only when its subject is the deleted identity', async () => {
    vi.useFakeTimers();
    localStorage.setItem('jozor-supabase-auth', JSON.stringify({ user: { id: 'deleted' } }));
    let finish!: () => void;
    signOutMock.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const { supabaseAuthService: service } = await import('../supabaseAuthService');
    const logout = service.forgetDeletedAccount();
    await vi.advanceTimersByTimeAsync(3000); await logout;
    setStoredSupabaseTokenMock.mockClear();
    localStorage.setItem('jozor_supabase_token', `header.${btoa(JSON.stringify({ sub: 'deleted' }))}.signature`);
    finish(); await vi.advanceTimersByTimeAsync(0);
    expect(setStoredSupabaseTokenMock).toHaveBeenCalledWith(null);
  });
  it('does not wipe unreadable storage or prevent retry after failed teardown', async () => {
    const remove = vi.spyOn(Storage.prototype, 'removeItem');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('unreadable'); });
    signOutMock.mockRejectedValueOnce(new Error('offline'));
    signInWithPasswordMock.mockResolvedValue({ data: { session: { access_token: 'new-token' } }, error: null });
    const { supabaseAuthService: service } = await import('../supabaseAuthService');
    await service.forgetDeletedAccount();
    expect(remove).not.toHaveBeenCalled();
    await service.signInWithPassword('new@example.test', 'password');
    expect(setStoredSupabaseTokenMock).toHaveBeenLastCalledWith('new-token');
  });
});

