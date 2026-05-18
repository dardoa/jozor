import * as React from 'react';
import { useEffect, useRef } from 'react';
import { useAppStore } from '../store/useAppStore';
import { useSessionBootstrap } from '../hooks/auth/useSessionBootstrap';
import { useConsistency } from '../hooks/sync/useConsistency';
import { useGeocodingSync } from '../features/geography';
import { useNotifications } from '../hooks/sync/useNotifications';
import { useRealtimeNotifications } from '../hooks/sync/useRealtimeNotifications';
import { useWebPush } from '../hooks/sync/useWebPush';
import { AppUIManager } from './AppUIManager';

const BootstrapSplash: React.FC = () => (
  <div className="flex h-screen items-center justify-center bg-[var(--theme-bg)]">
    <div className="flex flex-col items-center gap-3 text-center">
      <div className="rounded-2xl bg-[var(--card-bg)] px-6 py-4 shadow-[var(--shadow-sm)]">
        <span className="text-2xl font-bold tracking-[0.18em] text-[var(--text-main)]">جذور</span>
      </div>
      <span className="text-xs font-medium tracking-[0.2em] text-[var(--text-muted)]">SESSION BOOTSTRAP</span>
    </div>
  </div>
);

export const AppStateManager: React.FC = () => {
  useConsistency();
  useGeocodingSync();
  useNotifications();
  useWebPush();
  useSessionBootstrap();

  const user = useAppStore(state => state.user);
  const currentTreeId = useAppStore(state => state.currentTreeId);
  const authLoading = useAppStore(state => state.authLoading);
  const syncState = useAppStore(state => state.syncStatus.state);
  
  const hasLoggedUidAvailabilityRef = useRef(false);
  const hasLoggedGateReleaseRef = useRef(false);
  
  useRealtimeNotifications(user, currentTreeId);

  const shouldShowBootstrapSplash = !user?.uid && authLoading;

  useEffect(() => {
    if (user?.uid && !hasLoggedUidAvailabilityRef.current) {
      hasLoggedUidAvailabilityRef.current = true;
      console.info('[AppStateManager] Session UID became available.', {
        uid: user.uid,
        authLoading,
        syncState,
      });
    }
  }, [user?.uid, authLoading, syncState]);

  useEffect(() => {
    if (!shouldShowBootstrapSplash && !hasLoggedGateReleaseRef.current) {
      hasLoggedGateReleaseRef.current = true;
      console.info('[AppStateManager] Bootstrap gate released. Rendering AppUIManager.', {
        hasUserUid: Boolean(user?.uid),
        authLoading,
        syncState,
      });
    }
  }, [shouldShowBootstrapSplash, user?.uid, authLoading, syncState]);

  if (shouldShowBootstrapSplash) {
    return <BootstrapSplash />;
  }

  return <AppUIManager />;
};
