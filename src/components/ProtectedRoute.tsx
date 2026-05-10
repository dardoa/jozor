import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../context/TranslationContext';

const RETURN_TO_KEY = 'jozor:return_to';
const LEGACY_RETURN_TO_KEY = 'jozor:post-login-redirect';

const RouteProtectionLoading: React.FC<{ label: string }> = () => (
  // Native splash in index.html covers this state
  null
);

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const user = useAppStore((state) => state.user);
  const authLoading = useAppStore((state) => state.authLoading);
  const location = useLocation();

  if (authLoading) {
    return <RouteProtectionLoading label={t.loading} />;
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    sessionStorage.setItem(RETURN_TO_KEY, returnTo);
    sessionStorage.setItem(LEGACY_RETURN_TO_KEY, returnTo);
    return <Navigate to='/login' replace />;
  }

  return <>{children}</>;
};
