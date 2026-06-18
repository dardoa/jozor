import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncLifecycleEvents } from '../useSyncLifecycleEvents';

type GoogleSyncEvents = Parameters<typeof useSyncLifecycleEvents>[0];

const createGoogleSyncEvents = (
  overrides: Partial<GoogleSyncEvents> = {}
): GoogleSyncEvents => ({
  currentActiveDriveFileId: null,
  handleOverwriteExistingDriveFile: vi.fn().mockResolvedValue(undefined),
  onSaveNewCloudFile: vi.fn().mockResolvedValue(undefined),
  onSaveToGoogleDrive: vi.fn().mockResolvedValue(undefined),
  handleClearSyncCache: vi.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('useSyncLifecycleEvents', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('keeps lifecycle event listeners stable across rerenders and calls latest handlers', async () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const initialGoogleSync = createGoogleSyncEvents();
    const updatedGoogleSync = createGoogleSyncEvents();

    const { rerender, unmount } = renderHook(
      ({ googleSync }) => useSyncLifecycleEvents(googleSync),
      { initialProps: { googleSync: initialGoogleSync } }
    );

    rerender({ googleSync: updatedGoogleSync });

    window.dispatchEvent(new Event('force-drive-sync'));
    window.dispatchEvent(new Event('clear-vault-sync-cache'));

    await waitFor(() => {
      expect(updatedGoogleSync.onSaveToGoogleDrive).toHaveBeenCalledTimes(1);
      expect(updatedGoogleSync.handleClearSyncCache).toHaveBeenCalledTimes(1);
    });

    expect(initialGoogleSync.onSaveToGoogleDrive).not.toHaveBeenCalled();
    expect(initialGoogleSync.handleClearSyncCache).not.toHaveBeenCalled();
    expect(addSpy.mock.calls.filter(([eventName]) => eventName === 'force-drive-sync')).toHaveLength(
      1
    );
    expect(
      addSpy.mock.calls.filter(([eventName]) => eventName === 'clear-vault-sync-cache')
    ).toHaveLength(1);

    unmount();

    expect(
      removeSpy.mock.calls.filter(([eventName]) => eventName === 'force-drive-sync')
    ).toHaveLength(1);
    expect(
      removeSpy.mock.calls.filter(([eventName]) => eventName === 'clear-vault-sync-cache')
    ).toHaveLength(1);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('uses the active drive file when handling periodic backup requests', async () => {
    const googleSync = createGoogleSyncEvents({
      currentActiveDriveFileId: 'drive-file-1',
    });

    renderHook(() => useSyncLifecycleEvents(googleSync));

    window.dispatchEvent(new Event('jozor-backup-requested'));

    await waitFor(() => {
      expect(googleSync.handleOverwriteExistingDriveFile).toHaveBeenCalledWith('drive-file-1');
    });
    expect(googleSync.onSaveNewCloudFile).not.toHaveBeenCalled();
  });

  it('creates a new cloud file when there is no active drive file for periodic backup', async () => {
    const googleSync = createGoogleSyncEvents();

    renderHook(() => useSyncLifecycleEvents(googleSync));

    window.dispatchEvent(new Event('jozor-backup-requested'));

    await waitFor(() => {
      expect(googleSync.onSaveNewCloudFile).toHaveBeenCalledTimes(1);
    });
    expect(googleSync.handleOverwriteExistingDriveFile).not.toHaveBeenCalled();
  });
});
