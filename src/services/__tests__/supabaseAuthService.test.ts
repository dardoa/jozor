// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';

const signInWithOAuthMock = vi.fn();
const signInWithPasswordMock = vi.fn();
const signUpMock = vi.fn();
const resetPasswordForEmailMock = vi.fn();
const signOutMock = vi.fn();
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
      getSession: getSessionMock,
      onAuthStateChange: onAuthStateChangeMock,
    },
  },
}));

describe('supabaseAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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
});

