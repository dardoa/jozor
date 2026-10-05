import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { StrictMode, useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../../../utils/translations/en';
import { GlobalSettingsPreferencesTab } from '../globalSettings/GlobalSettingsPreferencesTab';
import { GlobalSettingsModal } from '../GlobalSettingsModal';
import { authTokenService } from '../../../services/authTokenService';

const doubles = vi.hoisted(() => ({
  user: { uid: 'user-1', supabaseToken: 'token-1' } as { uid: string; supabaseToken: string } | null,
  registerSubscription: vi.fn(),
  listSubscriptions: vi.fn(),
  removeSubscription: vi.fn(),
  fetch: vi.fn(),
  listeners: new Set<() => void>(),
}));

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: Object.assign((select: (state: unknown) => unknown) => select({ user: doubles.user }), {
    getState: () => ({ user: doubles.user }),
    subscribe: (listener: () => void) => {
      doubles.listeners.add(listener);
      return () => { doubles.listeners.delete(listener); };
    },
  }),
}));
vi.mock('../../../context/OverlayContext', () => ({
  OverlayPrimitive: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => isOpen ? children : null,
}));
vi.mock('../useGlobalSettingsModalState', () => ({
  useGlobalSettingsModalState: () => {
    const [activeTab, setActiveTab] = useState('preferences');
    return { t: en, user: doubles.user, activeTab, setActiveTab, showTourConfirm: false,
      language: 'en', setLanguage: vi.fn(), darkMode: false, handleToggleTheme: vi.fn(),
      isLowGraphicsMode: false, setIsLowGraphicsMode: vi.fn(), setShowTourConfirm: vi.fn() };
  },
}));
vi.mock('../globalSettings/GlobalSettingsProfileTab', () => ({ GlobalSettingsProfileTab: () => null }));
vi.mock('../globalSettings/GlobalSettingsSecurityTab', () => ({ GlobalSettingsSecurityTab: () => null }));
vi.mock('../../../services/pushSubscriptionService', () => ({
  registerSubscription: doubles.registerSubscription,
  listSubscriptions: doubles.listSubscriptions,
  removeSubscription: doubles.removeSubscription,
}));
vi.mock('../../../utils/errorLogger', () => ({ logInfo: vi.fn(), logError: vi.fn() }));

const subscription = {
  endpoint: 'https://push.example/device',
  toJSON: () => ({ endpoint: 'https://push.example/device', keys: { p256dh: 'device-key', auth: 'auth-key' } }),
  unsubscribe: vi.fn(),
};
const registration = {
  pushManager: { getSubscription: vi.fn(), subscribe: vi.fn() },
};
const worker = { register: vi.fn(), getRegistration: vi.fn(), ready: Promise.resolve(registration) };
const notifications = { permission: 'default', requestPermission: vi.fn() };
const pendingResolutions = new Set<() => void>();
const setTestUser = (next: typeof doubles.user) => {
  doubles.user = next;
  [...doubles.listeners].forEach(listener => listener());
};
const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  const drain = () => resolve(undefined as T);
  pendingResolutions.add(drain);
  void promise.then(() => pendingResolutions.delete(drain), () => pendingResolutions.delete(drain));
  return { promise, resolve, reject };
};
const seedEnabled = () => {
  notifications.permission = 'granted';
  registration.pushManager.getSubscription.mockResolvedValue(subscription);
  doubles.listSubscriptions.mockResolvedValue([{ endpoint: subscription.endpoint }]);
  subscription.unsubscribe.mockImplementation(async () => {
    registration.pushManager.getSubscription.mockResolvedValue(null);
    doubles.listSubscriptions.mockResolvedValue([]);
    return true;
  });
};
const renderSettings = () => render(<GlobalSettingsModal isOpen onClose={vi.fn()} />);

const renderPreferences = () => render(<GlobalSettingsPreferencesTab
  t={en} language="en" setLanguage={vi.fn()} darkMode={false}
  handleToggleTheme={vi.fn()} isLowGraphicsMode={false}
  setIsLowGraphicsMode={vi.fn()} setShowTourConfirm={vi.fn()}
/>);
const rerenderPreferences = (view: ReturnType<typeof renderPreferences>) => view.rerender(
  <GlobalSettingsPreferencesTab t={en} language="en" setLanguage={vi.fn()} darkMode={false}
    handleToggleTheme={vi.fn()} isLowGraphicsMode={false} setIsLowGraphicsMode={vi.fn()} setShowTourConfirm={vi.fn()} />
);

describe('push notification preference', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setTestUser({ uid: 'user-1', supabaseToken: 'token-1' });
    doubles.listSubscriptions.mockResolvedValue([]);
    doubles.registerSubscription.mockResolvedValue({ id: 'stored-subscription' });
    doubles.removeSubscription.mockResolvedValue(undefined);
    doubles.fetch.mockResolvedValue({ ok: true, json: async () => ({ sent: 1 }) });
    notifications.permission = 'default';
    notifications.requestPermission.mockImplementation(async () => {
      notifications.permission = 'granted';
      return 'granted';
    });
    registration.pushManager.getSubscription.mockResolvedValue(null);
    registration.pushManager.subscribe.mockResolvedValue(subscription);
    subscription.unsubscribe.mockResolvedValue(true);
    worker.register.mockResolvedValue(registration);
    worker.getRegistration.mockResolvedValue(registration);
    vi.stubGlobal('Notification', notifications);
    vi.stubGlobal('PushManager', function PushManager() {});
    vi.stubGlobal('navigator', Object.create(navigator, { serviceWorker: { value: worker } }));
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AQID');
    vi.stubGlobal('fetch', doubles.fetch);
  });

  afterEach(async () => {
    cleanup();
    act(() => setTestUser(null));
    await act(async () => { [...pendingResolutions].forEach(resolve => resolve()); });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it.each(['before', 'after'])('finishes disable across settings close and reopen %s settlement', async timing => {
    seedEnabled();
    const deletion = deferred<void>();
    doubles.removeSubscription.mockReturnValueOnce(deletion.promise);
    const view = renderSettings();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await waitFor(() => expect(doubles.removeSubscription).toHaveBeenCalledOnce());
    view.unmount();
    if (timing === 'after') await act(async () => deletion.resolve());
    renderSettings();
    if (timing === 'before') {
      const pending = screen.getByRole('switch', { name: 'Push notifications' });
      expect(pending).toHaveAttribute('aria-busy', 'true');
      expect(pending).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
      fireEvent.click(screen.getByRole('button', { name: 'Send test notification' }));
      await act(async () => deletion.resolve());
    }
    await waitFor(() => expect(subscription.unsubscribe).toHaveBeenCalledOnce());
    expect(screen.getByRole('switch', { name: 'Push notifications' })).not.toBeChecked();
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
    expect(doubles.fetch).not.toHaveBeenCalled();
  });

  it('retains disable across preferences tab changes', async () => {
    seedEnabled();
    const deletion = deferred<void>();
    doubles.removeSubscription.mockReturnValueOnce(deletion.promise);
    renderSettings();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await waitFor(() => expect(doubles.removeSubscription).toHaveBeenCalledOnce());
    fireEvent.click(screen.getByRole('button', { name: en.globalSettings.tabs.profile }));
    expect(screen.queryByRole('switch', { name: 'Push notifications' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: en.globalSettings.tabs.preferences }));
    expect(await screen.findByRole('switch', { name: 'Push notifications' })).toBeDisabled();
    await act(async () => deletion.resolve());
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).not.toBeChecked());
    expect(doubles.removeSubscription).toHaveBeenCalledOnce();
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
  });

  it.each(['server', 'browser-reject', 'browser-false'])('retains rejected and partial disable on remount: %s', async failure => {
    seedEnabled();
    if (failure === 'server') doubles.removeSubscription.mockRejectedValueOnce(new Error('offline'));
    if (failure === 'browser-reject') subscription.unsubscribe.mockRejectedValueOnce(new Error('offline'));
    if (failure === 'browser-false') subscription.unsubscribe.mockResolvedValueOnce(false);
    const view = renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(toggle).toBeChecked());
    fireEvent.click(toggle);
    await screen.findByText('Could not update push notifications');
    if (failure !== 'server') doubles.listSubscriptions.mockResolvedValue([]);
    view.unmount();
    renderPreferences();
    expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked();
    expect(screen.getByText('Could not update push notifications')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).not.toBeChecked());
    expect(doubles.removeSubscription).toHaveBeenCalledTimes(2);
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
  });

  it.each(['different', 'logout-login'])('stops departed account follow ups without a mounted view: %s', async transition => {
    seedEnabled();
    const deletion = deferred<void>();
    doubles.removeSubscription.mockReturnValueOnce(deletion.promise);
    const view = renderPreferences();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await waitFor(() => expect(doubles.removeSubscription).toHaveBeenCalledOnce());
    view.unmount();
    if (transition === 'logout-login') setTestUser(null);
    setTestUser({ uid: transition === 'different' ? 'user-2' : 'user-1', supabaseToken: 'new-token' });
    const reopen = renderPreferences();
    expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeDisabled();
    doubles.listSubscriptions.mockResolvedValue([]);
    await act(async () => deletion.resolve());
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).not.toBeDisabled());
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    expect(doubles.removeSubscription).toHaveBeenCalledOnce();
    expect(screen.queryByText('Could not update push notifications')).not.toBeInTheDocument();
    reopen.unmount();
  });

  it('does not revive a deleted row through late inspection', async () => {
    seedEnabled();
    const lookup = deferred<{ endpoint: string }[]>();
    doubles.listSubscriptions.mockResolvedValueOnce([{ endpoint: subscription.endpoint }]).mockReturnValueOnce(lookup.promise);
    renderPreferences();
    renderPreferences();
    await waitFor(() => expect(doubles.listSubscriptions).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getAllByRole('switch', { name: 'Push notifications' })[0]);
    await waitFor(() => expect(subscription.unsubscribe).toHaveBeenCalledOnce());
    await act(async () => lookup.resolve([{ endpoint: subscription.endpoint }]));
    expect(screen.getAllByRole('switch', { name: 'Push notifications' }).every(toggle => toggle.getAttribute('aria-checked') === 'false')).toBe(true);
  });

  it('uses refreshed owner token before removal dispatch', async () => {
    seedEnabled();
    const browser = deferred<typeof subscription>();
    const view = renderPreferences();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    registration.pushManager.getSubscription.mockReturnValueOnce(browser.promise);
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    act(() => setTestUser({ uid: 'user-1', supabaseToken: 'token-1-refreshed' }));
    rerenderPreferences(view);
    await act(async () => browser.resolve(subscription));
    await waitFor(() => expect(doubles.removeSubscription).toHaveBeenCalledWith(subscription.endpoint, 'user-1', 'token-1-refreshed'));
  });

  it('refuses delayed foreign credentials', async () => {
    seedEnabled();
    const credentials = deferred<string>();
    const view = renderPreferences();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    const reader = vi.spyOn(authTokenService, 'getPreferredSupabaseToken').mockReturnValueOnce(credentials.promise);
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await waitFor(() => expect(reader).toHaveBeenCalled());
    view.unmount();
    setTestUser({ uid: 'user-2', supabaseToken: 'token-2' });
    await act(async () => credentials.resolve('token-2'));
    expect(doubles.removeSubscription).not.toHaveBeenCalled();
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
  });

  it.each(['foreign', 'lookup-error'])('fails closed on changed retry endpoint: %s', async ownership => {
    seedEnabled();
    subscription.unsubscribe.mockResolvedValueOnce(false);
    renderPreferences();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await screen.findByText('Could not update push notifications');
    const different = { ...subscription, endpoint: 'https://push.example/other', unsubscribe: vi.fn() };
    registration.pushManager.getSubscription.mockResolvedValue(different);
    if (ownership === 'foreign') doubles.listSubscriptions.mockResolvedValue([]);
    else doubles.listSubscriptions.mockRejectedValue(new Error('offline'));
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).not.toBeDisabled());
    expect(doubles.removeSubscription).toHaveBeenCalledOnce();
    expect(different.unsubscribe).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
  });

  it('survives StrictMode observer replay without automatic mutations', async () => {
    seedEnabled();
    const view = render(<StrictMode><GlobalSettingsPreferencesTab
      t={en} language="en" setLanguage={vi.fn()} darkMode={false} handleToggleTheme={vi.fn()}
      isLowGraphicsMode={false} setIsLowGraphicsMode={vi.fn()} setShowTourConfirm={vi.fn()} /></StrictMode>);
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    expect(notifications.requestPermission).not.toHaveBeenCalled();
    expect(doubles.removeSubscription).not.toHaveBeenCalled();
    view.unmount();
    setTestUser(null);
    expect(doubles.listeners.size).toBe(0);
  });

  it('blocks all competing observers while work is pending', async () => {
    seedEnabled();
    const deletion = deferred<void>();
    doubles.removeSubscription.mockReturnValueOnce(deletion.promise);
    renderPreferences(); renderPreferences();
    await waitFor(() => expect(screen.getAllByRole('switch', { name: 'Push notifications' })[0]).toBeChecked());
    const toggles = screen.getAllByRole('switch', { name: 'Push notifications' });
    fireEvent.click(toggles[0]);
    fireEvent.click(toggles[1]);
    await waitFor(() => expect(doubles.removeSubscription).toHaveBeenCalledOnce());
    expect(toggles[1]).toBeDisabled();
    for (const button of screen.getAllByRole('button', { name: 'Send test notification' })) {
      expect(button).toBeDisabled();
      fireEvent.click(button);
    }
    await act(async () => deletion.resolve());
    expect(doubles.fetch).not.toHaveBeenCalled();
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
  });

  it.each(['browser-absent', 'server-absent'])('reconciles retained success on reopen after %s', async change => {
    seedEnabled();
    const view = renderPreferences();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    view.unmount();
    if (change === 'browser-absent') registration.pushManager.getSubscription.mockResolvedValue(null);
    else doubles.listSubscriptions.mockResolvedValue([]);
    renderPreferences();
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).not.toBeChecked());
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
    expect(doubles.removeSubscription).not.toHaveBeenCalled();
  });

  it('reconciles ordinary failed activation after settings reopen', async () => {
    doubles.registerSubscription.mockRejectedValueOnce(new Error('offline'));
    const view = renderPreferences();
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await screen.findByText('Could not update push notifications');
    view.unmount();
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockResolvedValue([{ endpoint: subscription.endpoint }]);
    renderPreferences();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    expect(screen.getByRole('button', { name: 'Send test notification' })).not.toBeDisabled();
    expect(doubles.registerSubscription).toHaveBeenCalledOnce();
  });

  it('allows changed retry endpoint only after current ownership is confirmed', async () => {
    seedEnabled();
    subscription.unsubscribe.mockResolvedValueOnce(false);
    renderPreferences();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await screen.findByText('Could not update push notifications');
    const current = { ...subscription, endpoint: 'https://push.example/current', unsubscribe: vi.fn().mockResolvedValue(true) };
    registration.pushManager.getSubscription.mockResolvedValue(current);
    doubles.listSubscriptions.mockResolvedValue([{ endpoint: current.endpoint }]);
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).not.toBeChecked());
    expect(doubles.removeSubscription).toHaveBeenLastCalledWith(current.endpoint, 'user-1', 'token-1');
    expect(current.unsubscribe).toHaveBeenCalledOnce();
  });

  it('never promotes a failed changed-endpoint lookup into trusted retry proof', async () => {
    seedEnabled();
    subscription.unsubscribe.mockResolvedValueOnce(false);
    renderPreferences();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await screen.findByText('Could not update push notifications');
    const foreign = { ...subscription, endpoint: 'https://push.example/foreign', unsubscribe: vi.fn() };
    registration.pushManager.getSubscription.mockResolvedValue(foreign);
    doubles.listSubscriptions.mockResolvedValue([]);
    for (let retry = 0; retry < 2; retry++) {
      fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
      await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).not.toBeDisabled());
    }
    expect(doubles.removeSubscription).toHaveBeenCalledOnce();
    expect(foreign.unsubscribe).not.toHaveBeenCalled();
  });

  it('keeps partial retry after permission revoke and regrant across remount', async () => {
    seedEnabled();
    subscription.unsubscribe.mockResolvedValueOnce(false);
    const view = renderPreferences();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await screen.findByText('Could not update push notifications');
    view.unmount();
    doubles.listSubscriptions.mockResolvedValue([]);
    notifications.permission = 'denied';
    renderPreferences();
    expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeDisabled();
    notifications.permission = 'granted';
    fireEvent.focus(window);
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).not.toBeChecked());
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
    expect(notifications.requestPermission).not.toHaveBeenCalled();
  });

  it('drops a settled retry on logout and same UID login while settings are closed', async () => {
    seedEnabled();
    subscription.unsubscribe.mockResolvedValueOnce(false);
    const view = renderPreferences();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await screen.findByText('Could not update push notifications');
    view.unmount();
    setTestUser(null);
    setTestUser({ uid: 'user-1', supabaseToken: 'new-session-token' });
    doubles.listSubscriptions.mockResolvedValue([]);
    renderPreferences();
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).not.toBeDisabled());
    expect(screen.getByRole('switch', { name: 'Push notifications' })).not.toBeChecked();
    expect(screen.queryByText('Could not update push notifications')).not.toBeInTheDocument();
  });

  it('cancels enable follow ups after its originating view closes', async () => {
    const browser = deferred<typeof subscription>();
    registration.pushManager.subscribe.mockReturnValueOnce(browser.promise);
    const view = renderPreferences();
    fireEvent.click(screen.getByRole('switch', { name: 'Push notifications' }));
    await waitFor(() => expect(registration.pushManager.subscribe).toHaveBeenCalledOnce());
    view.unmount();
    renderPreferences();
    expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeDisabled();
    await act(async () => browser.resolve(subscription));
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).not.toBeDisabled());
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
  });

  it('retains enabled state and retries disable when server removal fails', async () => {
    notifications.permission = 'granted';
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockResolvedValue([{ endpoint: subscription.endpoint }]);
    doubles.removeSubscription.mockRejectedValueOnce(new Error('offline'));
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(toggle).toBeChecked());
    fireEvent.click(toggle);
    expect(await screen.findByText('Could not update push notifications')).toBeVisible();
    expect(toggle).toBeChecked();
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(doubles.removeSubscription).toHaveBeenCalledTimes(2);
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
  });

  it('retains disable retry but blocks test send after browser unsubscribe fails', async () => {
    notifications.permission = 'granted';
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockResolvedValue([{ endpoint: subscription.endpoint }]);
    subscription.unsubscribe.mockResolvedValueOnce(false).mockResolvedValue(true);
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(toggle).toBeChecked());
    fireEvent.click(toggle);
    expect(await screen.findByText('Could not update push notifications')).toBeVisible();
    expect(toggle).toBeChecked();
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(2);
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
  });

  it('rotates an unowned browser endpoint without removing another account row', async () => {
    notifications.permission = 'granted';
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    const fresh = { ...subscription, endpoint: 'https://push.example/fresh',
      toJSON: () => ({ endpoint: 'https://push.example/fresh', keys: { p256dh: 'new-key', auth: 'new-auth' } }) };
    registration.pushManager.subscribe.mockResolvedValue(fresh);
    setTestUser({ uid: 'user-2', supabaseToken: 'token-2' });
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(toggle).not.toBeDisabled());
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(doubles.registerSubscription).toHaveBeenCalledWith({ endpoint: fresh.endpoint,
      keys: { p256dh: 'new-key', auth: 'new-auth' } }, 'user-2', 'token-2');
    expect(doubles.removeSubscription).not.toHaveBeenCalled();
    expect(notifications.requestPermission).not.toHaveBeenCalled();
  });

  it('reuses a confirmed same-owner endpoint without rotation or permission prompting', async () => {
    notifications.permission = 'granted';
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockResolvedValueOnce([]).mockResolvedValue([{ endpoint: subscription.endpoint }]);
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(toggle).not.toBeDisabled());
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
    expect(notifications.requestPermission).not.toHaveBeenCalled();
  });

  it('fails closed when rotation returns the same unowned endpoint', async () => {
    notifications.permission = 'granted';
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(toggle).not.toBeDisabled());
    fireEvent.click(toggle);
    expect(await screen.findByText('Could not update push notifications')).toBeVisible();
    expect(toggle).not.toBeChecked();
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
  });

  it('does not rotate or save when ownership lookup fails', async () => {
    notifications.permission = 'granted';
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockResolvedValueOnce([]).mockRejectedValue(new Error('lookup offline'));
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(toggle).not.toBeDisabled());
    fireEvent.click(toggle);
    expect(await screen.findByText('Could not update push notifications')).toBeVisible();
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
  });

  it.each(['permission', 'ownership', 'rotation', 'subscribe', 'save', 'disable'])(
    'stops account-specific follow-up when account changes during %s', async stage => {
      if (['ownership', 'rotation', 'disable'].includes(stage)) {
        notifications.permission = 'granted';
        registration.pushManager.getSubscription.mockResolvedValue(subscription);
      }
      if (stage === 'disable') doubles.listSubscriptions.mockResolvedValue([{ endpoint: subscription.endpoint }]);
      const view = renderPreferences();
      const toggle = screen.getByRole('switch', { name: 'Push notifications' });
      await waitFor(() => expect(toggle).not.toBeDisabled());
      let finish: (() => void) | undefined;
      const pending = <T,>(result: T) => new Promise<T>(resolve => { finish = () => resolve(result); });
      if (stage === 'permission') notifications.requestPermission.mockImplementationOnce(() => pending('granted'));
      if (stage === 'ownership') doubles.listSubscriptions.mockImplementationOnce(() => pending([]));
      if (stage === 'rotation') subscription.unsubscribe.mockImplementationOnce(() => pending(true));
      if (stage === 'subscribe') registration.pushManager.subscribe.mockImplementationOnce(() => pending(subscription));
      if (stage === 'save') doubles.registerSubscription.mockImplementationOnce(() => pending({ id: 'saved' }));
      if (stage === 'disable') doubles.removeSubscription.mockImplementationOnce(() => pending(undefined));
      fireEvent.click(toggle);
      await waitFor(() => expect(finish).toBeTypeOf('function'));
      doubles.listSubscriptions.mockResolvedValue([]);
      act(() => setTestUser({ uid: 'user-2', supabaseToken: 'token-2' }));
      await act(async () => rerenderPreferences(view));
      await act(async () => finish!());
      expect(toggle).not.toBeChecked();
      if (stage === 'permission') expect(worker.register).not.toHaveBeenCalled();
      if (stage === 'ownership' || stage === 'disable') expect(subscription.unsubscribe).not.toHaveBeenCalled();
      if (stage === 'rotation') expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
      if (stage === 'subscribe') expect(doubles.registerSubscription).not.toHaveBeenCalled();
      expect(doubles.registerSubscription.mock.calls.every(call => call[1] === 'user-1' && call[2] === 'token-1')).toBe(true);
    }
  );

  it('does not revive a stale save after logout and login to the same UID', async () => {
    let finish!: () => void;
    doubles.registerSubscription.mockImplementationOnce(() => new Promise<void>(resolve => { finish = resolve; }));
    const view = renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    fireEvent.click(toggle);
    await waitFor(() => expect(doubles.registerSubscription).toHaveBeenCalledOnce());
    act(() => setTestUser(null));
    await act(async () => rerenderPreferences(view));
    act(() => setTestUser({ uid: 'user-1', supabaseToken: 'new-session-token' }));
    await act(async () => rerenderPreferences(view));
    await act(async () => finish());
    expect(toggle).not.toBeChecked();
  });

  it('requests permission only on activation and stores the device before marking it enabled', async () => {
    renderPreferences();
    const toggle = await screen.findByRole('switch', { name: 'Push notifications' });
    expect(toggle).not.toBeChecked();
    expect(notifications.requestPermission).not.toHaveBeenCalled();
    expect(worker.register).not.toHaveBeenCalled();

    fireEvent.click(toggle);
    expect(notifications.requestPermission).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(doubles.registerSubscription).toHaveBeenCalledWith({
      endpoint: 'https://push.example/device', keys: { p256dh: 'device-key', auth: 'auth-key' },
    }, 'user-1', 'token-1');
  });

  it('reports blocked permission without creating a subscription', async () => {
    notifications.requestPermission.mockImplementation(async () => {
      notifications.permission = 'denied';
      return 'denied';
    });
    renderPreferences();
    fireEvent.click(await screen.findByRole('switch', { name: 'Push notifications' }));
    expect(await screen.findByText('Blocked by browser permissions')).toBeVisible();
    expect(worker.register).not.toHaveBeenCalled();
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
  });

  it.each(['focus', 'visibilitychange'])('reconciles a granted permission on %s without prompting or subscribing', async event => {
    notifications.permission = 'denied';
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    expect(toggle).toBeDisabled();
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockResolvedValue([{ endpoint: subscription.endpoint }]);
    notifications.permission = 'granted';
    if (event === 'focus') fireEvent.focus(window);
    else fireEvent(document, new Event('visibilitychange'));
    await waitFor(() => expect(toggle).toBeChecked());
    expect(toggle).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Send test notification' })).not.toBeDisabled();
    expect(notifications.requestPermission).not.toHaveBeenCalled();
    expect(worker.register).not.toHaveBeenCalled();
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
  });

  it('reconciles permission revocation from the Permissions API while mounted', async () => {
    const permissionStatus = new EventTarget();
    vi.stubGlobal('navigator', Object.create(navigator, {
      permissions: { value: { query: vi.fn().mockResolvedValue(permissionStatus) } },
    }));
    notifications.permission = 'granted';
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockResolvedValue([{ endpoint: subscription.endpoint }]);
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(toggle).toBeChecked());
    notifications.permission = 'denied';
    act(() => { permissionStatus.dispatchEvent(new Event('change')); });
    expect(await screen.findByText('Blocked by browser permissions')).toBeVisible();
    expect(toggle).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    expect(doubles.removeSubscription).not.toHaveBeenCalled();
  });

  it('uses focus reconciliation when notification permission querying rejects', async () => {
    vi.stubGlobal('navigator', Object.create(navigator, {
      permissions: { value: { query: vi.fn().mockRejectedValue(new TypeError('Unsupported permission')) } },
    }));
    notifications.permission = 'denied';
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    notifications.permission = 'default';
    fireEvent.focus(window);
    await waitFor(() => expect(toggle).not.toBeDisabled());
    expect(toggle).not.toBeChecked();
    expect(notifications.requestPermission).not.toHaveBeenCalled();
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
  });

  it('ignores an old ownership lookup after permission is revoked', async () => {
    let finishLookup!: (rows: { endpoint: string }[]) => void;
    notifications.permission = 'granted';
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockImplementationOnce(() => new Promise(resolve => { finishLookup = resolve; }));
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(finishLookup).toBeTypeOf('function'));
    notifications.permission = 'denied';
    fireEvent.focus(window);
    await act(async () => finishLookup([{ endpoint: subscription.endpoint }]));
    expect(toggle).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
    expect(screen.getByText('Blocked by browser permissions')).toBeVisible();
  });

  it('does not publish enabled state when permission is revoked during saving', async () => {
    let finishSave!: () => void;
    doubles.registerSubscription.mockImplementationOnce(() => new Promise<void>(resolve => { finishSave = resolve; }));
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    fireEvent.click(toggle);
    await waitFor(() => expect(finishSave).toBeTypeOf('function'));
    notifications.permission = 'denied';
    fireEvent.focus(window);
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
    await act(async () => finishSave());
    expect(toggle).not.toBeChecked();
    expect(screen.getByText('Blocked by browser permissions')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
    expect(doubles.removeSubscription).not.toHaveBeenCalled();
  });

  it('ignores hidden-page focus until visibility returns', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    notifications.permission = 'denied';
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    notifications.permission = 'granted';
    fireEvent.focus(window);
    expect(toggle).toBeDisabled();
    expect(worker.getRegistration).not.toHaveBeenCalled();
    visibility.mockReturnValue('visible');
    fireEvent(document, new Event('visibilitychange'));
    await waitFor(() => expect(toggle).not.toBeDisabled());
    expect(toggle).not.toBeChecked();
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  });

  it('does not restart activation after revocation and regrant while worker registration is pending', async () => {
    let finishWorker!: () => void;
    worker.register.mockImplementationOnce(() => new Promise(resolve => { finishWorker = () => resolve(registration); }));
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    fireEvent.click(toggle);
    await waitFor(() => expect(finishWorker).toBeTypeOf('function'));
    notifications.permission = 'denied';
    fireEvent.focus(window);
    notifications.permission = 'granted';
    fireEvent.focus(window);
    await act(async () => finishWorker());
    await waitFor(() => expect(toggle).not.toBeDisabled());
    expect(toggle).not.toBeChecked();
    expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
  });

  it('defers ownership reinspection until a pending disable finishes after permission changes', async () => {
    let finishDelete!: () => void;
    notifications.permission = 'granted';
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockResolvedValue([{ endpoint: subscription.endpoint }]);
    doubles.removeSubscription.mockImplementationOnce(() => new Promise<void>(resolve => { finishDelete = resolve; }));
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(toggle).toBeChecked());
    fireEvent.click(toggle);
    await waitFor(() => expect(finishDelete).toBeTypeOf('function'));
    notifications.permission = 'denied';
    fireEvent.focus(window);
    notifications.permission = 'granted';
    fireEvent.focus(window);
    expect(doubles.listSubscriptions).toHaveBeenCalledTimes(2);
    expect(toggle).toBeDisabled();
    doubles.listSubscriptions.mockResolvedValue([]);
    await act(async () => finishDelete());
    await waitFor(() => expect(doubles.listSubscriptions).toHaveBeenCalledTimes(3));
    expect(toggle).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(doubles.registerSubscription).not.toHaveBeenCalled();
  });

  it('does not restart a read-only lookup for duplicate focus and visibility events', async () => {
    notifications.permission = 'denied';
    renderPreferences();
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockResolvedValue([{ endpoint: subscription.endpoint }]);
    notifications.permission = 'granted';
    fireEvent.focus(window);
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Push notifications' })).toBeChecked());
    fireEvent.focus(window);
    fireEvent(document, new Event('visibilitychange'));
    expect(doubles.listSubscriptions).toHaveBeenCalledOnce();
    expect(notifications.requestPermission).not.toHaveBeenCalled();
  });

  it.each(['unavailable', 'rejected'])('reconciles a permission reset after successful activation with %s querying', async support => {
    vi.stubGlobal('navigator', Object.create(navigator, {
      permissions: { value: support === 'unavailable' ? undefined
        : { query: vi.fn().mockRejectedValue(new TypeError('Unsupported permission')) } },
    }));
    renderPreferences();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(screen.getByRole('button', { name: 'Send test notification' })).not.toBeDisabled();
    notifications.permission = 'default';
    fireEvent.focus(window);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(screen.getByRole('button', { name: 'Send test notification' })).toBeDisabled();
    expect(notifications.requestPermission).toHaveBeenCalledOnce();
    expect(registration.pushManager.subscribe).toHaveBeenCalledOnce();
    expect(doubles.removeSubscription).not.toHaveBeenCalled();
  });

  it('detaches a permission listener when preferences unmount', async () => {
    const permissionStatus = new EventTarget();
    const add = vi.spyOn(permissionStatus, 'addEventListener');
    const remove = vi.spyOn(permissionStatus, 'removeEventListener');
    vi.stubGlobal('navigator', Object.create(navigator, {
      permissions: { value: { query: vi.fn().mockResolvedValue(permissionStatus) } },
    }));
    const view = renderPreferences();
    await waitFor(() => expect(add).toHaveBeenCalledWith('change', expect.any(Function)));
    view.unmount();
    expect(remove).toHaveBeenCalledWith('change', add.mock.calls[0][1]);
  });

  it('does not attach a permission listener from a query that resolves after unmount', async () => {
    const permissionStatus = new EventTarget();
    const add = vi.spyOn(permissionStatus, 'addEventListener');
    let finishQuery!: (value: EventTarget) => void;
    vi.stubGlobal('navigator', Object.create(navigator, {
      permissions: { value: { query: vi.fn().mockImplementation(() => new Promise(resolve => { finishQuery = resolve; })) } },
    }));
    const view = renderPreferences();
    view.unmount();
    await act(async () => finishQuery(permissionStatus));
    expect(add).not.toHaveBeenCalled();
    expect(worker.register).not.toHaveBeenCalled();
  });

  it('keeps the switch off when saving fails and allows retrying', async () => {
    doubles.registerSubscription.mockRejectedValueOnce(new Error('Save failed'));
    renderPreferences();
    const toggle = await screen.findByRole('switch', { name: 'Push notifications' });
    fireEvent.click(toggle);
    expect(await screen.findByText('Could not update push notifications')).toBeVisible();
    expect(toggle).not.toBeChecked();
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
  });

  it('disables activation in unsupported browsers', async () => {
    vi.stubGlobal('PushManager', undefined);
    renderPreferences();
    expect(await screen.findByRole('switch', { name: 'Push notifications' })).toBeDisabled();
    expect(screen.getByText('Not supported in this browser')).toBeVisible();
  });

  it('restores the saved device state and removes it when disabled', async () => {
    notifications.permission = 'granted';
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockResolvedValue([{ endpoint: subscription.endpoint }]);
    renderPreferences();
    const toggle = await screen.findByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(toggle).toBeChecked());
    expect(notifications.requestPermission).not.toHaveBeenCalled();
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(doubles.removeSubscription).toHaveBeenCalledWith(subscription.endpoint, 'user-1', 'token-1');
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not mark a new account as enabled after a stale registration finishes', async () => {
    let finishSave!: () => void;
    doubles.registerSubscription.mockImplementationOnce(() => new Promise<void>(resolve => { finishSave = resolve; }));
    const view = renderPreferences();
    const toggle = await screen.findByRole('switch', { name: 'Push notifications' });
    fireEvent.click(toggle);
    await waitFor(() => expect(doubles.registerSubscription).toHaveBeenCalledTimes(1));
    act(() => setTestUser({ uid: 'user-2', supabaseToken: 'token-2' }));
    view.rerender(<GlobalSettingsPreferencesTab t={en} language="en" setLanguage={vi.fn()}
      darkMode={false} handleToggleTheme={vi.fn()} isLowGraphicsMode={false}
      setIsLowGraphicsMode={vi.fn()} setShowTourConfirm={vi.fn()} />);
    await act(async () => { finishSave(); });
    expect(toggle).not.toBeChecked();
  });

  it('finishes activation when the same account token refreshes during saving', async () => {
    let finishSave!: () => void;
    doubles.registerSubscription.mockImplementationOnce(() => new Promise<void>(resolve => { finishSave = resolve; }));
    const view = renderPreferences();
    const toggle = await screen.findByRole('switch', { name: 'Push notifications' });
    fireEvent.click(toggle);
    await waitFor(() => expect(doubles.registerSubscription).toHaveBeenCalledTimes(1));
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    act(() => setTestUser({ uid: 'user-1', supabaseToken: 'token-refreshed' }));
    await act(async () => {
      view.rerender(<GlobalSettingsPreferencesTab t={en} language="en" setLanguage={vi.fn()}
        darkMode={false} handleToggleTheme={vi.fn()} isLowGraphicsMode={false}
        setIsLowGraphicsMode={vi.fn()} setShowTourConfirm={vi.fn()} />);
    });
    await act(async () => { finishSave(); });
    expect(toggle).toBeChecked();
  });

  it('finishes disabling when the same account token refreshes during deletion', async () => {
    notifications.permission = 'granted';
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockResolvedValue([{ endpoint: subscription.endpoint }]);
    let finishDelete!: () => void;
    doubles.removeSubscription.mockImplementationOnce(() => new Promise<void>(resolve => { finishDelete = resolve; }));
    const view = renderPreferences();
    const toggle = await screen.findByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(toggle).toBeChecked());
    fireEvent.click(toggle);
    await waitFor(() => expect(doubles.removeSubscription).toHaveBeenCalledTimes(1));
    act(() => setTestUser({ uid: 'user-1', supabaseToken: 'token-refreshed' }));
    await act(async () => {
      view.rerender(<GlobalSettingsPreferencesTab t={en} language="en" setLanguage={vi.fn()}
        darkMode={false} handleToggleTheme={vi.fn()} isLowGraphicsMode={false}
        setIsLowGraphicsMode={vi.fn()} setShowTourConfirm={vi.fn()} />);
    });
    await act(async () => { finishDelete(); });
    expect(toggle).not.toBeChecked();
    expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('does not unsubscribe a browser after the account changes during deletion', async () => {
    notifications.permission = 'granted';
    registration.pushManager.getSubscription.mockResolvedValue(subscription);
    doubles.listSubscriptions.mockResolvedValue([{ endpoint: subscription.endpoint }]);
    let finishDelete!: () => void;
    doubles.removeSubscription.mockImplementationOnce(() => new Promise<void>(resolve => { finishDelete = resolve; }));
    const view = renderPreferences();
    const toggle = await screen.findByRole('switch', { name: 'Push notifications' });
    await waitFor(() => expect(toggle).toBeChecked());
    fireEvent.click(toggle);
    await waitFor(() => expect(doubles.removeSubscription).toHaveBeenCalledTimes(1));
    act(() => setTestUser({ uid: 'user-2', supabaseToken: 'token-2' }));
    doubles.listSubscriptions.mockResolvedValue([]);
    await act(async () => {
      view.rerender(<GlobalSettingsPreferencesTab t={en} language="en" setLanguage={vi.fn()}
        darkMode={false} handleToggleTheme={vi.fn()} isLowGraphicsMode={false}
        setIsLowGraphicsMode={vi.fn()} setShowTourConfirm={vi.fn()} />);
    });
    await act(async () => { finishDelete(); });
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    expect(toggle).not.toBeChecked();
  });

  it('sends a test through the authenticated API only after activation', async () => {
    renderPreferences();
    const send = await screen.findByRole('button', { name: 'Send test notification' });
    expect(send).toBeDisabled();
    const toggle = screen.getByRole('switch', { name: 'Push notifications' });
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    fireEvent.click(send);
    expect(await screen.findByText('Accepted by the push service')).toBeVisible();
    expect(doubles.fetch).toHaveBeenCalledWith('/api/push-notifier', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-1' },
    }));
    const body = JSON.parse(doubles.fetch.mock.calls[0][1].body);
    expect(body).toEqual({ title: 'Jozor', body: 'Your test notification', tag: 'jozor-push-test' });
  });

  it('does not claim test delivery when the API accepts no subscriptions', async () => {
    doubles.fetch.mockResolvedValue({ ok: true, json: async () => ({ sent: 0 }) });
    renderPreferences();
    const toggle = await screen.findByRole('switch', { name: 'Push notifications' });
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    fireEvent.click(screen.getByRole('button', { name: 'Send test notification' }));
    expect(await screen.findByText('Test notification was not accepted')).toBeVisible();
    expect(screen.queryByText('Accepted by the push service')).not.toBeInTheDocument();
  });
});
