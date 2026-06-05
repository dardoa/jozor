import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  openAdminBillingDiagnostics,
  openAdminDashboard,
  openAdminDiagnostics,
  openAdminTreeDefaults,
  openKindiLearningReports,
} from '../useKindiReportsAdminAccess';

vi.mock('../../kindi', () => ({
  checkKindiReportsAdminAccess: vi.fn(),
}));

describe('admin navigation helpers', () => {
  afterEach(() => {
    window.history.pushState(null, '', '/');
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
});
