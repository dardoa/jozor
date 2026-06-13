import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  openAdminBillingDiagnostics,
  openAdminDashboard,
  openAdminDiagnostics,
  openAdminTreeDefaults,
  openKindiLearningReports,
  useKindiReportsAdminAccess,
} from '../useKindiReportsAdminAccess';

const checkKindiReportsAdminAccessMock = vi.hoisted(() => vi.fn());

vi.mock('../../kindi', () => ({
  checkKindiReportsAdminAccess: checkKindiReportsAdminAccessMock,
}));

describe('admin navigation helpers', () => {
  afterEach(() => {
    window.history.pushState(null, '', '/');
    checkKindiReportsAdminAccessMock.mockReset();
  });

  it('opens the unified admin dashboard without a tab by default', () => {
    const listener = vi.fn();
    window.addEventListener('popstate', listener);

    openAdminDashboard();

    expect(window.location.pathname).toBe('/admin');
    expect(window.location.search).toBe('');
    expect(listener).toHaveBeenCalledTimes(1);

    window.removeEventListener('popstate', listener);
  });

  it('opens stable admin dashboard tab URLs', () => {
    openKindiLearningReports();
    expect(window.location.pathname + window.location.search).toBe('/admin?tab=kindi');

    openAdminTreeDefaults();
    expect(window.location.pathname + window.location.search).toBe('/admin?tab=tree-defaults');

    openAdminBillingDiagnostics();
    expect(window.location.pathname + window.location.search).toBe('/admin?tab=billing');

    openAdminDiagnostics();
    expect(window.location.pathname + window.location.search).toBe('/admin?tab=diagnostics');
  });

  it('does not expose stale admin access while a different user is being checked', async () => {
    checkKindiReportsAdminAccessMock
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const firstUser = {
      uid: 'admin-1',
      email: 'admin@example.com',
      displayName: 'Admin',
      photoURL: '',
      supabaseToken: 'token-1',
    };
    const secondUser = {
      ...firstUser,
      uid: 'user-2',
      email: 'user@example.com',
      displayName: 'User',
      supabaseToken: 'token-2',
    };
    const { result, rerender } = renderHook(
      ({ user }) => useKindiReportsAdminAccess(user),
      { initialProps: { user: firstUser } }
    );

    await waitFor(() => expect(result.current).toBe(true));

    rerender({ user: secondUser });

    expect(result.current).toBe(false);
    await waitFor(() => expect(checkKindiReportsAdminAccessMock).toHaveBeenCalledTimes(2));
    expect(result.current).toBe(false);
  });
});
