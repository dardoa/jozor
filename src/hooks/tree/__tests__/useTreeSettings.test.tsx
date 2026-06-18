import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { DEFAULT_TREE_SETTINGS } from '../../../constants';
import type { UserProfile } from '../../../types';
import { updateTreeSettings } from '../../../services/supabaseTreeMutationService';
import { useTreeSettings } from '../useTreeSettings';

vi.mock('../../../services/supabaseTreeMutationService', () => ({
  updateTreeSettings: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../domain/appearance/appearanceHydration', () => ({
  hydrateAppearanceLabFromLegacy: vi.fn(),
}));

const user: UserProfile = {
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'Test User',
  photoURL: '',
  supabaseToken: 'token-1',
};

describe('useTreeSettings', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    localStorage.clear();
    useAppStore.setState((state) => ({
      ...state,
      user,
      currentTreeId: 'tree-1',
      treeSettings: DEFAULT_TREE_SETTINGS,
    }));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces Supabase tree settings sync', async () => {
    renderHook(() => useTreeSettings());

    expect(updateTreeSettings).not.toHaveBeenCalled();

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(updateTreeSettings).toHaveBeenCalledTimes(1);
    expect(updateTreeSettings).toHaveBeenCalledWith(
      'tree-1',
      'user-1',
      'user@example.com',
      expect.objectContaining({ nodeWidth: DEFAULT_TREE_SETTINGS.nodeWidth })
    );
  });

  it('clears pending Supabase sync when unmounted before debounce fires', () => {
    const { unmount } = renderHook(() => useTreeSettings());

    unmount();

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(updateTreeSettings).not.toHaveBeenCalled();
  });

  it('cancels old tree sync when active tree changes before debounce fires', async () => {
    const { rerender } = renderHook(() => useTreeSettings());

    act(() => {
      vi.advanceTimersByTime(500);
    });

    act(() => {
      useAppStore.setState({ currentTreeId: 'tree-2' });
      rerender();
    });

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(updateTreeSettings).toHaveBeenCalledTimes(1);
    expect(updateTreeSettings).toHaveBeenCalledWith(
      'tree-2',
      'user-1',
      'user@example.com',
      expect.any(Object)
    );
  });
});
