import { useEffect, useState } from 'react';

import type { UserProfile } from '../../types';
import { checkKindiReportsAdminAccess } from '../kindi';

interface AdminAccessResult {
  uid: string;
  email: string;
  supabaseToken?: string;
  hasAccess: boolean;
}

export const useKindiReportsAdminAccess = (user: UserProfile | null): boolean => {
  const [accessResult, setAccessResult] = useState<AdminAccessResult | null>(null);
  const uid = user?.uid;
  const email = user?.email;
  const supabaseToken = user?.supabaseToken;

  useEffect(() => {
    if (!uid || email === undefined) return;

    let active = true;
    const accessUser: UserProfile = {
      uid,
      email,
      supabaseToken,
      displayName: '',
      photoURL: '',
    };

    void checkKindiReportsAdminAccess(accessUser)
      .then((hasAccess) => {
        if (active) {
          setAccessResult({
            uid,
            email,
            supabaseToken,
            hasAccess,
          });
        }
      })
      .catch(() => {
        if (active) {
          setAccessResult({
            uid,
            email,
            supabaseToken,
            hasAccess: false,
          });
        }
      });

    return () => {
      active = false;
    };
  }, [email, supabaseToken, uid]);

  return Boolean(
    uid
    && email !== undefined
    && accessResult?.uid === uid
    && accessResult.email === email
    && accessResult.supabaseToken === supabaseToken
    && accessResult.hasAccess
  );
};

export const openAdminDashboard = (tab?: 'kindi' | 'subscriptions' | 'billing' | 'tree-defaults' | 'diagnostics'): void => {
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

export const openAdminBillingDiagnostics = (): void => {
  openAdminDashboard('billing');
};

export const openAdminDiagnostics = (): void => {
  openAdminDashboard('diagnostics');
};
