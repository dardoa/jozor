import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { PaywallModal } from '../PaywallModal';
import { initializePaddle } from '@paddle/paddle-js';
import { toast } from 'sonner';

const translation = vi.hoisted(() => ({ language: 'en' }));

vi.mock('@paddle/paddle-js', () => ({
  initializePaddle: vi.fn(async () => undefined),
  CheckoutEventNames: {},
}));
vi.mock('../../../context/TranslationContext', () => ({ useTranslation: () => translation }));
vi.mock('../../../context/OverlayContext', () => ({
  OverlayPrimitive: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('subscription management access', () => {
  beforeEach(() => {
    translation.language = 'en';
    vi.mocked(initializePaddle).mockResolvedValue(undefined);
    vi.stubEnv('VITE_PADDLE_CLIENT_TOKEN', 'synthetic-client-token');
    useAppStore.setState({
      subscriptionTier: 'free',
      user: { uid: 'synthetic-user', email: 'synthetic@example.test', displayName: 'Synthetic', photoURL: '', supabaseToken: 'synthetic-session' },
    });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it.each(['free', 'pro', 'family'] as const)('keeps management reachable when the account tier is %s', tier => {
    useAppStore.setState({ subscriptionTier: tier });
    render(<PaywallModal isOpen onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Manage in Paddle' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancel subscription' })).toBeEnabled();
  });

  it('opens only the portal and never starts checkout or cancels automatically', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ portalUrl: 'https://customer-portal.paddle.com/synthetic' })));
    vi.stubGlobal('fetch', fetchMock);
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<PaywallModal isOpen onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Manage in Paddle' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://customer-portal.paddle.com/synthetic', '_blank', 'noopener,noreferrer'));
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith('/api/billing/customer-portal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer synthetic-session' },
      body: JSON.stringify({ action: 'overview' }),
    });
  });

  it('does not offer authenticated management to a guest', () => {
    useAppStore.setState({ user: null });
    render(<PaywallModal isOpen onClose={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Manage in Paddle' })).not.toBeInTheDocument();
  });

  it.each(['ar', 'en'])('shows maintenance in %s without opening Paddle or mixing server text into the message', async language => {
    translation.language = language;
    const open = vi.fn(); vi.mocked(initializePaddle).mockResolvedValue({ Checkout: { open } } as never);
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 'ACCOUNT_ADMISSION_PAUSED', error: 'server-ONLY-maintenance-text' }), { status: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    const errorToast = vi.spyOn(toast, 'error').mockReturnValue('toast-id');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => { render(<PaywallModal isOpen onClose={vi.fn()} />); });
    fireEvent.click(screen.getAllByRole('button', { name: language === 'ar' ? 'ترقية الآن' : 'Upgrade Now' })[0]);
    await waitFor(() => expect(errorToast).toHaveBeenCalledOnce());
    const message = String(errorToast.mock.calls[0][0]);
    expect(message).toContain(language === 'ar' ? 'الدفع متوقف مؤقتًا للصيانة' : 'Checkout is temporarily paused for maintenance');
    expect(message).not.toContain('server-ONLY');
    if (language === 'ar') expect(message).not.toMatch(/[A-Za-z]/);
    else expect(message).not.toMatch(/[\u0600-\u06ff]/);
    expect(fetchMock).toHaveBeenCalledOnce(); expect(open).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: language === 'ar' ? 'ترقية الآن' : 'Upgrade Now' })[0]).toBeEnabled();
  });
});
