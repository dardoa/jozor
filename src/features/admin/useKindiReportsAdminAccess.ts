import { useEffect, useState } from 'react';

import type { UserProfile } from '../../types';
import { checkKindiReportsAdminAccess } from '../kindi';

export const useKindiReportsAdminAccess = (user: UserProfile | null): boolean => {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    setIsAdmin(false);

    if (!user) return () => {
      active = false;
    };

    void checkKindiReportsAdminAccess(user)
      .then((hasAccess) => {
        if (active) setIsAdmin(hasAccess);
      })
      .catch(() => {
        if (active) setIsAdmin(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

  return isAdmin;
};

export const openAdminDashboard = (tab?: 'kindi' | 'subscriptions' | 'tree-defaults' | 'diagnostics'): void => {
  const suffix = tab ? `?tab=${tab}` : '';
  window.history.pushState(null, '', `/admin${suffix}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export const openKindiLearningReports = (): void => {
  openAdminDashboard('kindi');
};

export const openAdminTreeDefaults = (): void => {
  openAdminDashboard('tree-defaults');
};

export const openAdminDiagnostics = (): void => {
  openAdminDashboard('diagnostics');
};
