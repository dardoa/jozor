import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DriveFile, UserProfile } from '../../../types';
import { storageProvider } from '../../../services/storageProvider';
import { showToast } from '../../../utils/showToast';
import { useDriveFiles } from '../useDriveFiles';

type UseDriveFilesParams = Parameters<typeof useDriveFiles>[0];

vi.mock('../../../services/storageProvider', () => ({
  storageProvider: {
    listFiles: vi.fn(),
    deleteFile: vi.fn(),
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

const createDriveFile = (id: string): DriveFile => ({
  id,
  name: `${id}.jozor`,
  modifiedTime: '2026-06-18T00:00:00.000Z',
});

const createHookParams = (
  overrides: Partial<UseDriveFilesParams> = {}
): UseDriveFilesParams => ({
  user,
  runWithAuth: (operation) => operation(),
  showGoogleError: vi.fn(),
  currentActiveDriveFileId: null,
  setCurrentActiveDriveFileId: vi.fn(),
  fileOwnerUid: null,
  setFileOwnerUid: vi.fn(),
  ...overrides,
});

describe('useDriveFiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('refreshes Drive files while mounted', async () => {
    const files = [createDriveFile('file-1')];
    vi.mocked(storageProvider.listFiles).mockResolvedValue(files);
    const params = createHookParams();

    const { result } = renderHook(() => useDriveFiles(params));

    await act(async () => {
      await result.current.refreshDriveFiles();
    });

    expect(result.current.driveFiles).toEqual(files);
    expect(result.current.isAuthorized).toBe(true);
    expect(result.current.isListingDriveFiles).toBe(false);
  });

  it('does not emit stale session UI when refresh fails after unmount', async () => {
    localStorage.setItem('jozor_google_access_token', 'stale-token');
    const missingAuthError = new Error('Missing authentication');
    let rejectListFiles: (error: Error) => void = () => undefined;
    vi.mocked(storageProvider.listFiles).mockReturnValue(
      new Promise<DriveFile[]>((_resolve, reject) => {
        rejectListFiles = reject;
      })
    );
    const showGoogleError = vi.fn();
    const params = createHookParams({ showGoogleError });

    const { result, unmount } = renderHook(() => useDriveFiles(params));

    const refreshPromise = act(async () => {
      await result.current.refreshDriveFiles();
    });

    unmount();
    rejectListFiles(missingAuthError);
    await refreshPromise;

    expect(showToast.error).not.toHaveBeenCalled();
    expect(showGoogleError).not.toHaveBeenCalled();
  });

  it('does not emit stale delete UI when deletion resolves after unmount', async () => {
    let resolveDelete: () => void = () => undefined;
    vi.mocked(storageProvider.deleteFile).mockReturnValue(
      new Promise<void>((resolve) => {
        resolveDelete = resolve;
      })
    );
    const setCurrentActiveDriveFileId = vi.fn();
    const setFileOwnerUid = vi.fn();
    const params = createHookParams({
      currentActiveDriveFileId: 'file-1',
      setCurrentActiveDriveFileId,
      setFileOwnerUid,
    });

    const { result, unmount } = renderHook(() => useDriveFiles(params));

    const deletePromise = act(async () => {
      await result.current.handleDeleteDriveFile('file-1');
    });

    unmount();
    resolveDelete();
    await deletePromise;

    expect(showToast.success).not.toHaveBeenCalled();
    expect(setCurrentActiveDriveFileId).not.toHaveBeenCalled();
    expect(setFileOwnerUid).not.toHaveBeenCalled();
  });
});
