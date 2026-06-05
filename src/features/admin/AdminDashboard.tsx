import React from 'react';
import { Activity, ArrowLeft, ArrowRight, BrainCircuit, CreditCard, LayoutDashboard, SlidersHorizontal } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';
import { AdminDiagnostics } from './AdminDiagnostics';
import { AdminBillingDiagnostics } from './AdminBillingDiagnostics';
import { AdminDefaultTreeSettings } from './AdminDefaultTreeSettings';
import { AdminKindiLearningReports } from './AdminKindiLearningReports';
import { AdminSubscriptions } from './AdminSubscriptions';

type AdminTab = 'kindi' | 'subscriptions' | 'billing' | 'tree-defaults' | 'diagnostics';

const tabs: Array<{
  id: AdminTab;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
}> = [
  {
    id: 'kindi',
    icon: BrainCircuit,
    label: 'Kindi Reports',
    description: 'Redacted learning reports and intent telemetry.',
  },
  {
    id: 'subscriptions',
    icon: CreditCard,
    label: 'Subscriptions',
    description: 'Read Paddle status and grant safe admin overrides.',
  },
  {
    id: 'billing',
    icon: CreditCard,
    label: 'Billing Diagnostics',
    description: 'Inspect redacted Paddle webhook processing events.',
  },
  {
    id: 'tree-defaults',
    icon: SlidersHorizontal,
    label: 'Default Tree Settings',
    description: 'Visual defaults for newly created trees.',
  },
  {
    id: 'diagnostics',
    icon: Activity,
    label: 'Diagnostics',
    description: 'Performance, synchronization, and maintenance tools.',
  },
];

const isAdminTab = (value: string | null): value is AdminTab =>
  value === 'kindi' || value === 'subscriptions' || value === 'billing' || value === 'tree-defaults' || value === 'diagnostics';

const returnToApp = () => {
  window.history.pushState(null, '', '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
};

export const AdminDashboard: React.FC = () => {
  const { language } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const user = useAppStore((state) => state.user);
  const requestedTab = searchParams.get('tab');
  const activeTab: AdminTab = isAdminTab(requestedTab) ? requestedTab : 'kindi';
  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;

  const setActiveTab = (tab: AdminTab) => {
    setSearchParams({ tab }, { replace: true });
  };

  const title = language === 'ar' ? 'لوحة تحكم الأدمن' : 'Admin Dashboard';
  const description = language === 'ar'
    ? 'مكان واحد لإدارة تقارير كيندي، الإعدادات الافتراضية، والتشخيصات.'
    : 'One place for Kindi reports, default settings, and diagnostics.';
  const backLabel = language === 'ar' ? 'العودة للتطبيق' : 'Back to app';
  const adminRequiredTitle = language === 'ar' ? 'تسجيل الدخول مطلوب' : 'Sign in required';
  const adminRequiredBody = language === 'ar'
    ? 'يجب تسجيل الدخول بحساب أدمن لفتح هذه الصفحة.'
    : 'You must sign in with an admin account to open this page.';

  if (!user) {
    return (
      <div className="h-screen overflow-y-auto bg-[var(--surface-app)] p-6 text-[var(--text-main)]">
        <div className="mx-auto max-w-3xl rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6">
          <h1 className="text-xl font-black">{adminRequiredTitle}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{adminRequiredBody}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-[var(--surface-app)] px-4 py-6 text-[var(--text-main)] sm:px-6">
      <main className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="border-b border-[var(--border-soft)] pb-5">
          <button
            type="button"
            onClick={returnToApp}
            className="mb-3 inline-flex items-center gap-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-black text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
          >
            <BackIcon className="h-4 w-4" />
            {backLabel}
          </button>
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary-600)]">
            <LayoutDashboard className="h-4 w-4" />
            Admin
          </div>
          <h1 className="mt-2 text-2xl font-black">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">{description}</p>
        </header>

        <nav className="grid gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-2 md:grid-cols-5" aria-label="Admin sections">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex min-h-20 items-start gap-3 rounded-md border px-3 py-3 text-start transition ${
                  isActive
                    ? 'border-[var(--primary-500)] bg-[var(--primary-500)]/10 text-[var(--text-main)]'
                    : 'border-transparent text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className={`mt-0.5 h-5 w-5 ${isActive ? 'text-[var(--primary-600)]' : 'text-[var(--text-muted)]'}`} />
                <span>
                  <span className="block text-sm font-black">{tab.label}</span>
                  <span className="mt-1 block text-xs leading-4 text-[var(--text-muted)]">{tab.description}</span>
                </span>
              </button>
            );
          })}
        </nav>

        <section className="min-h-[50vh] rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-sm">
          {activeTab === 'kindi' && <AdminKindiLearningReports embedded />}
          {activeTab === 'subscriptions' && <AdminSubscriptions />}
          {activeTab === 'billing' && <AdminBillingDiagnostics />}
          {activeTab === 'tree-defaults' && <AdminDefaultTreeSettings embedded />}
          {activeTab === 'diagnostics' && <AdminDiagnostics embedded />}
        </section>
      </main>
    </div>
  );
};
