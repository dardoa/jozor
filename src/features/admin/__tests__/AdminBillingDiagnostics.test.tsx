import { act, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../../store/useAppStore';
import { AdminBillingDiagnostics } from '../AdminBillingDiagnostics';

const useKindiReportsAdminAccessMock = vi.hoisted(() => vi.fn(() => false));
const fetchAdminBillingDiagnosticsMock = vi.hoisted(() => vi.fn());

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    language: 'en',
  }),
}));

vi.mock('../useKindiReportsAdminAccess', () => ({
  useKindiReportsAdminAccess: useKindiReportsAdminAccessMock,
}));

vi.mock('../adminBillingDiagnosticsService', () => ({
  fetchAdminBillingDiagnostics: fetchAdminBillingDiagnosticsMock,
}));

const setCurrentUser = () => {
  act(() => {
    useAppStore.setState({
      user: {
        uid: 'admin-1',
        email: 'owner@example.com',
        displayName: 'Owner',
        photoURL: '',
        supabaseToken: 'token-1',
      },
    } as never);
  });
};

describe('AdminBillingDiagnostics', () => {
  afterEach(() => {
    act(() => {
      useAppStore.setState({ user: null } as never);
    });
    useKindiReportsAdminAccessMock.mockReset();
    fetchAdminBillingDiagnosticsMock.mockReset();
  });

  it('blocks non-admin users before fetching diagnostics', () => {
    setCurrentUser();
    useKindiReportsAdminAccessMock.mockReturnValue(false);

    render(<AdminBillingDiagnostics />);

    expect(screen.getByText('Protected admin page')).toBeInTheDocument();
    expect(fetchAdminBillingDiagnosticsMock).not.toHaveBeenCalled();
  });

  it('loads and renders billing webhook diagnostic events for admins', async () => {
    setCurrentUser();
    useKindiReportsAdminAccessMock.mockReturnValue(true);
    fetchAdminBillingDiagnosticsMock.mockResolvedValue([
      {
        id: 'diag-1',
        provider: 'paddle',
        event_id: 'evt_123',
        event_type: 'subscription.created',
        processing_status: 'processed',
        reason: 'subscription updated',
        target_user_id: 'user-1',
        subscription_id: 'sub_123',
        customer_id: 'ctm_123',
        price_id: 'pri_123',
        tier: 'pro',
        http_status: 200,
        occurred_at: '2026-06-05T10:00:00.000Z',
        received_at: '2026-06-05T10:00:05.000Z',
        metadata: {},
      },
    ]);

    render(<AdminBillingDiagnostics />);

    await waitFor(() => {
      expect(fetchAdminBillingDiagnosticsMock).toHaveBeenCalledWith(
        expect.objectContaining({ uid: 'admin-1', supabaseToken: 'token-1' }),
        expect.objectContaining({ status: 'all', query: '', limit: 75 })
      );
    });

    expect(await screen.findByText('subscription.created')).toBeInTheDocument();
    expect(screen.getAllByText('Processed').length).toBeGreaterThan(0);
    expect(screen.getByText('evt_123')).toBeInTheDocument();
    expect(screen.getByText('sub_123')).toBeInTheDocument();
    expect(screen.getByText('pri_123')).toBeInTheDocument();
    expect(screen.getByText('pro')).toBeInTheDocument();
  });
});
