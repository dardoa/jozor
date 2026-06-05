import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CreditCard, RefreshCw, Search, ShieldCheck } from 'lucide-react';

import { useTranslation } from '../../context/TranslationContext';
import { useAppStore } from '../../store/useAppStore';
import { useKindiReportsAdminAccess } from './useKindiReportsAdminAccess';
import {
  fetchAdminBillingDiagnostics,
  type AdminBillingWebhookDiagnosticEvent,
  type AdminBillingWebhookStatus,
} from './adminBillingDiagnosticsService';

type StatusFilter = 'all' | AdminBillingWebhookStatus;

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : '-';

const statusLabel = (status: AdminBillingWebhookStatus) => {
  if (status === 'processed') return 'Processed';
  if (status === 'ignored') return 'Ignored';
  if (status === 'failed') return 'Failed';
  return 'Received';
};

const StatusBadge = ({ status }: { status: AdminBillingWebhookStatus }) => {
  const className = {
    processed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700',
    ignored: 'border-amber-500/30 bg-amber-500/10 text-amber-700',
    failed: 'border-red-500/30 bg-red-500/10 text-red-700',
    received: 'border-[var(--border-soft)] bg-[var(--surface-app)] text-[var(--text-secondary)]',
  }[status];

  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-black ${className}`}>
      {statusLabel(status)}
    </span>
  );
};

const MetricCard = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-app)] p-4">
    <div className="text-xs font-black uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
    <div className="mt-2 text-2xl font-black text-[var(--text-main)]">{value}</div>
  </div>
);

export const AdminBillingDiagnostics: React.FC = () => {
  const { language } = useTranslation();
  const user = useAppStore((state) => state.user);
  const isAdmin = useKindiReportsAdminAccess(user);
  const isRtl = language === 'ar';
  const [events, setEvents] = useState<AdminBillingWebhookDiagnosticEvent[]>([]);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const safeEvents = Array.isArray(events) ? events : [];
  const metrics = useMemo(() => ({
    total: safeEvents.length,
    processed: safeEvents.filter((event) => event.processing_status === 'processed').length,
    failed: safeEvents.filter((event) => event.processing_status === 'failed').length,
    ignored: safeEvents.filter((event) => event.processing_status === 'ignored').length,
  }), [safeEvents]);

  const latestFailure = useMemo(
    () => safeEvents.find((event) => event.processing_status === 'failed') ?? null,
    [safeEvents]
  );

  const loadEvents = useCallback(async () => {
    if (!user || !isAdmin) return;
    setIsLoading(true);
    setError(null);
    try {
      const rows = await fetchAdminBillingDiagnostics(user, {
        status: statusFilter,
        query,
        limit: 75,
      });
      setEvents(rows);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load billing diagnostics.');
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, query, statusFilter, user]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

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
            <CreditCard className="h-4 w-4" />
            Admin / Billing Diagnostics
          </div>
          <h1 className="mt-2 text-2xl font-black">Billing webhook diagnostics</h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">
            Redacted Paddle webhook events for troubleshooting subscription updates without exposing raw payloads or secrets.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadEvents()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-black text-white shadow-sm transition hover:brightness-95"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      <section className="grid gap-3 md:grid-cols-4">
        <MetricCard label="Events" value={metrics.total} />
        <MetricCard label="Processed" value={metrics.processed} />
        <MetricCard label="Failed" value={metrics.failed} />
        <MetricCard label="Ignored" value={metrics.ignored} />
      </section>

      {latestFailure && (
        <section className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-800">
          <div className="font-black">Latest failure: {latestFailure.reason || 'Unknown reason'}</div>
          <div className="mt-1 text-xs">
            {latestFailure.event_type || '-'} / {latestFailure.event_id || '-'} / {formatDate(latestFailure.received_at)}
          </div>
        </section>
      )}

      <section className="grid gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 md:grid-cols-[220px_1fr_auto]">
        <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
          Status
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}
            className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2 text-[var(--text-main)]"
          >
            <option value="all">All statuses</option>
            <option value="processed">Processed</option>
            <option value="failed">Failed</option>
            <option value="ignored">Ignored</option>
            <option value="received">Received</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
          Search event/user/subscription/customer/price
          <span className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="evt_..., sub_..., user id, price id"
              className="w-full rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-9 py-2 text-[var(--text-main)]"
            />
          </span>
        </label>

        <button
          type="button"
          onClick={() => {
            setStatusFilter('all');
            setQuery('');
          }}
          className="self-end rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-4 py-2 text-sm font-black text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
        >
          Clear filters
        </button>
      </section>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead>
              <tr className="border-b border-[var(--border-soft)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-3 font-black">Status</th>
                <th className="px-4 py-3 font-black">Event</th>
                <th className="px-4 py-3 font-black">User</th>
                <th className="px-4 py-3 font-black">Subscription</th>
                <th className="px-4 py-3 font-black">Price / Tier</th>
                <th className="px-4 py-3 font-black">Reason</th>
                <th className="px-4 py-3 font-black">Received</th>
              </tr>
            </thead>
            <tbody>
              {safeEvents.length > 0 ? safeEvents.map((event) => (
                <tr key={event.id} className="border-b border-[var(--border-soft)]/60 last:border-0">
                  <td className="px-4 py-3 align-top">
                    <StatusBadge status={event.processing_status} />
                    {event.http_status && (
                      <div className="mt-2 text-xs text-[var(--text-muted)]">HTTP {event.http_status}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="font-black text-[var(--text-main)]">{event.event_type || '-'}</div>
                    <div className="mt-1 max-w-[220px] truncate font-mono text-xs text-[var(--text-muted)]">{event.event_id || '-'}</div>
                    {event.occurred_at && (
                      <div className="mt-1 text-xs text-[var(--text-muted)]">Occurred: {formatDate(event.occurred_at)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="max-w-[220px] truncate font-mono text-xs text-[var(--text-muted)]">{event.target_user_id || '-'}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="max-w-[220px] truncate font-mono text-xs text-[var(--text-muted)]">{event.subscription_id || '-'}</div>
                    <div className="mt-1 max-w-[220px] truncate font-mono text-xs text-[var(--text-muted)]">{event.customer_id || '-'}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="max-w-[220px] truncate font-mono text-xs text-[var(--text-muted)]">{event.price_id || '-'}</div>
                    <div className="mt-1 text-xs font-black text-[var(--text-main)]">{event.tier || '-'}</div>
                  </td>
                  <td className="px-4 py-3 align-top">
                    <div className="max-w-[260px] truncate text-[var(--text-secondary)]">{event.reason || '-'}</div>
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-[var(--text-muted)]">
                    {formatDate(event.received_at)}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td className="px-4 py-6 text-sm text-[var(--text-muted)]" colSpan={7}>
                    {isLoading ? 'Loading...' : 'No billing webhook diagnostics yet.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
