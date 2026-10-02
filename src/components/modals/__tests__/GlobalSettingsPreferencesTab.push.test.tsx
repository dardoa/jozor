import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { en } from '../../../utils/translations/en';
import { GlobalSettingsPreferencesTab } from '../globalSettings/GlobalSettingsPreferencesTab';

const doubles = vi.hoisted(() => ({
  user: { uid: 'user-1', supabaseToken: 'token-1' } as { uid: string; supabaseToken: string } | null,
  registerSubscription: vi.fn(),
  listSubscriptions: vi.fn(),
  removeSubscription: vi.fn(),
  fetch: vi.fn(),
}));

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: (select: (state: unknown) => unknown) => select({ user: doubles.user }),
}));
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
    doubles.user = { uid: 'user-1', supabaseToken: 'token-1' };
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

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
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
    doubles.user = { uid: 'user-2', supabaseToken: 'token-2' };
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
      doubles.user = { uid: 'user-2', supabaseToken: 'token-2' };
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
    doubles.user = null;
    await act(async () => rerenderPreferences(view));
    doubles.user = { uid: 'user-1', supabaseToken: 'new-session-token' };
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
    doubles.user = { uid: 'user-2', supabaseToken: 'token-2' };
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
    doubles.user = { uid: 'user-1', supabaseToken: 'token-refreshed' };
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
    doubles.user = { uid: 'user-1', supabaseToken: 'token-refreshed' };
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
    doubles.user = { uid: 'user-2', supabaseToken: 'token-2' };
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
