import React, { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Activity, ShieldCheck } from 'lucide-react';

import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';
import { checkKindiReportsAdminAccess } from '../kindi';
import { DiagnosticsPanels } from '../diagnostics';

const returnToApp = () => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.history.pushState(null, '', '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
};

interface AdminDiagnosticsProps {
  embedded?: boolean;
}

export const AdminDiagnostics: React.FC<AdminDiagnosticsProps> = ({ embedded = false }) => {
  const { t, language } = useTranslation();
  const text = t.adminDiagnostics;
  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;
  const user = useAppStore((state) => state.user);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadAccess = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const hasAccess = await checkKindiReportsAdminAccess(user);
      setIsAdmin(hasAccess);
    } catch {
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadAccess();
  }, [loadAccess]);

  if (!user) {
    return (
      <div className="h-screen overflow-y-auto bg-[var(--surface-app)] p-6 text-[var(--text-main)]">
        <div className="mx-auto max-w-3xl rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6">
          <h1 className="text-xl font-black">{text.adminRequiredTitle}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{text.adminRequiredBody}</p>
        </div>
      </div>
    );
  }

  if (!isLoading && !isAdmin) {
    return (
      <div className="h-screen overflow-y-auto bg-[var(--surface-app)] p-6 text-[var(--text-main)]">
        <div className="mx-auto max-w-3xl rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[var(--primary-600)]" />
            <h1 className="text-xl font-black">{text.protectedTitle}</h1>
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{text.protectedBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${embedded ? 'bg-transparent text-[var(--text-main)]' : 'h-screen overflow-y-auto bg-[var(--surface-app)] px-4 py-6 text-[var(--text-main)] sm:px-6'}`}>
      <main className="mx-auto flex max-w-5xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {!embedded && (
              <button
                type="button"
                onClick={returnToApp}
                className="mb-3 inline-flex items-center gap-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-black text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
              >
                <BackIcon className="h-4 w-4" />
                {text.backToApp}
              </button>
            )}
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary-600)]">
              <Activity className="h-4 w-4" />
              {text.breadcrumb}
            </div>
            <h1 className="mt-2 text-2xl font-black">{text.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">{text.description}</p>
          </div>
        </header>

        <DiagnosticsPanels includeTelemetry includeMaintenance layout="grid" />
      </main>
    </div>
  );
};
