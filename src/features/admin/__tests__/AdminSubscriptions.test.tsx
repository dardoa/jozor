import { act, cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAppStore } from '../../../store/useAppStore';
import { AdminSubscriptions } from '../AdminSubscriptions';

const { adminAccess, fetchSubscriptions } = vi.hoisted(() => ({ adminAccess: vi.fn(), fetchSubscriptions: vi.fn() }));
vi.mock('../../../context/TranslationContext', () => ({ useTranslation: () => ({ language: 'en' }) }));
vi.mock('../useKindiReportsAdminAccess', () => ({ useKindiReportsAdminAccess: adminAccess }));
vi.mock('../adminSubscriptionService', async importOriginal => ({
  ...await importOriginal<typeof import('../adminSubscriptionService')>(), fetchAdminSubscriptions: fetchSubscriptions,
}));

const setUser = () => act(() => useAppStore.setState({ user: {
  uid: 'admin-1', email: 'owner@example.test', displayName: 'Owner', photoURL: '', supabaseToken: 'test-token',
} }));

describe('AdminSubscriptions ledger display', () => {
  afterEach(() => {
    cleanup(); act(() => useAppStore.setState({ user: null })); vi.clearAllMocks();
  });
  it('does not load billing data before admin access is confirmed', () => {
    setUser(); adminAccess.mockReturnValue(false);
    render(<AdminSubscriptions />);
    expect(fetchSubscriptions).not.toHaveBeenCalled();
  });
  it('renders every active and canceled subscription without fetching again on initial selection', async () => {
    setUser(); adminAccess.mockReturnValue(true);
    fetchSubscriptions.mockResolvedValue({ auditEvents: [], users: [{
      id: 'owner', email: 'customer@example.test', displayName: 'Customer', paddleTier: 'pro', effectiveTier: 'pro',
      paddleSubscription: null, override: null, paddleSubscriptions: [
        { id: 'sub_old', status: 'canceled', plan_id: 'pri_old' }, { id: 'sub_current', status: 'active', plan_id: 'pri_current' },
      ],
    }] });
    render(<AdminSubscriptions />);
    expect(await screen.findByText('sub_old')).toBeInTheDocument();
    expect(screen.getByText('sub_current')).toBeInTheDocument();
    expect(screen.getByText('canceled / pri_old')).toBeInTheDocument();
    expect(screen.getByText('active / pri_current')).toBeInTheDocument();
    expect(fetchSubscriptions).toHaveBeenCalledTimes(1);
  });
  it('keeps single-subscription responses compatible during deployment transition', async () => {
    setUser(); adminAccess.mockReturnValue(true);
    fetchSubscriptions.mockResolvedValue({ auditEvents: [], users: [{
      id: 'owner', email: 'customer@example.test', displayName: 'Customer', paddleTier: 'pro', effectiveTier: 'pro',
      paddleSubscription: { id: 'sub_single', status: 'active', plan_id: 'pri_pro' }, override: null,
    }] });
    render(<AdminSubscriptions />);
    expect(await screen.findByText('sub_single')).toBeInTheDocument();
  });
});
