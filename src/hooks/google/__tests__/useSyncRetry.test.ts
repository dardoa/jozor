import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSyncRetry } from '../useSyncRetry';

const setNavigatorOnline = (online: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    value: online,
  });
};

describe('useSyncRetry', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setNavigatorOnline(true);
  });

  it('does not retry restored-network sync while a sync is already running', () => {
    localStorage.setItem('pending_google_sync', 'true');
    const onRetry = vi.fn();

    const { rerender } = renderHook(
      ({ isSyncing }) =>
        useSyncRetry({
          currentActiveDriveFileId: 'drive-file-1',
          isSyncing,
          onRetry,
        }),
      { initialProps: { isSyncing: true } }
    );

    window.dispatchEvent(new Event('online'));
    expect(onRetry).not.toHaveBeenCalled();

    rerender({ isSyncing: false });
    onRetry.mockClear();
    window.dispatchEvent(new Event('online'));

    expect(onRetry).toHaveBeenCalledWith('drive-file-1');
  });
});
