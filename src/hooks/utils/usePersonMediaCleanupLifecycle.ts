import { useEffect, useRef } from 'react';
import { canEditTreeContext } from '../../domain/treePermissionPolicy';
import { useAppStore } from '../../store/useAppStore';
import { logError } from '../../utils/errorLogger';
import { defaultPersonMediaAssetResolver } from '../../services/personMediaAssetService';
import {
  flushPersonMediaCleanupQueue,
  isPersonMediaStorageTargetReferenced,
} from '../../services/personMediaCleanupQueue';

export function usePersonMediaCleanupLifecycle(): void {
  const user = useAppStore((state) => state.user);
  const treeId = useAppStore((state) => state.currentTreeId);
  const role = useAppStore((state) => state.currentUserRole);
  const syncState = useAppStore((state) => state.syncStatus.state);
  const previousUserIdRef = useRef(user?.uid);
  const cleanupFlushActiveRef = useRef(false);

  useEffect(() => {
    if (previousUserIdRef.current !== user?.uid) {
      defaultPersonMediaAssetResolver.clear();
      previousUserIdRef.current = user?.uid;
    }
  }, [user?.uid]);

  useEffect(() => {
    if (
      !user?.uid
      || !treeId
      || syncState !== 'synced'
      || !canEditTreeContext({ currentTreeId: treeId, role })
    ) {
      return undefined;
    }

    const flush = () => {
      if (cleanupFlushActiveRef.current) return;
      cleanupFlushActiveRef.current = true;
      void flushPersonMediaCleanupQueue({
        treeId,
        userId: user.uid,
        token: user.supabaseToken,
        isTargetReferenced: (target) => {
          const currentState = useAppStore.getState();
          if (
            currentState.currentTreeId !== treeId
            || currentState.syncStatus.state !== 'synced'
            || currentState.user?.uid !== user.uid
            || !canEditTreeContext({ currentTreeId: treeId, role: currentState.currentUserRole })
          ) {
            return true;
          }
          return isPersonMediaStorageTargetReferenced(currentState.confirmedPeople, target);
        },
      }).catch(() => {
        logError('PERSON_MEDIA_CLEANUP_FLUSH_FAILED', 'Deferred media cleanup could not complete.', {
          showToast: false,
          metadata: { treeId },
        });
      }).finally(() => {
        cleanupFlushActiveRef.current = false;
      });
    };

    flush();
    window.addEventListener('online', flush);
    window.addEventListener('supabase-sync-success', flush);
    return () => {
      window.removeEventListener('online', flush);
      window.removeEventListener('supabase-sync-success', flush);
    };
  }, [role, syncState, treeId, user?.supabaseToken, user?.uid]);
}
