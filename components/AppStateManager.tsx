import * as React from 'react';
import { useEffect } from 'react';

import { useAppStore } from '../store/useAppStore';
import { useAppOrchestration } from '../hooks/useAppOrchestration';
import { useConsistency } from '../hooks/useConsistency';
import { subscribeToAuthState, getIdToken } from '../services/firebaseAuthService';
import { googleAuthService } from '../services/googleService';
import { AppUIManager } from './AppUIManager';
import { UserProfile } from '../types';

interface AppStateManagerProps {
  sharedTreeParams: { ownerUid: string; fileId: string } | null;
  setSharedTreeParams: (value: { ownerUid: string; fileId: string } | null) => void;
}

export const AppStateManager: React.FC<AppStateManagerProps> = ({
  sharedTreeParams,
  setSharedTreeParams,
}) => {
  // Background Data Integrity Service
  useConsistency();

  // Sync theme and language to document root (DOM concern but derived from state)
  const treeSettings = useAppStore(state => state.treeSettings);
  const darkMode = useAppStore(state => state.darkMode);
  const language = useAppStore(state => state.language);

  useEffect(() => {
    const root = document.documentElement;

    root.classList.remove('theme-modern', 'theme-vintage', 'theme-blueprint');
    root.classList.add(`theme-${treeSettings.theme}`);

    root.classList.toggle('dark', darkMode);

    const dir = language === 'ar' ? 'rtl' : 'ltr';
    root.setAttribute('dir', dir);
    root.setAttribute('lang', language);
  }, [treeSettings.theme, darkMode, language]);

  // Auth Subscription
  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (user) => {
      if (user) {
        // Fetch ID Token once user is confirmed
        const idToken = await getIdToken();

        // Try to restore Supabase JWT from session storage
        await googleAuthService.ensureTokenValid(false);
        const persistedSupabaseToken = sessionStorage.getItem('jozor_supabase_token');
        if (persistedSupabaseToken) {
          user.supabaseToken = persistedSupabaseToken;
        }

        // Also fetch Supabase profile metadata
        try {
          const { fetchUserProfile } = await import('../services/supabaseTreeService');
          const profile = await fetchUserProfile(user.uid, user.email || '', user.supabaseToken);
          if (profile) {
            user.metadata = profile.metadata;
          }
        } catch (e: unknown) {
          console.warn('Failed to fetch user metadata during init:', e);
        }

        useAppStore.setState({ user, idToken });
      } else {
        useAppStore.setState({ user: null, idToken: null });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <AppUIManager
      sharedTreeParams={sharedTreeParams}
      setSharedTreeParams={setSharedTreeParams}
    />
  );
};
