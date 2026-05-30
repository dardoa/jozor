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

export const openKindiLearningReports = (): void => {
  window.history.pushState(null, '', '/admin/kindi-learning');
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export const openAdminTreeDefaults = (): void => {
  window.history.pushState(null, '', '/admin/tree-defaults');
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export const openAdminDiagnostics = (): void => {
  window.history.pushState(null, '', '/admin/diagnostics');
  window.dispatchEvent(new PopStateEvent('popstate'));
};
