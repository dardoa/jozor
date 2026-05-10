import * as React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../context/TranslationContext';

const RETURN_TO_KEY = 'jozor:return_to';
const LEGACY_RETURN_TO_KEY = 'jozor:post-login-redirect';

const RouteProtectionLoading: React.FC<{ label: string }> = ({ label }) => (
  <div className='flex h-screen items-center justify-center bg-[var(--theme-bg)] text-[var(--text-main)] overflow-hidden'>
    <div className='ds-empty-state flex flex-col items-center gap-4 min-w-[240px]'>
      <div className='w-12 h-12 rounded-full border-[3px] border-[var(--primary-500)]/25 border-t-[var(--primary-600)] animate-spin' />
      <div className='text-base font-semibold text-[var(--text-main)]'>{label}</div>
    </div>
  </div>
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
