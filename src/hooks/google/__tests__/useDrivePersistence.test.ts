import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../../../types';
import { storageProvider } from '../../../services/storageProvider';
import { showToast } from '../../../utils/showToast';
import { useAppStore } from '../../../store/useAppStore';
import { useDrivePersistence } from '../useDrivePersistence';
import { loadDrivePayloadIntoStore } from '../drivePersistenceCommands';

const {
  buildCurrentDriveFullStateMock,
  loadDrivePayloadIntoStoreMock,
  validateCurrentDriveIntegrityMock,
  saveCurrentDriveStateMock,
} = vi.hoisted(() => ({
  buildCurrentDriveFullStateMock: vi.fn(() => ({ people: {} })),
  loadDrivePayloadIntoStoreMock: vi.fn(),
  validateCurrentDriveIntegrityMock: vi.fn(() => true),
  saveCurrentDriveStateMock: vi.fn(),
}));

vi.mock('../../../services/storageProvider', () => ({
  storageProvider: {
    loadFile: vi.fn(),
    saveFile: vi.fn(),
  },
}));

vi.mock('../../../utils/showToast', () => ({
  showToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../drivePersistenceCommands', () => ({
  buildCurrentDriveFullState: buildCurrentDriveFullStateMock,
  loadDrivePayloadIntoStore: loadDrivePayloadIntoStoreMock,
  saveCurrentDriveState: saveCurrentDriveStateMock,
  validateCurrentDriveIntegrity: validateCurrentDriveIntegrityMock,
}));

const user: UserProfile = {
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  photoURL: '',
  supabaseToken: 'token-1',
};

type UseDrivePersistenceParams = Parameters<typeof useDrivePersistence>[0];

const createHookParams = (
  overrides: Partial<UseDrivePersistenceParams> = {}
): UseDrivePersistenceParams => ({
  user,
  currentActiveDriveFileId: 'drive-file-1',
  setCurrentActiveDriveFileId: vi.fn(),
  setFileOwnerUid: vi.fn(),
  isListingDriveFiles: false,
  debouncedPeople: {},
  runWithAuth: (operation) => operation(),
  showGoogleError: vi.fn(),
  refreshDriveFiles: vi.fn().mockResolvedValue(undefined),
  onCloseGoogleSyncChoice: vi.fn(),
  ...overrides,
});

describe('useDrivePersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAppStore.setState({
      driveSyncUiStatus: 'idle',
      people: {},
      currentTreeId: null,
    });
  });

  it('saves a new cloud file while mounted', async () => {
    vi.mocked(storageProvider.saveFile).mockResolvedValue('new-drive-file');
    const setCurrentActiveDriveFileId = vi.fn();
    const refreshDriveFiles = vi.fn().mockResolvedValue(undefined);
    const onCloseGoogleSyncChoice = vi.fn();
    const params = createHookParams({
      currentActiveDriveFileId: null,
      setCurrentActiveDriveFileId,
      refreshDriveFiles,
      onCloseGoogleSyncChoice,
    });

    const { result } = renderHook(() => useDrivePersistence(params));

    await act(async () => {
      await result.current.onSaveNewCloudFile();
    });

    expect(setCurrentActiveDriveFileId).toHaveBeenCalledWith('new-drive-file');
    expect(showToast.success).toHaveBeenCalledWith('Tree saved as a new file to Google Drive!');
    expect(refreshDriveFiles).toHaveBeenCalledWith(true);
    expect(onCloseGoogleSyncChoice).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().driveSyncUiStatus).toBe('idle');
  });

  it('does not emit stale save UI when creating a file resolves after unmount', async () => {
    let resolveSave: (fileId: string) => void = () => undefined;
    vi.mocked(storageProvider.saveFile).mockReturnValue(
      new Promise<string>((resolve) => {
        resolveSave = resolve;
      })
    );
    const setCurrentActiveDriveFileId = vi.fn();
    const refreshDriveFiles = vi.fn().mockResolvedValue(undefined);
    const onCloseGoogleSyncChoice = vi.fn();
    const params = createHookParams({
      currentActiveDriveFileId: null,
      setCurrentActiveDriveFileId,
      refreshDriveFiles,
      onCloseGoogleSyncChoice,
    });

    const { result, unmount } = renderHook(() => useDrivePersistence(params));

    const savePromise = act(async () => {
      await result.current.onSaveNewCloudFile();
    });

    unmount();
    resolveSave('late-drive-file');
    await savePromise;

    expect(setCurrentActiveDriveFileId).not.toHaveBeenCalled();
    expect(showToast.success).not.toHaveBeenCalled();
    expect(refreshDriveFiles).not.toHaveBeenCalled();
    expect(onCloseGoogleSyncChoice).not.toHaveBeenCalled();
    expect(useAppStore.getState().driveSyncUiStatus).toBe('idle');
  });

  it('does not hydrate stale cloud data when loading resolves after unmount', async () => {
    let resolveLoad: (payload: { people: Record<string, never> }) => void = () => undefined;
    vi.mocked(storageProvider.loadFile).mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      })
    );
    const setCurrentActiveDriveFileId = vi.fn();
    const params = createHookParams({ setCurrentActiveDriveFileId });

    const { result, unmount } = renderHook(() => useDrivePersistence(params));

    const loadPromise = act(async () => {
      await result.current.onLoadCloudData('drive-file-1');
    });

    unmount();
    resolveLoad({ people: {} });
    await loadPromise;

    expect(loadDrivePayloadIntoStore).not.toHaveBeenCalled();
    expect(setCurrentActiveDriveFileId).not.toHaveBeenCalled();
    expect(showToast.success).not.toHaveBeenCalled();
    expect(useAppStore.getState().driveSyncUiStatus).toBe('idle');
  });

  it('blocks saving/overwriting when user is viewer', async () => {
    useAppStore.setState({ currentUserRole: 'viewer' });
    const params = createHookParams();
    const { result } = renderHook(() => useDrivePersistence(params));

    await act(async () => {
      await result.current.onSaveNewCloudFile();
    });
    expect(showToast.error).toHaveBeenCalledWith('Read-only users cannot save files to Google Drive.');

    await act(async () => {
      await result.current.handleSaveAsNewDriveFile('test');
    });
    expect(showToast.error).toHaveBeenCalledWith('Read-only users cannot save files to Google Drive.');

    await act(async () => {
      await result.current.handleOverwriteExistingDriveFile('file-1');
    });
    expect(showToast.error).toHaveBeenCalledWith('Read-only users cannot save files to Google Drive.');

    await act(async () => {
      await result.current.handleClearSyncCache();
    });
    expect(showToast.error).toHaveBeenCalledWith('Read-only users cannot reset sync.');
  });
});

