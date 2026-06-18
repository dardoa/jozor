import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { showToast } from '../../../utils/showToast';
import { updateUserProfile } from '../../../services/supabaseProfileService';
import { useGlobalSettingsModalState } from '../useGlobalSettingsModalState';

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

const createDeferred = <T,>(): Deferred<T> => {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
};

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    language: 'en',
    setLanguage: vi.fn(),
    t: {
      globalSettings: {
        profile: {},
        security: {},
        tabs: {},
      },
    },
  }),
}));

vi.mock('../../../utils/showToast', () => ({
  showToast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('../../../services/supabaseProfileService', () => ({
  deleteUserAccount: vi.fn(),
  updateUserProfile: vi.fn(),
  updateUserTourStatus: vi.fn().mockResolvedValue(undefined),
}));

const user: UserProfile = {
  uid: 'user-1',
  email: 'user@example.com',
  displayName: 'User One',
  photoURL: '',
  supabaseToken: 'token-1',
};

describe('useGlobalSettingsModalState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAppStore.setState((state) => ({
      ...state,
      user,
      darkMode: false,
    }));
    vi.mocked(updateUserProfile).mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not emit stale profile save UI after unmount', async () => {
    const saveDeferred = createDeferred<void>();
    vi.mocked(updateUserProfile).mockReturnValue(saveDeferred.promise);
    const onClose = vi.fn();

    const { result, unmount } = renderHook(() => useGlobalSettingsModalState(onClose));

    act(() => {
      result.current.setDisplayName('Updated User');
    });

    let savePromise: Promise<void>;
    act(() => {
      savePromise = result.current.handleSaveProfile();
    });

    unmount();

    await act(async () => {
      saveDeferred.resolve(undefined);
      await savePromise;
    });

    expect(showToast.success).not.toHaveBeenCalled();
    expect(showToast.error).not.toHaveBeenCalled();
  });

  it('clears delayed onboarding event when unmounted after reset tour', () => {
    vi.useFakeTimers();
    const onClose = vi.fn();
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    const { result, unmount } = renderHook(() => useGlobalSettingsModalState(onClose));

    act(() => {
      result.current.handleResetTour();
    });

    expect(onClose).toHaveBeenCalledTimes(1);

    unmount();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(dispatchSpy).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'start-onboarding-tour' }));

    dispatchSpy.mockRestore();
  });

  it('restarts delete hold timer without stacking intervals', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGlobalSettingsModalState(vi.fn()));

    act(() => {
      result.current.startDeleteHold();
      result.current.startDeleteHold();
      vi.advanceTimersByTime(20);
    });

    expect(result.current.deleteProgress).toBeCloseTo(0.4);
  });
});
