import { useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { flushArchiveImportCleanupQueue } from '../../services/archiveImportCleanupQueue';
import { logError } from '../../utils/errorLogger';
import { showToast } from '../../utils/showToast';

export function useArchiveImportCleanupLifecycle(): void {
  const userId = useAppStore(state => state.user?.uid);
  const token = useAppStore(state => state.user?.supabaseToken);
  useEffect(() => {
    if (!userId || !token) return;
    let disposed = false;
    const isCurrentSession = () => !disposed
      && useAppStore.getState().user?.uid === userId
      && useAppStore.getState().user?.supabaseToken === token;
    const flush = () => {
      if (!navigator.onLine || !isCurrentSession()) return;
      void flushArchiveImportCleanupQueue({ userId, token, isCurrentSession }).then(result => {
        if (result.reviewRequired > 0 && isCurrentSession()) {
          showToast.warning('messages.error.importCleanupReview', { id: 'archive-import-cleanup-review' });
        }
      }).catch(() => {
        logError('ARCHIVE_IMPORT_CLEANUP_FLUSH_FAILED', 'Deferred import cleanup could not run.', { showToast: false });
      });
    };
    flush();
    window.addEventListener('online', flush);
    window.addEventListener('archive-import-cleanup-pending', flush);
    // An online event can arrive before backoff expires; a later retry is still needed.
    const interval = window.setInterval(flush, 30000);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('online', flush);
      window.removeEventListener('archive-import-cleanup-pending', flush);
    };
  }, [userId, token]);
}
