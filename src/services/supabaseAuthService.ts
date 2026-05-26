import type { AuthChangeEvent, AuthError, Session } from '@supabase/supabase-js';
import { authTokenService } from './authTokenService';
import { supabaseAuth } from './supabaseClient';

const getCleanOrigin = () => window.location.origin.replace(/\/$/, '');

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

  getSession(): Promise<{ data: { session: Session | null }; error: AuthError | null }> {
    return supabaseAuth.auth.getSession();
  },

  onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
    return supabaseAuth.auth.onAuthStateChange(callback);
  },
};
