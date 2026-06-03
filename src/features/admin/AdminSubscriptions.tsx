import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Gift, RefreshCw, Search, ShieldAlert, ShieldCheck, XCircle } from 'lucide-react';
import { toast } from 'sonner';

import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../context/TranslationContext';
import { useKindiReportsAdminAccess } from './useKindiReportsAdminAccess';
import {
  ADMIN_SUBSCRIPTION_OVERRIDE_SOURCES,
  fetchAdminSubscriptions,
  grantAdminSubscriptionOverride,
  revokeAdminSubscriptionOverride,
  type AdminBillingTier,
  type AdminSubscriptionOverrideSource,
  type AdminSubscriptionUser,
} from './adminSubscriptionService';

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : '-';

const tierLabel = (tier: AdminBillingTier) => {
  if (tier === 'family') return 'Family';
  if (tier === 'pro') return 'Pro';
  return 'Free';
};

const sourceLabel = (source: AdminSubscriptionOverrideSource) => {
  if (source === 'sandbox_test') return 'Sandbox test';
  if (source === 'internal_test') return 'Internal test';
  return 'Manual comp';
};

const Badge = ({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger';
}) => {
  const className = {
    neutral: 'border-[var(--border-soft)] bg-[var(--surface-app)] text-[var(--text-secondary)]',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
    danger: 'border-red-500/30 bg-red-500/10 text-red-700',
  }[tone];

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-black ${className}`}>
      {children}
    </span>
  );
};

export const AdminSubscriptions: React.FC = () => {
  const { language } = useTranslation();
  const user = useAppStore((state) => state.user);
  const isAdmin = useKindiReportsAdminAccess(user);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<AdminSubscriptionUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [tier, setTier] = useState<Exclude<AdminBillingTier, 'free'>>('pro');
  const [source, setSource] = useState<AdminSubscriptionOverrideSource>('sandbox_test');
  const [expiresAt, setExpiresAt] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const safeUsers = Array.isArray(users) ? users : [];

  const selectedUser = useMemo(
    () => safeUsers.find((entry) => entry.id === selectedUserId) ?? null,
    [selectedUserId, safeUsers]
  );

  const isRtl = language === 'ar';

  const loadSubscriptions = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchAdminSubscriptions(user, query);
      const nextUsers = Array.isArray(rows) ? rows : [];
      setUsers(nextUsers);
      if (nextUsers.length > 0 && !nextUsers.some((row) => row.id === selectedUserId)) {
        setSelectedUserId(nextUsers[0].id);
      }
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load subscriptions.');
    } finally {
      setIsLoading(false);
    }
  }, [query, selectedUserId, user]);

  useEffect(() => {
    void loadSubscriptions();
  }, [loadSubscriptions]);

  const handleGrant = async () => {
    if (!user || !selectedUserId) return;
    setIsSaving(true);
    setError(null);
    try {
      await grantAdminSubscriptionOverride(user, {
        userId: selectedUserId,
        tier,
        source,
        reason,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : undefined,
      });
      toast.success(isRtl ? 'تم منح الباقة الإدارية.' : 'Admin subscription override granted.');
      await loadSubscriptions();
    } catch (grantError) {
      const message = grantError instanceof Error ? grantError.message : 'Failed to grant override.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevoke = async () => {
    if (!user || !selectedUserId) return;
    setIsSaving(true);
    setError(null);
    try {
      await revokeAdminSubscriptionOverride(user, selectedUserId);
      toast.success(isRtl ? 'تم إلغاء المنحة الإدارية.' : 'Admin subscription override revoked.');
      await loadSubscriptions();
    } catch (revokeError) {
      const message = revokeError instanceof Error ? revokeError.message : 'Failed to revoke override.';
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6">
        <h2 className="text-xl font-black">{isRtl ? 'تسجيل الدخول مطلوب' : 'Sign in required'}</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {isRtl ? 'يجب تسجيل الدخول بحساب أدمن.' : 'You must sign in with an admin account.'}
        </p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-5 w-5 text-[var(--primary-600)]" />
          <h2 className="text-xl font-black">{isRtl ? 'صفحة محمية' : 'Protected admin page'}</h2>
        </div>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {isRtl ? 'هذه الأدوات تظهر لصاحب التطبيق فقط.' : 'These tools are limited to the application owner/admins.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary-600)]">
            <Gift className="h-4 w-4" />
            Admin / Subscriptions
          </div>
          <h1 className="mt-2 text-2xl font-black">
            {isRtl ? 'إدارة الاشتراكات الإدارية' : 'Admin subscription controls'}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">
            {isRtl
              ? 'امنح باقة اختبارية أو تعويضية بدون تعديل سجل Paddle. الباقة الفعالة تحتسب من أقوى استحقاق نشط.'
              : 'Grant test or complimentary access without mutating Paddle rows. The effective tier is resolved from the strongest active entitlement.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadSubscriptions()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-black text-white shadow-sm transition hover:brightness-95"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isRtl ? 'تحديث' : 'Refresh'}
        </button>
      </header>

      <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-[var(--text-main)]">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-700" />
          <div>
            <div className="font-black">{isRtl ? 'حدود آمنة' : 'Safe boundaries'}</div>
            <p className="mt-1 text-[var(--text-secondary)]">
              {isRtl
                ? 'هذه الصفحة لا تعدل اشتراك Paddle الأصلي. إلغاء المنحة الإدارية يعيد المستخدم تلقائيًا إلى باقته القادمة من Paddle أو Free.'
                : 'This page never edits the original Paddle subscription. Revoking an override falls back to the user’s Paddle tier or Free.'}
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 lg:grid-cols-[1fr_auto]">
        <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
          {isRtl ? 'بحث بالبريد أو User ID' : 'Search by email or user ID'}
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="mdardoa@gmail.com"
              className="w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-9 py-2 text-[var(--text-main)]"
            />
          </span>
        </label>
        <button
          type="button"
          onClick={() => void loadSubscriptions()}
          className="self-end rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-4 py-2 text-sm font-black text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
        >
          {isRtl ? 'بحث' : 'Search'}
        </button>
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-[var(--border-soft)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-4 py-3 font-black">User</th>
                  <th className="px-4 py-3 font-black">Paddle</th>
                  <th className="px-4 py-3 font-black">Override</th>
                  <th className="px-4 py-3 font-black">Effective</th>
                  <th className="px-4 py-3 font-black">Updated</th>
                </tr>
              </thead>
              <tbody>
                {safeUsers.length > 0 ? safeUsers.map((entry) => (
                  <tr
                    key={entry.id}
                    className={`cursor-pointer border-b border-[var(--border-soft)]/60 last:border-0 ${
                      entry.id === selectedUserId ? 'bg-[var(--primary-500)]/10' : 'hover:bg-[var(--surface-hover)]'
                    }`}
                    onClick={() => setSelectedUserId(entry.id)}
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="font-black text-[var(--text-main)]">{entry.displayName || entry.email || entry.id}</div>
                      <div className="mt-1 text-xs text-[var(--text-muted)]">{entry.email || 'No email'}</div>
                      <div className="mt-1 max-w-[240px] truncate font-mono text-xs text-[var(--text-muted)]">{entry.id}</div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge tone={entry.paddleTier === 'free' ? 'neutral' : 'success'}>{tierLabel(entry.paddleTier)}</Badge>
                      <div className="mt-2 text-xs text-[var(--text-muted)]">
                        {entry.paddleSubscription
                          ? `${entry.paddleSubscription.status} / ${entry.paddleSubscription.plan_id}`
                          : 'No Paddle row'}
                      </div>
                    </td>
                    <td className="px-4 py-3 align-top">
                      {entry.override ? (
                        <div className="space-y-2">
                          <Badge tone={entry.override.source === 'sandbox_test' ? 'warning' : 'success'}>
                            {tierLabel(entry.override.tier)} / {sourceLabel(entry.override.source)}
                          </Badge>
                          <div className="text-xs text-[var(--text-muted)]">
                            Expires: {formatDate(entry.override.expires_at)}
                          </div>
                        </div>
                      ) : (
                        <Badge>No override</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <Badge tone={entry.effectiveTier === 'free' ? 'neutral' : 'success'}>{tierLabel(entry.effectiveTier)}</Badge>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-[var(--text-muted)]">
                      {formatDate(entry.updatedAt)}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td className="px-4 py-6 text-sm text-[var(--text-muted)]" colSpan={5}>
                      {isLoading ? 'Loading...' : 'No users found.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4">
          <h2 className="text-sm font-black text-[var(--text-main)]">
            {isRtl ? 'منح باقة إدارية' : 'Grant admin override'}
          </h2>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {selectedUser
              ? `${selectedUser.email || selectedUser.id} -> ${tierLabel(selectedUser.effectiveTier)}`
              : isRtl ? 'اختر مستخدمًا من الجدول.' : 'Select a user from the table.'}
          </p>

          <div className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
              User ID
              <input
                value={selectedUserId}
                onChange={(event) => setSelectedUserId(event.target.value)}
                className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2 font-mono text-xs text-[var(--text-main)]"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
              Tier
              <select
                value={tier}
                onChange={(event) => setTier(event.target.value as Exclude<AdminBillingTier, 'free'>)}
                className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2 text-[var(--text-main)]"
              >
                <option value="pro">Pro</option>
                <option value="family">Family</option>
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
              Source
              <select
                value={source}
                onChange={(event) => setSource(event.target.value as AdminSubscriptionOverrideSource)}
                className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2 text-[var(--text-main)]"
              >
                {ADMIN_SUBSCRIPTION_OVERRIDE_SOURCES.map((value) => (
                  <option key={value} value={value}>{sourceLabel(value)}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
              Expires at
              <input
                type="date"
                value={expiresAt}
                onChange={(event) => setExpiresAt(event.target.value)}
                className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2 text-[var(--text-main)]"
              />
            </label>

            <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
              Reason
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2 text-[var(--text-main)]"
                placeholder="Sandbox verification, support comp, founder grant..."
              />
            </label>

            <button
              type="button"
              onClick={() => void handleGrant()}
              disabled={!selectedUserId || isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-black text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Gift className="h-4 w-4" />
              {isSaving ? 'Saving...' : 'Grant override'}
            </button>

            <button
              type="button"
              onClick={() => void handleRevoke()}
              disabled={!selectedUserId || isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-black text-red-700 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <XCircle className="h-4 w-4" />
              Revoke active override
            </button>
          </div>
        </aside>
      </section>
    </div>
  );
};
