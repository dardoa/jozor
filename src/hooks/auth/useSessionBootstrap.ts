import { useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { EMPTY_STRING } from '../../constants';
import { useAppStore } from '../../store/useAppStore';
import {
  clearSupabaseInstances,
  mapSupabaseUserToUserProfile,
} from '../../services/supabaseClient';
import { authTokenService } from '../../services/authTokenService';
import { supabaseAuthService } from '../../services/supabaseAuthService';
import { claimCollaboratorMemberships } from '../../services/supabaseTreeAccessService';
import { fetchUserProfile, fetchAiMonthlyUsage } from '../../services/supabaseProfileService';
import { dismissNativeSplash } from '../../utils/nativeSplash';

const SESSION_BOOTSTRAP_TIMEOUT_MS = 6000;

/**
 * Applies the current Supabase session to the auth slice so refresh restores
 * the same auth lifecycle path as interactive sign-in/sign-out events.
 *
 * Using the slice actions here keeps notification hydration and token state
 * consistent with the rest of the store instead of bypassing them with raw
 * `setState` writes.
 *
 * @param session - The current Supabase session, or null when signed out
 */
const applySessionToStore = async (session: Session | null) => {
  const store = useAppStore.getState();

  if (useAppStore.getState().isE2E) {
    useAppStore.setState({ authLoading: false });
    return;
  }

  if (!session?.user) {
    authTokenService.setStoredSupabaseToken(null);
    clearSupabaseInstances();
    store.setUser(null);
    store.setSupabaseAccessToken(null);
    store.setSyncStatus({
      ...store.syncStatus,
      state: 'offline',
      supabaseStatus: 'idle',
      errorMessage: undefined,
      lastErrorCategory: undefined,
      lastErrorAt: null,
      lastErrorRetryable: undefined,
    });
    // No user session → dismiss the native splash immediately so login screen can show
    dismissNativeSplash();
    store.setAuthLoading(false);
    return;
  }

  const token = session.access_token ?? null;
  authTokenService.setStoredSupabaseToken(token);

  const user = mapSupabaseUserToUserProfile(session.user);
  performance.mark('diagnostic-2-uid-available');
  if (token) {
    user.supabaseToken = token;
  }

  // OPTIMISTIC AUTH RELEASE: 
  // We set the user and drop the loading splash immediately.
  // This unblocks useAuthInit to start fetching the tree while we refine metadata in the background.
  store.setUser(user);
  store.setSupabaseAccessToken(token);
  store.setSyncStatus({
    ...store.syncStatus,
    state: 'synced',
    supabaseStatus: 'idle',
    errorMessage: undefined,
    lastErrorCategory: undefined,
    lastErrorAt: null,
    lastErrorRetryable: undefined,
  });
  // DO NOT set authLoading to false here. Let executeAuthInitPlan handle it after tree is loaded!

  // BACKGROUND PARALLEL REFINEMENT:
  // Profile metadata, AI monthly usage, and collaborator memberships are fetched concurrently.
  // Failure of these is non-critical for core app functionality (tree loading).
  try {
    const email = user.email || EMPTY_STRING;

    const [profileResult, usageResult, membershipsResult] = await Promise.allSettled([
      fetchUserProfile(user.uid, email, user.supabaseToken),
      fetchAiMonthlyUsage(user.uid, email, user.supabaseToken),
      email ? claimCollaboratorMemberships(user.uid, email, user.supabaseToken) : Promise.resolve(0)
    ]);

    // Apply metadata refinements if successful
    let refinedMetadata = { ...user.metadata };
    let resolvedTier: 'free' | 'pro' | 'family' = 'free';

    if (profileResult.status === 'fulfilled' && profileResult.value) {
      refinedMetadata = { ...refinedMetadata, ...profileResult.value.metadata };
      resolvedTier = profileResult.value.tier || 'free';
      store.setSubscriptionTier(resolvedTier);
    }

    if (usageResult.status === 'fulfilled' && usageResult.value) {
      const remaining = Math.max(0, usageResult.value.cloud_requests_limit - usageResult.value.cloud_requests_used);
      store.setAiCloudQuotaRemaining(remaining);
    } else {
      store.setAiCloudQuotaRemaining(resolvedTier === 'family' ? 9999 : (resolvedTier === 'pro' ? 30 : 0));
    }

    if (profileResult.status === 'fulfilled' || membershipsResult.status === 'fulfilled') {
      store.setUser({
        ...user,
        metadata: refinedMetadata
      });
    }

    if (membershipsResult.status === 'rejected') {
      console.warn('Silent failure: claimCollaboratorMemberships failed in background.', membershipsResult.reason);
    }
  } catch (error) {
    console.warn('Failed to refine user metadata in background:', error);
  }
};

export const useSessionBootstrap = () => {
  useEffect(() => {
    let active = true;
    let authEventHandled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    useAppStore.getState().setAuthLoading(true);
    useAppStore.getState().setSyncStatus({
      ...useAppStore.getState().syncStatus,
      state: 'checking',
      supabaseStatus: 'idle',
      errorMessage: undefined,
      lastErrorCategory: undefined,
      lastErrorAt: null,
      lastErrorRetryable: undefined,
    });

    const handleAuthSession = async (session: Session | null) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      performance.mark('diagnostic-1-auth-session-available');
      performance.mark('jozor-session-start');
      authEventHandled = true;
      await applySessionToStore(session);
    };

    timeoutId = setTimeout(() => {
      if (!active || authEventHandled) return;

      console.warn('Supabase session bootstrap timed out. Releasing app into offline mode.');
      const store = useAppStore.getState();
      store.setSyncStatus({
        ...store.syncStatus,
        state: 'offline',
        supabaseStatus: 'error',
        errorMessage: 'Supabase session bootstrap timed out. Working locally until auth recovers.',
        lastErrorCategory: 'AUTH',
        lastErrorAt: new Date(),
        lastErrorRetryable: true,
      });
      dismissNativeSplash();
      store.setAuthLoading(false);
    }, SESSION_BOOTSTRAP_TIMEOUT_MS);

    const {
      data: { subscription },
    } = supabaseAuthService.onAuthStateChange((_event, session) => {
      if (!active) return;
      void handleAuthSession(session);
    });

    void supabaseAuthService
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        if (!authEventHandled) {
          void handleAuthSession(data.session);
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.warn('Failed to restore Supabase session:', error);
        const store = useAppStore.getState();
        store.setSyncStatus({
          ...store.syncStatus,
          state: 'offline',
          supabaseStatus: 'error',
          errorMessage: error instanceof Error ? error.message : 'Failed to restore Supabase session.',
          lastErrorCategory: 'AUTH',
          lastErrorAt: new Date(),
          lastErrorRetryable: true,
        });
        dismissNativeSplash();
        store.setAuthLoading(false);
      });

    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, []);
};
