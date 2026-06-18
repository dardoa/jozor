import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../../../types';
import { storageProvider } from '../../../services/storageProvider';
import { DriveSerializationService } from '../../../services/google/DriveSerializationService';
import { showToast } from '../../../utils/showToast';
import { useAppStore } from '../../../store/useAppStore';
import { useDriveSnapshots } from '../useDriveSnapshots';

const { buildBlueprintArchiveMock } = vi.hoisted(() => ({
  buildBlueprintArchiveMock: vi.fn().mockResolvedValue({ blob: new Blob(['snapshot']) }),
}));

vi.mock('../../../services/archiveService', () => ({
  buildBlueprintArchive: buildBlueprintArchiveMock,
}));

vi.mock('../../../services/storageProvider', () => ({
  storageProvider: {
    cleanupSnapshots: vi.fn(),
    saveSnapshot: vi.fn(),
    listSnapshots: vi.fn(),
    loadSnapshotFileRaw: vi.fn(),
    saveFile: vi.fn(),
  },
}));

vi.mock('../../../services/google/DriveSerializationService', () => ({
  DriveSerializationService: {
    buildCurrentFullState: vi.fn(() => ({ people: {} })),
  },
}));

vi.mock('../../../utils/showToast', () => ({
  showToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

const user: UserProfile = {
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  photoURL: '',
  supabaseToken: 'token-1',
};

type UseDriveSnapshotsParams = Parameters<typeof useDriveSnapshots>[0];

const createHookParams = (
  overrides: Partial<UseDriveSnapshotsParams> = {}
): UseDriveSnapshotsParams => ({
  user,
  currentActiveDriveFileId: 'drive-file-1',
  runWithAuth: (operation) => operation(),
  showGoogleError: vi.fn(),
  ...overrides,
});

describe('useDriveSnapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAppStore.setState({
      currentTreeId: 'tree-1',
      driveSyncUiStatus: 'idle',
      people: {},
    });
    vi.mocked(storageProvider.cleanupSnapshots).mockResolvedValue(undefined);
    vi.mocked(storageProvider.saveSnapshot).mockResolvedValue('snapshot-file-1');
  });

  it('creates a snapshot while mounted', async () => {
    const params = createHookParams();

    const { result } = renderHook(() => useDriveSnapshots(params));

    await act(async () => {
      await result.current.handleCreateSnapshot('Manual Snapshot');
    });

    expect(DriveSerializationService.buildCurrentFullState).toHaveBeenCalledWith('user@example.com');
    expect(storageProvider.cleanupSnapshots).toHaveBeenCalledWith('tree-1', 2);
    expect(buildBlueprintArchiveMock).toHaveBeenCalledWith({ people: {} }, { label: 'Manual Snapshot' });
    expect(storageProvider.saveSnapshot).toHaveBeenCalledWith(
      expect.any(Blob),
      'tree-1',
      'Manual Snapshot'
    );
    expect(showToast.success).toHaveBeenCalledWith('Snapshot saved successfully!');
    expect(useAppStore.getState().driveSyncUiStatus).toBe('idle');
  });

  it('does not emit stale snapshot UI when save resolves after unmount', async () => {
    let resolveSaveSnapshot: (fileId: string) => void = () => undefined;
    vi.mocked(storageProvider.saveSnapshot).mockReturnValue(
      new Promise<string>((resolve) => {
        resolveSaveSnapshot = resolve;
      })
    );
    const showGoogleError = vi.fn();
    const params = createHookParams({ showGoogleError });

    const { result, unmount } = renderHook(() => useDriveSnapshots(params));

    let snapshotPromise: Promise<void>;
    act(() => {
      snapshotPromise = result.current.handleCreateSnapshot('Late Snapshot');
    });

    await waitFor(() => {
      expect(storageProvider.saveSnapshot).toHaveBeenCalled();
    });

    unmount();
    resolveSaveSnapshot('late-snapshot-file');
    await act(async () => {
      await snapshotPromise;
    });

    expect(showToast.success).not.toHaveBeenCalled();
    expect(showGoogleError).not.toHaveBeenCalled();
    expect(useAppStore.getState().driveSyncUiStatus).toBe('idle');
  });
});
