import type { AuthChangeEvent, AuthError, Session } from '@supabase/supabase-js';
import { authTokenService } from './authTokenService';
import { supabaseAuth } from './supabaseClient';
import { JOZOR_SUPABASE_TOKEN_KEY, SUPABASE_SESSION_STORAGE_KEY } from './supabaseConfig';

const getCleanOrigin = () => window.location.origin.replace(/\/$/, '');

let deletionTeardown: Promise<void> | null = null;

const readStorage = (key: string): string | null | undefined => {
  try { return localStorage.getItem(key); } catch { return undefined; }
};

const sessionIdentity = (raw: string | null | undefined): string | undefined => {
  try {
    const value = JSON.parse(raw ?? 'null') as { user?: { id?: unknown } } | null;
    return typeof value?.user?.id === 'string' ? value.user.id : undefined;
  } catch { return undefined; }
};

const tokenIdentity = (raw: string | null | undefined): string | undefined => {
  try {
    const payload = raw?.split('.')[1];
    if (!payload) return undefined;
    const value = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as { sub?: unknown };
    return typeof value.sub === 'string' ? value.sub : undefined;
  } catch { return undefined; }
};

const settleWithinTimeout = async (operation: Promise<void>): Promise<boolean> => {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation.then(() => true),
      new Promise<boolean>(resolve => { timeout = setTimeout(() => resolve(false), 3000); }),
    ]);
  } finally { clearTimeout(timeout); }
};

const waitForDeletionTeardown = async (): Promise<void> => {
  while (deletionTeardown) {
    if (!await settleWithinTimeout(deletionTeardown)) {
      throw new Error('Account sign-out is still pending. Please try again.');
    }
  }
};

const normalizeSupabaseAuthError = (error: unknown): string => {
  if (error instanceof Error) {
    const message = error.message.trim();
    const lower = message.toLowerCase();

    if (lower.includes('invalid login credentials')) return 'Incorrect email or password.';
    if (lower.includes('email not confirmed')) return 'Please confirm your email address before signing in.';
    if (lower.includes('user already registered') || lower.includes('already registered')) return 'This email is already registered.';
    if (lower.includes('password should be at least')) return 'Password must be at least 6 characters.';
    if (lower.includes('invalid email')) return 'Please enter a valid email address.';
    if (lower.includes('signup is disabled')) return 'Sign up is currently unavailable.';
    if (lower.includes('oauth') && lower.includes('cancel')) return 'Google sign-in was cancelled.';
    if (message) return message;
  }

  return 'Authentication failed. Please try again.';
};

const wrapAuthError = (error: unknown): never => {
  throw new Error(normalizeSupabaseAuthError(error));
};

export const supabaseAuthService = {
  normalizeAuthError: normalizeSupabaseAuthError,

  async startGoogleSignIn(returnTo?: string): Promise<void> {
    await waitForDeletionTeardown();
    const redirectTo = returnTo || getCleanOrigin();

    const { error } = await supabaseAuth.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      wrapAuthError(error);
    }
  },

  async signInWithPassword(email: string, password: string): Promise<Session | null> {
    await waitForDeletionTeardown();
    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      wrapAuthError(error);
    }

    authTokenService.setStoredSupabaseToken(data.session?.access_token ?? null);
    return data.session ?? null;
  },

  async signUpWithPassword(
    email: string,
    password: string,
    displayName?: string
  ): Promise<Session | null> {
    await waitForDeletionTeardown();
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        data: displayName ? { display_name: displayName } : undefined,
        emailRedirectTo: getCleanOrigin(),
      },
    });

    if (error) {
      wrapAuthError(error);
    }

    authTokenService.setStoredSupabaseToken(data.session?.access_token ?? null);
    return data.session ?? null;
  },

  async sendPasswordReset(email: string): Promise<void> {
    const { error } = await supabaseAuth.auth.resetPasswordForEmail(email, {
      redirectTo: getCleanOrigin(),
    });

    if (error) {
      wrapAuthError(error);
    }
  },

  async signOut(): Promise<void> {
    const { error } = await supabaseAuth.auth.signOut();
    authTokenService.setStoredSupabaseToken(null);

    if (error) {
      wrapAuthError(error);
    }
  },

  async forgetDeletedAccount(): Promise<void> {
    if (!deletionTeardown) {
      const keys = ['', '-code-verifier', '-user'].map(suffix => SUPABASE_SESSION_STORAGE_KEY + suffix);
      const captured = new Map(keys.map(key => [key, readStorage(key)]));
      const deletedIdentity = sessionIdentity(captured.get(SUPABASE_SESSION_STORAGE_KEY));
      const capturedToken = readStorage(JOZOR_SUPABASE_TOKEN_KEY);
      const clearLocal = () => {
        const currentSession = readStorage(SUPABASE_SESSION_STORAGE_KEY);
        const sameIdentity = deletedIdentity !== undefined && sessionIdentity(currentSession) === deletedIdentity;
        const foreignSession = currentSession !== null && currentSession !== captured.get(SUPABASE_SESSION_STORAGE_KEY) && !sameIdentity;
        if (foreignSession || currentSession === undefined) return;
        for (const key of keys) {
          const current = readStorage(key);
          if (current !== undefined && (current === captured.get(key) || (key === SUPABASE_SESSION_STORAGE_KEY && sameIdentity))) {
            try { localStorage.removeItem(key); } catch { /* Storage may be unavailable. */ }
          }
        }
        const currentToken = readStorage(JOZOR_SUPABASE_TOKEN_KEY);
        if (currentToken !== undefined && (currentToken === null || currentToken === capturedToken
          || (deletedIdentity !== undefined && tokenIdentity(currentToken) === deletedIdentity))) {
          try { authTokenService.setStoredSupabaseToken(null); } catch { /* Server revocation already succeeded. */ }
        }
      };
      // Clear the revoked identity before SDK logout, but retain its refresh lifecycle.
      clearLocal();
      const operation = Promise.resolve().then(async () => {
        try { await supabaseAuth.auth.signOut({ scope: 'local' }); }
        catch { /* Server revocation is already durable. */ }
        finally { clearLocal(); }
      }).finally(() => { if (deletionTeardown === operation) deletionTeardown = null; });
      deletionTeardown = operation;
    }
    await settleWithinTimeout(deletionTeardown);
  },

  getSession(): Promise<{ data: { session: Session | null }; error: AuthError | null }> {
    return supabaseAuth.auth.getSession();
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabaseAuth.auth.onAuthStateChange(callback);
  },
};
