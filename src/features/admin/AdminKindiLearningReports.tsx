import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, BarChart3, BrainCircuit, RefreshCw, ShieldCheck } from 'lucide-react';

import { useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../context/TranslationContext';
import {
  fetchKindiLearningReports,
  type KindiLearningEventType,
  type KindiLearningReports,
  type KindiLearningReportFilters,
} from '../kindi';

const eventTypeValues = [
  'all',
  'query_submitted',
  'search_failure',
  'ai_fallback_requested',
  'confirmation_cancelled',
  'disambiguation_shown',
  'support_unanswered',
] as const;

const formatPercent = (value: number) => `${Math.round((value || 0) * 100)}%`;
const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : '-';

const returnToApp = () => {
  if (window.history.length > 1) {
    window.history.back();
    return;
  }

  window.history.pushState(null, '', '/');
  window.dispatchEvent(new PopStateEvent('popstate'));
};

const StatCard = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) => (
  <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-sm">
    <div className="text-xs font-bold uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
    <div className="mt-2 text-2xl font-black text-[var(--text-main)]">{value}</div>
    {hint && <div className="mt-1 text-xs text-[var(--text-secondary)]">{hint}</div>}
  </div>
);

const SimpleTable = ({
  title,
  columns,
  rows,
  emptyMessage,
}: {
  title: string;
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyMessage: string;
}) => (
  <section className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)]">
    <div className="border-b border-[var(--border-soft)] px-4 py-3">
      <h2 className="text-sm font-black text-[var(--text-main)]">{title}</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-[var(--border-soft)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
            {columns.map((column) => (
              <th key={column} className="px-4 py-2 font-black">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length > 0 ? rows.map((row, index) => (
            <tr key={index} className="border-b border-[var(--border-soft)]/60 last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-4 py-2 align-top text-[var(--text-secondary)]">
                  {cell}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td className="px-4 py-5 text-sm text-[var(--text-muted)]" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </section>
);

export const AdminKindiLearningReports: React.FC = () => {
  const { t, language } = useTranslation();
  const text = t.adminKindiLearning;
  const BackIcon = language === 'ar' ? ArrowRight : ArrowLeft;
  const user = useAppStore((state) => state.user);
  const [reports, setReports] = useState<KindiLearningReports | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<KindiLearningReportFilters>({ eventType: 'all' });

  const loadReports = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      setReports(await fetchKindiLearningReports(user, filters));
    } catch (reportError) {
      setError(reportError instanceof Error ? reportError.message : 'Failed to load reports.');
    } finally {
      setIsLoading(false);
    }
  }, [filters, user]);

  useEffect(() => {
    void loadReports();
  }, [loadReports]);

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--surface-app)] p-6 text-[var(--text-main)]">
        <div className="mx-auto max-w-3xl rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6">
          <h1 className="text-xl font-black">{text.adminRequiredTitle}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{text.adminRequiredBody}</p>
        </div>
      </div>
    );
  }

  if (!isLoading && reports && !reports.isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--surface-app)] p-6 text-[var(--text-main)]">
        <div className="mx-auto max-w-3xl rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-[var(--primary-600)]" />
          <h1 className="text-xl font-black">{text.protectedTitle}</h1>
          </div>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {text.protectedBody}
          </p>
        </div>
      </div>
    );
  }

  const overview = reports?.overview;

  return (
    <div className="min-h-screen bg-[var(--surface-app)] px-4 py-6 text-[var(--text-main)] sm:px-6">
      <main className="mx-auto flex max-w-7xl flex-col gap-5">
        <header className="flex flex-col gap-3 border-b border-[var(--border-soft)] pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              type="button"
              onClick={returnToApp}
              className="mb-3 inline-flex items-center gap-2 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-black text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]"
            >
              <BackIcon className="h-4 w-4" />
              {text.backToApp}
            </button>
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--primary-600)]">
              <BrainCircuit className="h-4 w-4" />
              {text.breadcrumb}
            </div>
            <h1 className="mt-2 text-2xl font-black">{text.title}</h1>
            <p className="mt-1 max-w-2xl text-sm text-[var(--text-secondary)]">
              {text.description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadReports()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-black text-white shadow-sm transition hover:brightness-95"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            {text.refresh}
          </button>
        </header>

        <section className="grid gap-3 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 sm:grid-cols-4">
          <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
            {text.filters.dateFrom}
            <input
              type="date"
              value={filters.dateFrom?.slice(0, 10) ?? ''}
              onChange={(event) => setFilters((current) => ({
                ...current,
                dateFrom: event.target.value ? new Date(event.target.value).toISOString() : undefined,
              }))}
              className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2 text-[var(--text-main)]"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
            {text.filters.dateTo}
            <input
              type="date"
              value={filters.dateTo?.slice(0, 10) ?? ''}
              onChange={(event) => setFilters((current) => ({
                ...current,
                dateTo: event.target.value ? new Date(`${event.target.value}T23:59:59`).toISOString() : undefined,
              }))}
              className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2 text-[var(--text-main)]"
            />
          </label>
          <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
            {text.filters.eventType}
            <select
              value={filters.eventType ?? 'all'}
              onChange={(event) => setFilters((current) => ({
                ...current,
                eventType: event.target.value as KindiLearningEventType | 'all',
              }))}
              className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2 text-[var(--text-main)]"
            >
              {eventTypeValues.map((value) => (
                <option key={value} value={value}>{text.eventTypes[value]}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-bold text-[var(--text-secondary)]">
            {text.filters.parserVersion}
            <input
              value={filters.parserVersion ?? ''}
              onChange={(event) => setFilters((current) => ({
                ...current,
                parserVersion: event.target.value.trim() || undefined,
              }))}
              placeholder={text.filters.allVersions}
              className="rounded-md border border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2 text-[var(--text-main)]"
            />
          </label>
        </section>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-[var(--danger-500)]/30 bg-[var(--danger-500)]/10 p-4 text-sm text-[var(--text-main)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 text-[var(--danger-600)]" />
            <span>{error}</span>
          </div>
        )}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label={text.stats.kindiUses} value={overview?.kindi_uses ?? 0} />
          <StatCard label={text.stats.aiFallbacks} value={overview?.ai_fallbacks ?? 0} />
          <StatCard label={text.stats.failureEvents} value={overview?.search_failures ?? 0} />
          <StatCard label={text.stats.nameAmbiguity} value={overview?.disambiguations ?? 0} />
          <StatCard label={text.stats.localOpportunities} value={overview?.local_improvement_opportunities ?? 0} hint={text.stats.localOpportunitiesHint} />
          <StatCard label={text.stats.cancelledConfirmations} value={overview?.cancellations ?? 0} />
          <StatCard label={text.stats.aiSuccessAfterConfirm} value={formatPercent(overview?.ai_success_after_confirmation_rate ?? 0)} />
          <StatCard label={text.stats.cancellationRate} value={formatPercent(overview?.cancellation_rate ?? 0)} />
        </section>

        <SimpleTable
          title={text.tables.localOpportunities}
          emptyMessage={text.tables.localOpportunitiesEmpty}
          columns={[text.columns.redactedQuery, text.columns.route, text.columns.intent, text.columns.failure, text.columns.count, text.columns.avgConfidence, text.columns.lastSeen]}
          rows={(reports?.localOpportunities ?? []).map((row) => [
            <code className="text-xs" key={row.redacted_query}>{row.redacted_query}</code>,
            row.route_kind ?? '-',
            row.intent_guess ?? '-',
            row.failure_reason ?? '-',
            row.opportunity_count,
            row.avg_ai_confidence === null ? '-' : row.avg_ai_confidence.toFixed(2),
            formatDate(row.last_seen_at),
          ])}
        />

        <section className="grid gap-5 xl:grid-cols-2">
          <SimpleTable
            title={text.tables.failures}
            emptyMessage={text.tables.empty}
            columns={[text.columns.reason, text.columns.route, text.columns.count, text.columns.lastSeen]}
            rows={(reports?.failures ?? []).map((row) => [
              row.reason,
              row.route_kind ?? '-',
              row.event_count,
              formatDate(row.last_seen_at),
            ])}
          />
          <SimpleTable
            title={text.tables.fallbacks}
            emptyMessage={text.tables.empty}
            columns={[text.columns.result, text.columns.count, text.columns.avgConfidence, text.columns.lastSeen]}
            rows={(reports?.fallbacks ?? []).map((row) => [
              row.fallback_result,
              row.event_count,
              row.avg_confidence === null ? '-' : row.avg_confidence.toFixed(2),
              formatDate(row.last_seen_at),
            ])}
          />
          <SimpleTable
            title={text.tables.ambiguousNames}
            emptyMessage={text.tables.empty}
            columns={[text.columns.pattern, text.columns.count, text.columns.avgCandidates, text.columns.lastSeen]}
            rows={(reports?.ambiguousNames ?? []).map((row) => [
              <code className="text-xs" key={row.redacted_pattern}>{row.redacted_pattern}</code>,
              row.event_count,
              row.avg_candidate_count === null ? '-' : row.avg_candidate_count.toFixed(1),
              formatDate(row.last_seen_at),
            ])}
          />
          <SimpleTable
            title={text.tables.redactedPatterns}
            emptyMessage={text.tables.empty}
            columns={[text.columns.redactedQuery, text.columns.count, text.columns.lastSeen]}
            rows={(reports?.redactedQueries ?? []).map((row) => [
              <code className="text-xs" key={row.redacted_query}>{row.redacted_query}</code>,
              row.event_count,
              formatDate(row.last_seen_at),
            ])}
          />
        </section>

        <SimpleTable
          title={text.tables.recentEvents}
          emptyMessage={text.tables.empty}
          columns={[text.columns.time, text.columns.event, text.columns.route, text.columns.stage, text.columns.parser, text.columns.reason, text.columns.confidence]}
          rows={(reports?.recentEvents ?? []).map((row) => [
            formatDate(row.created_at),
            row.event_type,
            row.route_kind ?? '-',
            row.parser_stage ?? '-',
            row.parser_name ?? row.parser_version,
            row.failure_reason ?? '-',
            row.confidence === null ? '-' : row.confidence.toFixed(2),
          ])}
        />

        <div className="flex items-start gap-2 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 text-sm text-[var(--text-secondary)]">
          <BarChart3 className="mt-0.5 h-4 w-4 text-[var(--primary-600)]" />
          <p>
            {text.footerNote}
          </p>
        </div>
      </main>
    </div>
  );
};
