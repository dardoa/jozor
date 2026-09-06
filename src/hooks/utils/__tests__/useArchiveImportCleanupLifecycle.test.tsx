import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const { state, flush, warning } = vi.hoisted(() => ({
  state: { user: { uid: 'owner', supabaseToken: 'current-token' } as { uid: string; supabaseToken: string } | null },
  warning: vi.fn(),
  flush: vi.fn<(options: { isCurrentSession: () => boolean }) => Promise<{ removed: number; deferred: number; reviewRequired: number }>>()
    .mockResolvedValue({ removed: 0, deferred: 0, reviewRequired: 0 }),
}));
vi.mock('../../../store/useAppStore', () => ({ useAppStore: Object.assign((selector: (value: typeof state) => unknown) => selector(state), { getState: () => state }) }));
vi.mock('../../../services/archiveImportCleanupQueue', () => ({ flushArchiveImportCleanupQueue: flush }));
vi.mock('../../../utils/errorLogger', () => ({ logError: vi.fn() }));
vi.mock('../../../utils/showToast', () => ({ showToast: { warning } }));
import { useArchiveImportCleanupLifecycle } from '../useArchiveImportCleanupLifecycle';

describe('archive cleanup lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.user = { uid: 'owner', supabaseToken: 'current-token' };
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  });
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
  it('runs without an active tree, retries on reconnect and new jobs, and removes listeners', async () => {
    const { unmount } = renderHook(() => useArchiveImportCleanupLifecycle());
    await waitFor(() => expect(flush).toHaveBeenCalledOnce());
    act(() => window.dispatchEvent(new Event('online')));
    act(() => window.dispatchEvent(new Event('archive-import-cleanup-pending')));
    expect(flush).toHaveBeenCalledTimes(3);
    unmount();
    act(() => window.dispatchEvent(new Event('online')));
    expect(flush).toHaveBeenCalledTimes(3);
  });
  it('retries after backoff even if reconnect happened too early', async () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useArchiveImportCleanupLifecycle());
    await act(async () => { await vi.advanceTimersByTimeAsync(30000); });
    expect(flush).toHaveBeenCalledTimes(2);
    unmount();
  });
  it('blocks offline and anonymous work', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { unmount } = renderHook(() => useArchiveImportCleanupLifecycle());
    expect(flush).not.toHaveBeenCalled();
    unmount();
    state.user = null;
    renderHook(() => useArchiveImportCleanupLifecycle());
    expect(flush).not.toHaveBeenCalled();
  });
  it('invalidates an in-flight session on account switch or unmount', () => {
    const { unmount } = renderHook(() => useArchiveImportCleanupLifecycle());
    const call = flush.mock.calls[0];
    expect(call[0].isCurrentSession()).toBe(true);
    state.user = { uid: 'other-owner', supabaseToken: 'other-token' };
    expect(call[0].isCurrentSession()).toBe(false);
    state.user = { uid: 'owner', supabaseToken: 'current-token' };
    unmount();
    expect(call[0].isCurrentSession()).toBe(false);
  });
  it('announces preserved imports requiring review using a localized message key', async () => {
    flush.mockResolvedValueOnce({ removed: 0, deferred: 0, reviewRequired: 1 });
    renderHook(() => useArchiveImportCleanupLifecycle());
    await waitFor(() => expect(warning).toHaveBeenCalledWith('messages.error.importCleanupReview', { id: 'archive-import-cleanup-review' }));
  });
});
