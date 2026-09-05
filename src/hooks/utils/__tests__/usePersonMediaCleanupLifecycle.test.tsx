import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { logError } from '../../../utils/errorLogger';

vi.mock('../../../utils/errorLogger', () => ({ logError: vi.fn(), logInfo: vi.fn(), logWarn: vi.fn() }));

const { clearMock, flushPersonMediaCleanupQueueMock } = vi.hoisted(() => ({
  clearMock: vi.fn(),
  flushPersonMediaCleanupQueueMock: vi.fn(),
}));

vi.mock('../../../services/personMediaAssetService', () => ({
  defaultPersonMediaAssetResolver: { clear: clearMock },
}));

vi.mock('../../../services/personMediaCleanupQueue', () => ({
  flushPersonMediaCleanupQueue: flushPersonMediaCleanupQueueMock,
  isPersonMediaStorageTargetReferenced: vi.fn(() => false),
}));

import { usePersonMediaCleanupLifecycle } from '../usePersonMediaCleanupLifecycle';

const owner = {
  uid: 'owner-1',
  email: 'owner@example.test',
  displayName: 'Owner',
  photoURL: '',
  supabaseToken: 'owner-session',
};

describe('usePersonMediaCleanupLifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    flushPersonMediaCleanupQueueMock.mockResolvedValue({ removed: 0, deferred: 0 });
    useAppStore.setState({
      currentTreeId: 'tree-1',
      currentUserRole: 'owner',
      user: owner,
      syncStatus: {
        ...useAppStore.getState().syncStatus,
        state: 'synced',
      },
    });
  });

  it('flushes for an editable cloud tree and retries when connectivity returns', async () => {
    const { unmount } = renderHook(() => usePersonMediaCleanupLifecycle());

    await waitFor(() => expect(flushPersonMediaCleanupQueueMock).toHaveBeenCalledOnce());
    expect(flushPersonMediaCleanupQueueMock).toHaveBeenLastCalledWith(expect.objectContaining({
      treeId: 'tree-1',
      userId: 'owner-1',
      token: 'owner-session',
      isTargetReferenced: expect.any(Function),
    }));

    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(flushPersonMediaCleanupQueueMock).toHaveBeenCalledTimes(2));

    act(() => window.dispatchEvent(new Event('supabase-sync-success')));
    await waitFor(() => expect(flushPersonMediaCleanupQueueMock).toHaveBeenCalledTimes(3));

    unmount();
    act(() => window.dispatchEvent(new Event('online')));
    expect(flushPersonMediaCleanupQueueMock).toHaveBeenCalledTimes(3);
  });

  it('does not flush storage cleanup for a viewer', async () => {
    useAppStore.setState({ currentUserRole: 'viewer' });
    renderHook(() => usePersonMediaCleanupLifecycle());

    await act(async () => Promise.resolve());
    expect(flushPersonMediaCleanupQueueMock).not.toHaveBeenCalled();
  });

  it.each(['identity', 'role', 'tree', 'sync'] as const)('defers an in-flight cleanup after a %s change', async (change) => {
    renderHook(() => usePersonMediaCleanupLifecycle());
    await waitFor(() => expect(flushPersonMediaCleanupQueueMock).toHaveBeenCalledOnce());
    const { isTargetReferenced } = flushPersonMediaCleanupQueueMock.mock.calls[0][0];
    expect(isTargetReferenced({})).toBe(false);
    act(() => {
      if (change === 'identity') useAppStore.setState({ user: { ...owner, uid: 'other-user' } });
      if (change === 'role') useAppStore.setState({ currentUserRole: 'viewer' });
      if (change === 'tree') useAppStore.setState({ currentTreeId: 'other-tree' });
      if (change === 'sync') useAppStore.setState({ syncStatus: { ...useAppStore.getState().syncStatus, state: 'saving' } });
    });
    expect(isTargetReferenced({})).toBe(true);
  });

  it('handles queue failures without an unhandled rejection and permits a later retry', async () => {
    flushPersonMediaCleanupQueueMock.mockRejectedValueOnce(new Error('IndexedDB unavailable'));
    renderHook(() => usePersonMediaCleanupLifecycle());
    await waitFor(() => expect(logError).toHaveBeenCalledWith(
      'PERSON_MEDIA_CLEANUP_FLUSH_FAILED', expect.any(String), expect.objectContaining({ showToast: false })
    ));
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(flushPersonMediaCleanupQueueMock).toHaveBeenCalledTimes(2));
  });

  it('clears cached object URLs only when the signed-in identity changes', async () => {
    renderHook(() => usePersonMediaCleanupLifecycle());
    expect(clearMock).not.toHaveBeenCalled();

    act(() => {
      useAppStore.setState({
        user: { ...owner, supabaseToken: 'refreshed-session' },
      });
    });
    await act(async () => Promise.resolve());
    expect(clearMock).not.toHaveBeenCalled();

    act(() => {
      useAppStore.setState({
        user: { ...owner, uid: 'owner-2', supabaseToken: 'other-session' },
      });
    });
    await waitFor(() => expect(clearMock).toHaveBeenCalledOnce());
  });
});
