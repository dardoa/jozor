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

describe('push notification preference', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
