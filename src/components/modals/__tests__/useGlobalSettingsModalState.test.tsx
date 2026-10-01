import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../../../types';
import { useAppStore } from '../../../store/useAppStore';
import { showToast } from '../../../utils/showToast';
import { AccountDeletionSubscriptionError, deleteUserAccount, updateUserProfile } from '../../../services/supabaseProfileService';
import { useGlobalSettingsModalState } from '../useGlobalSettingsModalState';
import { GlobalSettingsSecurityTab } from '../globalSettings/GlobalSettingsSecurityTab';

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
      deleteAccountAction: 'Delete Everything',
      deleteAccountCancel: 'Stay with Jozor',
      globalSettings: {
        profile: {},
        security: {
          startDeletion: 'Start deletion',
          subscriptionBlocksDeletion: 'Your subscription must be fully canceled before you delete this account.',
          manageSubscription: 'Manage subscription',
        },
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

vi.mock('../../../services/supabaseProfileService', async importOriginal => ({
  ...await importOriginal<typeof import('../../../services/supabaseProfileService')>(),
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
      logout: vi.fn().mockResolvedValue(undefined),
    }));
    vi.mocked(updateUserProfile).mockResolvedValue(undefined);
    vi.mocked(deleteUserAccount).mockReset().mockResolvedValue('complete');
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
      result.current.setActiveTab('security');
      result.current.setShowDeleteConfirm(true);
    });
    act(() => {
      result.current.startDeleteHold();
      result.current.startDeleteHold();
      vi.advanceTimersByTime(20);
    });

    expect(result.current.deleteProgress).toBeCloseTo(0.4);
  });

  it('executes once after five seconds under StrictMode, outside state updater replay', async () => {
    vi.useFakeTimers();
    const deferred = createDeferred<'complete' | 'pending'>();
    vi.mocked(deleteUserAccount).mockReturnValue(deferred.promise);
    const onClose = vi.fn();
    const { result } = renderHook(() => useGlobalSettingsModalState(onClose), { wrapper: StrictMode });
    act(() => {
      result.current.setActiveTab('security');
      result.current.setShowDeleteConfirm(true);
    });
    act(() => result.current.startDeleteHold());
    act(() => vi.advanceTimersByTime(4980));
    expect(deleteUserAccount).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(20));
    expect(deleteUserAccount).toHaveBeenCalledExactlyOnceWith(user.uid, user.email, user.supabaseToken);
    act(() => {
      result.current.startDeleteHold();
      vi.advanceTimersByTime(10000);
    });
    expect(deleteUserAccount).toHaveBeenCalledTimes(1);
    expect(result.current.isDeleting).toBe(true);
    await act(async () => { deferred.resolve('complete'); await deferred.promise; });
    expect(useAppStore.getState().logout).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('signs out after durable acceptance while announcing that cleanup is still pending', async () => {
    vi.useFakeTimers();
    vi.mocked(deleteUserAccount).mockResolvedValue('pending');
    const onClose = vi.fn();
    const { result } = renderHook(() => useGlobalSettingsModalState(onClose));
    act(() => { result.current.setActiveTab('security'); result.current.setShowDeleteConfirm(true); });
    act(() => result.current.startDeleteHold());
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(useAppStore.getState().logout).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(showToast.success).toHaveBeenCalledWith('globalSettings.security.deletePending');
    expect(showToast.success).not.toHaveBeenCalledWith('globalSettings.security.deleteSuccess');
  });

  it.each(['release', 'confirmation', 'tab', 'window', 'modal', 'user', 'unmount'] as const)(
    'cancels a pending destructive hold on %s', reason => {
      vi.useFakeTimers();
      const { result, rerender, unmount } = renderHook(
        ({ open }) => useGlobalSettingsModalState(vi.fn(), open), { initialProps: { open: true } });
      act(() => {
        result.current.setActiveTab('security');
        result.current.setShowDeleteConfirm(true);
      });
      act(() => result.current.startDeleteHold());
      act(() => vi.advanceTimersByTime(4000));
      act(() => {
        if (reason === 'release') result.current.cancelDeleteHold();
        if (reason === 'confirmation') result.current.setShowDeleteConfirm(false);
        if (reason === 'tab') result.current.setActiveTab('profile');
        if (reason === 'window') window.dispatchEvent(new Event('blur'));
        if (reason === 'modal') rerender({ open: false });
        if (reason === 'user') useAppStore.setState({ user: { ...user, uid: 'another-user' } });
        if (reason === 'unmount') unmount();
      });
      act(() => vi.advanceTimersByTime(10000));
      expect(deleteUserAccount).not.toHaveBeenCalled();
    }
  );

  it('refuses to arm outside the visible security confirmation', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useGlobalSettingsModalState(vi.fn()));
    act(() => { result.current.startDeleteHold(); vi.advanceTimersByTime(6000); });
    expect(deleteUserAccount).not.toHaveBeenCalled();
    expect(result.current.deleteProgress).toBe(0);
  });

  it('allows a deliberate retry after a failed request without logging out', async () => {
    vi.useFakeTimers();
    vi.mocked(deleteUserAccount).mockRejectedValueOnce(new Error('Synthetic deletion failure'));
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { result } = renderHook(() => useGlobalSettingsModalState(vi.fn()));
    act(() => {
      result.current.setActiveTab('security');
      result.current.setShowDeleteConfirm(true);
    });
    act(() => result.current.startDeleteHold());
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(result.current.isDeleting).toBe(false);
    expect(useAppStore.getState().logout).not.toHaveBeenCalled();
    act(() => result.current.startDeleteHold());
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(deleteUserAccount).toHaveBeenCalledTimes(2);
    expect(useAppStore.getState().logout).toHaveBeenCalledTimes(1);
    log.mockRestore();
  });

  const SecurityHarness = () => {
    const state = useGlobalSettingsModalState(vi.fn());
    return <>
      <button onClick={() => state.setActiveTab('security')}>Security</button>
      <GlobalSettingsSecurityTab {...state} />
    </>;
  };
  const openConfirmation = () => {
    render(<SecurityHarness />);
    fireEvent.click(screen.getByText('Security'));
    fireEvent.click(screen.getByText('Start deletion'));
    return screen.getByRole('button', { name: 'Delete Everything' });
  };

  it.each(['Enter', ' '])('supports a full keyboard hold using %j without restarting on key repeat', async key => {
    vi.useFakeTimers();
    const button = openConfirmation();
    fireEvent.keyDown(button, { key });
    act(() => vi.advanceTimersByTime(4900));
    fireEvent.keyDown(button, { key, repeat: true });
    expect(deleteUserAccount).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(deleteUserAccount).toHaveBeenCalledTimes(1);
  });

  it.each(['key-up', 'blur', 'touch-cancel', 'cancel-button'])(
    'cancels the real confirmation control on %s', reason => {
      vi.useFakeTimers();
      const button = openConfirmation();
      if (reason === 'touch-cancel') fireEvent.touchStart(button);
      else fireEvent.keyDown(button, { key: 'Enter' });
      act(() => vi.advanceTimersByTime(4000));
      if (reason === 'key-up') fireEvent.keyUp(button, { key: 'Enter' });
      if (reason === 'blur') fireEvent.blur(button);
      if (reason === 'touch-cancel') fireEvent.touchCancel(button);
      if (reason === 'cancel-button') fireEvent.click(screen.getByText('Stay with Jozor'));
      act(() => vi.advanceTimersByTime(2000));
      expect(deleteUserAccount).not.toHaveBeenCalled();
    }
  );

  it('does not arm deletion on a right mouse click or a normal click', () => {
    vi.useFakeTimers();
    const button = openConfirmation();
    fireEvent.mouseDown(button, { button: 2 });
    fireEvent.click(button);
    act(() => vi.advanceTimersByTime(6000));
    expect(deleteUserAccount).not.toHaveBeenCalled();
  });

  it('shows billing recovery without logout or generic errors and allows a deliberate retry', async () => {
    vi.useFakeTimers();
    vi.mocked(deleteUserAccount).mockRejectedValueOnce(new AccountDeletionSubscriptionError());
    const button = openConfirmation();
    fireEvent.keyDown(button, { key: ' ' });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(screen.getByRole('alert')).toHaveTextContent('Your subscription must be fully canceled');
    expect(screen.getByRole('button', { name: 'Manage subscription' })).toBeVisible();
    expect(useAppStore.getState().logout).not.toHaveBeenCalled();
    expect(showToast.error).not.toHaveBeenCalled();
    expect(button).toBeEnabled();
    fireEvent.keyUp(button, { key: ' ' });
    fireEvent.keyDown(button, { key: ' ' });
    await act(async () => { await vi.advanceTimersByTimeAsync(5000); });
    expect(deleteUserAccount).toHaveBeenCalledTimes(2);
    expect(useAppStore.getState().logout).toHaveBeenCalledTimes(1);
  });

  it('disarms deletion and closes settings before opening subscription management', () => {
    vi.useFakeTimers();
    const events: string[] = [];
    const onOpen = () => events.push('paywall');
    window.addEventListener('open-paywall', onOpen);
    const { result } = renderHook(() => useGlobalSettingsModalState(() => events.push('close')));
    act(() => {
      result.current.setActiveTab('security');
      result.current.setShowDeleteConfirm(true);
    });
    act(() => result.current.startDeleteHold());
    act(() => vi.advanceTimersByTime(4000));
    act(() => result.current.openSubscriptionManagement());
    act(() => vi.advanceTimersByTime(6000));
    expect(events).toEqual(['close', 'paywall']);
    expect(deleteUserAccount).not.toHaveBeenCalled();
    window.removeEventListener('open-paywall', onOpen);
  });
});
