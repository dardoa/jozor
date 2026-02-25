import { useState, useEffect, useCallback, useRef } from 'react';
import { UserProfile, Person, DriveFile } from '../types';
import {
  googleApiService,
  googleAuthService,
  googleDriveService,
} from '../services/googleService';
import { showSuccess, showError } from '../utils/toast';
import { useDebouncedValue } from './useDebounce';
import { useAppStore, loadFullState } from '../store/useAppStore';
import { FullState } from '../types';

/**
 * Hook for managing Google Drive synchronization.
 * Handles authentication, file listing, loading, saving, and auto-syncing.
 */
export const useGoogleSync = (
  people: Record<string, Person>,
  onOpenGoogleSyncChoice: (fileId: string) => void,
  onCloseGoogleSyncChoice: () => void,
  setShowWelcome: (show: boolean) => void,
  onOpenDriveFileManager: () => void
) => {
  const user = useAppStore((state) => state.user); // Consume global user
  const [currentActiveDriveFileId, setCurrentActiveDriveFileId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);

  // UI State for operations
  const [isListingDriveFiles, setIsListingDriveFiles] = useState(false);
  const [isSavingDriveFile, setIsSavingDriveFile] = useState(false);
  const [isDeletingDriveFile, setIsDeletingDriveFile] = useState(false);

  // --- Auth Wrapper ---
  const runWithAuth = useCallback(async <T>(operation: () => Promise<T>, allowPopup: boolean = false): Promise<T> => {
    // Ensure API is initialized first
    await googleApiService.initialize();

    // Safety check: if gapi.client.drive is still missing, we might need to wait or fail gracefully
    if (!(window as any).gapi?.client?.drive) {
      console.warn('useGoogleSync: GAPI Drive client missing after init. Sync may fail.');
    }

    const isAuthValid = await googleAuthService.ensureTokenValid(allowPopup); // Use flag
    if (!isAuthValid) {
      throw new Error('Missing authentication');
    }
    try {
      return await operation();
    } catch (e: unknown) {
      const err = e as { status?: number; result?: { error?: { code?: number } } };
      const status = err.status || (err.result?.error?.code);
      if (status === 401) {
        console.warn('useGoogleSync: 401 Unauthorized detected, triggering re-auth...');
        // Note: Global login will update the user state in the store
        await googleAuthService.login();
        return await operation();
      }
      throw e;
    }
  }, []);

  // --- Drive File Management Functions (Declared early as they are dependencies) ---
  const refreshDriveFiles = useCallback(async (allowPopup: boolean = false) => {
    if (!user) {
      setDriveFiles([]);
      return;
    }
    setIsListingDriveFiles(true);
    try {
      const files = await runWithAuth(() => googleDriveService.listJozorFiles(), allowPopup);
      setDriveFiles(files);
    } catch (e: unknown) {
      const err = e as Error;
      console.error('[refreshDriveFiles] Failed to list Drive files', err);
      if (err.message === 'Missing authentication') {
        showError('Session expired. Please click "Login" to see your files.');
      } else {
        showError('Failed to list files from Google Drive.');
      }
    } finally {
      setIsListingDriveFiles(false);
    }
  }, [user, runWithAuth]);

  // 3. Login Flow
  const onLogin = useCallback(async (): Promise<void> => {
    setIsSyncing(true);
    try {
      // Use the global login action from our store (which should be provided by useAppOrchestration if needed, 
      // but here we interact with the service directly to get the user for immediate use if possible)
      const u = await googleAuthService.login();
      // user in the store will be updated by whatever orchestration handled the login or by us calling it
      setIsDemoMode(false);
      setShowWelcome(false);

      // refreshDriveFiles depends on 'user' which is now from the store
      await refreshDriveFiles(true); // Allow popup here

      try {
        const existingFileId = await runWithAuth(() => googleDriveService.findLatestJozorFile(), true);
        if (existingFileId) {
          setCurrentActiveDriveFileId(existingFileId);
          onOpenGoogleSyncChoice(existingFileId);
        } else {
          setCurrentActiveDriveFileId(null);
        }
      } catch (driveErr) {
        console.error('Drive Setup Error:', driveErr);
        showError('Logged in, but failed to access Google Drive. Check permissions.');
      }
    } catch (e: unknown) {
      const err = e as Error;
      console.error('Login failed', err);
      showError('Login failed. Please ensure your Google Client ID is configured correctly.');
      throw err;
    } finally {
      setIsSyncing(false);
    }
  }, [onOpenGoogleSyncChoice, refreshDriveFiles, setShowWelcome, runWithAuth]);

  const [fileOwnerUid, setFileOwnerUid] = useState<string | null>(null);

  // Functions called by GoogleSyncChoiceModal
  const onLoadCloudData = useCallback(
    async (fileId: string) => {
      setIsSyncing(true);
      try {
        const cloudData = await runWithAuth(() => googleDriveService.loadFile(fileId), true);

        if (!cloudData) {
          throw new Error('File is empty or corrupted');
        }

        if (cloudData.version || cloudData.metadata) {
          loadFullState(cloudData);
        } else {
          // Legacy format - try to load as people data
          loadFullState({ people: cloudData as Record<string, Person> });
        }

        setCurrentActiveDriveFileId(fileId);
        showSuccess('File loaded successfully from Google Drive.');
      } catch (e: unknown) {
        const err = e as Error;
        console.error('Failed to load file from Google Drive.', err);
        const errorMessage = err.message || 'Unknown error occurred';

        // If file not found (404), clear the reference and let user start fresh
        if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          setCurrentActiveDriveFileId(null);
          showError('The file no longer exists in Google Drive. You can start with a fresh tree or create a new file.');
        } else {
          showError(`Failed to load file: ${errorMessage}`);
        }
      } finally {
        setIsSyncing(false);
        onCloseGoogleSyncChoice();
      }
    },
    [onCloseGoogleSyncChoice, runWithAuth]
  );


  // --- Auto-Sync Logic ---
  // Debounce the people object to trigger save after 5 seconds of inactivity
  const debouncedPeople = useDebouncedValue(people, 5000);

  // Check if we have pending offline syncs on mount
  useEffect(() => {
    const pendingSync = localStorage.getItem('pending_google_sync');
    if (pendingSync === 'true' && currentActiveDriveFileId && !isSyncing && navigator.onLine) {
      console.log('Detected pending offline sync. Retrying now...');
      handleOverwriteExistingDriveFile(currentActiveDriveFileId);
    }

    const handleOnline = () => {
      const pending = localStorage.getItem('pending_google_sync');
      if (pending === 'true' && currentActiveDriveFileId) {
        console.log('Network restored. Retrying pending sync...');
        handleOverwriteExistingDriveFile(currentActiveDriveFileId);
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [currentActiveDriveFileId, isSyncing]);

  // --- Multi-Tab State Synchronization ---
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'jozor_gdrive_file_id') {
        console.log('Multi-Tab Sync: Detected file ID change in another tab:', e.newValue);
        setCurrentActiveDriveFileId(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Trigger auto-save when debounced people change
  useEffect(() => {
    // Requirements for auto-save:
    // 1. User is logged in
    // 2. We have an active file ID
    // 3. We are not currently syncing (to avoid race conditions)
    // 4. People data is not empty (integrity check 1)

    if (!user || !currentActiveDriveFileId || isSyncing || isSavingDriveFile || isListingDriveFiles) return;

    // Integrity Check: Do not save if people map is suspiciously empty
    // (Assuming a tree must have at least one person, or we risk wiping data)
    if (Object.keys(debouncedPeople).length === 0) {
      console.warn('Auto-Sync: Skipped because people data is empty (Integrity Check).');
      return;
    }

    handleOverwriteExistingDriveFile(currentActiveDriveFileId, true);

  }, [debouncedPeople]); // Only triggers when the DEBOUNCED value changes

  const onSaveNewCloudFile = useCallback(async () => {
    setIsSyncing(true);
    try {
      const state = useAppStore.getState();
      const fullState: FullState = {
        version: 1,
        people: state.people,
        focusId: state.focusId,
        settings: {
          treeSettings: state.treeSettings,
          darkMode: state.darkMode,
          language: state.language
        },
        metadata: {
          lastModified: Date.now(),
          appName: 'Jozor'
        }
      };

      const newId = await runWithAuth(() => googleDriveService.saveFile(fullState, null), true); // Pass null to force new file creation
      setCurrentActiveDriveFileId(newId);
      showSuccess('Tree saved as a new file to Google Drive!');
      refreshDriveFiles(true);
    } catch {
      console.error('Failed to save new file to Google Drive.');
      showError('Failed to save new file to Google Drive.');
    } finally {
      setIsSyncing(false);
      onCloseGoogleSyncChoice();
    }
  }, [people, onCloseGoogleSyncChoice, refreshDriveFiles, runWithAuth]);

  const handleSaveAsNewDriveFile = useCallback(
    async (fileName: string) => {
      setIsSavingDriveFile(true);
      try {
        const state = useAppStore.getState();
        const fullState: FullState = {
          version: 1,
          people: state.people,
          focusId: state.focusId,
          settings: {
            treeSettings: state.treeSettings,
            darkMode: state.darkMode,
            language: state.language
          },
          metadata: {
            lastModified: Date.now(),
            appName: 'Jozor'
          }
        };

        const newId = await runWithAuth(() => googleDriveService.saveFile(fullState, null, fileName), true);
        setCurrentActiveDriveFileId(newId);
        showSuccess(`Tree saved as '${fileName}' to Google Drive!`);
        await refreshDriveFiles(true);
      } catch {
        console.error('Failed to save as new file to Google Drive.');
        showError('Failed to save as new file to Google Drive.');
      } finally {
        setIsSavingDriveFile(false);
      }
    },
    [people, refreshDriveFiles, runWithAuth]
  );

  const handleOverwriteExistingDriveFile = useCallback(
    async (fileId: string | null, silent: boolean = false, allowPopup: boolean = false, forceNew: boolean = false) => {
      setIsSavingDriveFile(true);

      // Integrity Check Before Upload
      const state = useAppStore.getState();
      if (Object.keys(state.people).length === 0) {
        console.error('Integrity Check Failed: Attempted to save empty people map.');
        if (!silent) showError('Save failed: Data appears corrupted (empty).');
        setIsSavingDriveFile(false);
        return;
      }

      try {
        const fullState: FullState = {
          version: 1,
          people: state.people,
          focusId: state.focusId,
          settings: {
            treeSettings: state.treeSettings,
            darkMode: state.darkMode,
            language: state.language
          },
          metadata: {
            lastModified: Date.now(),
            appName: 'Jozor',
            lastModifiedBy: user?.email || 'unknown', // Metadata
            device: 'web'
          }
        };

        if (!navigator.onLine) {
          throw new Error('Offline');
        }

        const newId = await runWithAuth(() => googleDriveService.saveFile(fullState, fileId, undefined, forceNew), allowPopup);

        // PERSIST ID: Local and Remote
        setCurrentActiveDriveFileId(newId);
        localStorage.setItem('jozor_gdrive_file_id', newId);

        if (newId !== fileId && user) {
          console.log('DeltaSync: File ID changed. Updating Supabase metadata...');
          const { updateTreeSyncMetadata } = await import('../services/supabaseTreeService');
          await updateTreeSyncMetadata(state.currentTreeId || '', user.uid, user.email || '', newId);
        }

        // Clear pending flag on success
        localStorage.removeItem('pending_google_sync');

        if (!silent) {
          showSuccess('File synchronized successfully on Google Drive!');
          await refreshDriveFiles(allowPopup);
        }
      } catch (e: unknown) {
        const err = e as { message?: string; status?: number; result?: { error?: { code?: number } } };
        const status = err.status || (err.result?.error?.code);
        console.error('Failed to overwrite file on Google Drive.', status, e);

        if (err.message === 'Offline' || !navigator.onLine) {
          localStorage.setItem('pending_google_sync', 'true');
          if (!silent) showError('Offline. Changes will sync when connection is restored.');
        } else if (err.message === 'Missing authentication') {
          if (!silent) showError('Session expired. Please click "Login" and try again.');
        } else {
          let errorMessage = `Failed to sync: ${err.message || 'Unknown error'}`;
          if (status === 403) {
            errorMessage = 'Permission denied on Google Drive file. Try "Clear Sync Cache & Retry" in the sync popover.';
          } else if (status === 404 || status === 410) {
            errorMessage = 'The Drive file no longer exists. A new one will be created.';
          }

          if (!silent) showError(errorMessage);
        }
      } finally {
        setIsSavingDriveFile(false);
      }
    },
    [people, refreshDriveFiles, user, runWithAuth]
  );

  const handleLoadDriveFile = useCallback(
    async (fileId: string, ownerUid?: string) => {
      setIsSyncing(true);
      try {
        const cloudData = await runWithAuth(() => googleDriveService.loadFile(fileId), true);
        loadFullState(cloudData);
        setCurrentActiveDriveFileId(fileId);
        setFileOwnerUid(ownerUid || user?.uid || null);
        showSuccess('File loaded successfully from Google Drive.');
      } catch {
        console.error('Failed to load file from Google Drive.');
        showError('Failed to load file from Google Drive.');
      } finally {
        setIsSyncing(false);
      }
    },
    [user, runWithAuth]
  );

  const handleDeleteDriveFile = useCallback(
    async (fileId: string) => {
      // Guard Rail: Prevent shared users from deleting
      if (fileOwnerUid && user && fileOwnerUid !== user.uid) {
        showError('Only the owner can delete this file.');
        return;
      }

      setIsDeletingDriveFile(true);
      try {
        await runWithAuth(() => googleDriveService.deleteFile(fileId), true);
        showSuccess('File deleted from Google Drive.');
        if (currentActiveDriveFileId === fileId) {
          setCurrentActiveDriveFileId(null);
          setFileOwnerUid(null);
        }
        await refreshDriveFiles(true);
      } catch {
        console.error('Failed to delete file from Google Drive.');
        showError('Failed to delete file from Google Drive.');
      } finally {
        setIsDeletingDriveFile(false);
      }
    },
    [currentActiveDriveFileId, refreshDriveFiles, fileOwnerUid, user, runWithAuth]
  );

  // --- Snapshot Logic ---

  const handleCreateSnapshot = useCallback(async (label: string) => {
    if (!currentActiveDriveFileId) return;
    setIsSyncing(true);
    try {
      const state = useAppStore.getState();
      const fullState: FullState = {
        version: 1,
        people: state.people,
        focusId: state.focusId,
        settings: {
          treeSettings: state.treeSettings,
          darkMode: state.darkMode,
          language: state.language
        },
        metadata: {
          lastModified: Date.now(),
          appName: 'Jozor',
          lastModifiedBy: user?.email || 'unknown',
          device: 'web'
        }
      };

      const treeId = state.currentTreeId;

      if (!treeId) {
        showError('Cannot create snapshot: Tree ID undefined.');
        setIsSyncing(false);
        return;
      }

      await runWithAuth(() => googleDriveService.saveSnapshot(fullState, treeId, label), true);
      showSuccess('Snapshot saved successfully!');
      // Cleanup old snapshots
      await runWithAuth(() => googleDriveService.cleanupSnapshots(treeId), true);
    } catch {
      console.error('Failed to create snapshot');
      showError('Failed to save snapshot.');
    } finally {
      setIsSyncing(false);
    }
  }, [currentActiveDriveFileId, user]);

  const handleRestoreSnapshot = useCallback(async (snapshot: DriveFile) => {
    if (!currentActiveDriveFileId) return;
    setIsSyncing(true);
    try {
      // 1. Safety Snapshot of CURRENT state
      const currentState = useAppStore.getState();
      const fullCurrentState: FullState = {
        version: 1,
        people: currentState.people,
        focusId: currentState.focusId,
        settings: {
          treeSettings: currentState.treeSettings,
          darkMode: currentState.darkMode,
          language: currentState.language
        },
        metadata: {
          lastModified: Date.now(),
          appName: 'Jozor',
          lastModifiedBy: user?.email || 'unknown',
          device: 'web'
        }
      };
      const treeId = currentState.currentTreeId; // Use tree UUID

      if (treeId) {
        await runWithAuth(() => googleDriveService.saveSnapshot(fullCurrentState, treeId, 'Safety_Before_Restore'), true);
      }

      // 2. Load Snapshot Data
      const restoredData = await runWithAuth(() => googleDriveService.loadFile(snapshot.id), true);

      // 3. Load into App State
      loadFullState(restoredData);

      // 4. Overwrite Main File with Restored Data (so it persists)
      await runWithAuth(() => googleDriveService.saveFile(restoredData, currentActiveDriveFileId), true);

      showSuccess(`Restored version '${snapshot.name}' successfully!`);

    } catch {
      console.error('Failed to restore snapshot');
      showError('Failed to restore version.');
    } finally {
      setIsSyncing(false);
    }
  }, [currentActiveDriveFileId, user]);

  // Daily Snapshot Logic
  useEffect(() => {
    if (!currentActiveDriveFileId || !user) return;

    const checkAndCreateDaily = async () => {
      try {
        const state = useAppStore.getState();
        const treeId = state.currentTreeId;
        if (!treeId) return;

        const snapshots = await googleDriveService.listSnapshots(treeId);
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const dailyLabel = `Auto_Daily_${today}`;

        const hasTodaySnapshot = snapshots.some(s => s.name.includes(dailyLabel));

        if (!hasTodaySnapshot) {
          console.log('Creating daily auto-snapshot...');
          // We need to fetch the latest state or just use current. 
          // Ideally use current app state if loaded, OR fetch from drive if we just logged in.
          // Since this runs when currentActiveDriveFileId is set, likely we just loaded or started.
          // Using app store state is safest if it's already populated.
          const state = useAppStore.getState();
          if (Object.keys(state.people).length > 0) {
            await handleCreateSnapshot(dailyLabel);
          }
        }
      } catch {
        console.error('Error checking daily snapshot');
      }
    };

    checkAndCreateDaily();
    // Run once when file ID changes (e.g. load tree)
  }, [currentActiveDriveFileId, user, handleCreateSnapshot]);

  const stopSyncing = useCallback(() => {
    setCurrentActiveDriveFileId(null);
    setFileOwnerUid(null);
  }, []);

  const onLogout = useCallback(async (): Promise<void> => {
    try {
      await googleAuthService.logout(); // UPDATE
    } catch {
      // Ignore logout errors if session is already gone
    }
    // Note: Global logout action should be used for full cleanup
    setCurrentActiveDriveFileId(null);
    setFileOwnerUid(null);
    setIsDemoMode(false);
    setDriveFiles([]);
    showSuccess('Logged out successfully.');
  }, []);


  /**
   * Emergency Reset: Clears sync cache and forces a new file creation.
   */
  const handleClearSyncCache = useCallback(async () => {
    const state = useAppStore.getState();
    const treeId = state.currentTreeId;

    if (!treeId || !user) {
      showError('Cannot reset sync: No active tree or session found.');
      return;
    }

    setIsSyncing(true);
    try {
      console.log('Emergency Reset: Purging sync metadata...');

      // 1. Purge Local
      setCurrentActiveDriveFileId(null);
      localStorage.removeItem('jozor_gdrive_file_id');

      // 2. Purge Remote (Supabase)
      const { clearTreeSyncMetadata } = await import('../services/supabaseTreeService');
      await clearTreeSyncMetadata(treeId, user.uid, user.email);

      showSuccess('Sync cache cleared. Creating fresh backup...');

      // 3. Force New Save (Allow popup since this is a manual reset)
      // This will call refreshDriveFiles(true) internally on success.
      await handleOverwriteExistingDriveFile(null, false, true, true);

    } catch (e: any) {
      console.error('Failed to clear sync cache:', e);
      showError(`Reset failed: ${e.message || 'Unknown error'}`);
    } finally {
      setIsSyncing(false);
    }
  }, [user, handleOverwriteExistingDriveFile, refreshDriveFiles, runWithAuth]);

  return {
    user,
    isSyncing,
    isDemoMode,
    onLogin,
    onLogout,
    stopSyncing,
    onLoadCloudData,
    onSaveNewCloudFile,
    driveFiles,
    currentActiveDriveFileId,
    fileOwnerUid,
    refreshDriveFiles,
    handleLoadDriveFile,
    handleSaveAsNewDriveFile,
    handleOverwriteExistingDriveFile,
    handleDeleteDriveFile,
    isSaving: isSavingDriveFile,
    isDeleting: isDeletingDriveFile,
    isListing: isListingDriveFiles,
    setShowWelcome,
    onOpenDriveFileManager,
    handleCreateSnapshot,
    handleRestoreSnapshot,
    handleClearSyncCache,
    onSaveToGoogleDrive: () => handleOverwriteExistingDriveFile(currentActiveDriveFileId!, false, true),
  };
};
