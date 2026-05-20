import React, { useCallback, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from '../../../context/TranslationContext';
import { useAppStore } from '../../../store/useAppStore';
import { DiagnosticsMaintenancePanels } from './DiagnosticsMaintenancePanels';

type SettingsTranslator = ReturnType<typeof useTranslation>['t'];

type InvitationDiagnosticsText = {
  invitationDiagnostics: string;
  lastInvitationHydrationLabel: string;
  lastInvitationEventLabel: string;
  hydrationSummaryLabel: string;
  lastInvitationSourceLabel: string;
  lastInvitationStatusLabel: string;
  lastInvitationIdLabel: string;
  lastInvitationIgnoredLabel: string;
  lastInvitationIgnoredAtLabel: string;
  lastOwnerInvitationEventLabel: string;
  lastOwnerInvitationDetailsLabel: string;
  invitationErrorLabel: string;
  noInvitationActivity: string;
};

type NotificationDiagnosticsText = {
  notificationDiagnostics: string;
  lastNotificationEventLabel: string;
  lastNotificationTypeLabel: string;
  lastNotificationSourceLabel: string;
  lastNotificationTargetLabel: string;
  lastNotificationDedupLabel: string;
  lastNotificationSkipLabel: string;
  noNotificationActivity: string;
};

const getInvitationDiagnosticsText = (t: SettingsTranslator): InvitationDiagnosticsText => ({
  invitationDiagnostics: t.settings.invitationDiagnostics || 'Invitation Diagnostics',
  lastInvitationHydrationLabel: t.settings.lastInvitationHydrationLabel || 'Last Hydration',
  lastInvitationEventLabel: t.settings.lastInvitationEventLabel || 'Last Invitation Event',
  hydrationSummaryLabel: t.settings.hydrationSummaryLabel || 'Hydration Summary',
  lastInvitationSourceLabel: t.settings.lastInvitationSourceLabel || 'Last Event Source',
  lastInvitationStatusLabel: t.settings.lastInvitationStatusLabel || 'Last Event Status',
  lastInvitationIdLabel: t.settings.lastInvitationIdLabel || 'Last Invitation ID',
  lastInvitationIgnoredLabel: t.settings.lastInvitationIgnoredLabel || 'Last Ignored Event',
  lastInvitationIgnoredAtLabel: t.settings.lastInvitationIgnoredAtLabel || 'Ignored Event Time',
  lastOwnerInvitationEventLabel: t.settings.lastOwnerInvitationEventLabel || 'Last Owner Event',
  lastOwnerInvitationDetailsLabel: t.settings.lastOwnerInvitationDetailsLabel || 'Owner Event Details',
  invitationErrorLabel: t.settings.invitationErrorLabel || 'Invitation Telemetry Error',
  noInvitationActivity: t.settings.noInvitationActivity || 'None',
});

const getNotificationDiagnosticsText = (t: SettingsTranslator): NotificationDiagnosticsText => ({
  notificationDiagnostics: (t.settings as unknown as Record<string, string>).notificationDiagnostics || 'Notification Diagnostics',
  lastNotificationEventLabel: (t.settings as unknown as Record<string, string>).lastNotificationEventLabel || 'Last Notification Event',
  lastNotificationTypeLabel: (t.settings as unknown as Record<string, string>).lastNotificationTypeLabel || 'Last Notification Type',
  lastNotificationSourceLabel: (t.settings as unknown as Record<string, string>).lastNotificationSourceLabel || 'Last Notification Source',
  lastNotificationTargetLabel: (t.settings as unknown as Record<string, string>).lastNotificationTargetLabel || 'Last Notification Target',
  lastNotificationDedupLabel: (t.settings as unknown as Record<string, string>).lastNotificationDedupLabel || 'Last Notification Key',
  lastNotificationSkipLabel: (t.settings as unknown as Record<string, string>).lastNotificationSkipLabel || 'Last Skipped Notification',
  noNotificationActivity: (t.settings as unknown as Record<string, string>).noNotificationActivity || 'None',
});

export const DiagnosticsPanels: React.FC<{ includeTelemetry?: boolean; includeMaintenance?: boolean }> = ({
  includeTelemetry = true,
  includeMaintenance = false,
}) => {
  const { t, dateLocale } = useTranslation();
  const syncStatus = useAppStore((state) => state.syncStatus);
  const invitationTelemetry = useAppStore((state) => state.invitationTelemetry);
  const notificationTelemetry = useAppStore((state) => state.notificationTelemetry);

  const invitationText = useMemo(() => getInvitationDiagnosticsText(t), [t]);
  const notificationText = useMemo(() => getNotificationDiagnosticsText(t), [t]);

  const formatRelativeTime = useCallback((time: Date | null | undefined) => {
    if (!time) return t.settings.neverSynced;
    return formatDistanceToNow(time, { addSuffix: true, locale: dateLocale });
  }, [dateLocale, t.settings.neverSynced]);

  return (
    <>
      <div className="space-y-6">
        {includeTelemetry ? (
        <section className="space-y-4">
          <h4 className="px-3 text-xs font-semibold tracking-wide text-[var(--text-muted)]">{t.settings.syncDiagnostics}</h4>
          <div className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t.settings.syncStateLabel}</div>
                <div className="mt-1 text-xs font-bold text-[var(--text-main)]">{syncStatus.state}</div>
              </div>
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{t.settings.pendingChangesLabel}</div>
                <div className="mt-1 text-xs font-bold text-[var(--text-main)]">{syncStatus.pendingCount}</div>
              </div>
            </div>
            <div className="space-y-2 text-[11px] text-[var(--text-secondary)]">
              <div className="flex items-center justify-between gap-3"><span>{t.settings.lastSyncLabel}</span><span className="font-semibold text-[var(--text-main)]">{formatRelativeTime(syncStatus.lastSyncTime)}</span></div>
              <div className="flex items-center justify-between gap-3"><span>{t.settings.lastSupabaseSyncLabel}</span><span className="font-semibold text-[var(--text-main)]">{formatRelativeTime(syncStatus.lastSyncSupabase)}</span></div>
              <div className="flex items-center justify-between gap-3"><span>{t.settings.lastDriveSyncLabel}</span><span className="font-semibold text-[var(--text-main)]">{formatRelativeTime(syncStatus.lastSyncDrive)}</span></div>
            </div>
            {syncStatus.errorMessage ? (
              <div className="rounded-xl bg-red-500/5 border border-red-500/10 px-3 py-3 space-y-2">
                <div className="text-[11px] font-bold text-red-300">{syncStatus.errorMessage}</div>
                <div className="space-y-1 text-[10px] text-[var(--text-secondary)]">
                  {syncStatus.lastErrorCategory ? <div>{t.settings.lastErrorCategoryLabel}: <span className="font-semibold text-[var(--text-main)]">{syncStatus.lastErrorCategory}</span></div> : null}
                  {syncStatus.lastErrorAt ? <div>{t.settings.lastErrorAtLabel}: <span className="font-semibold text-[var(--text-main)]">{formatRelativeTime(syncStatus.lastErrorAt)}</span></div> : null}
                  {syncStatus.lastErrorRetryable !== undefined ? <div>{t.settings.retryExpectationLabel}: <span className="font-semibold text-[var(--text-main)]">{syncStatus.lastErrorRetryable ? t.settings.retryAutomatic : t.settings.retryManual}</span></div> : null}
                </div>
              </div>
            ) : null}
          </div>
        </section>
        ) : null}

        {includeTelemetry ? (
        <section className="space-y-4">
          <h4 className="px-3 text-xs font-semibold tracking-wide text-[var(--text-muted)]">{notificationText.notificationDiagnostics}</h4>
          <div className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{notificationText.lastNotificationEventLabel}</div>
                <div className="mt-1 text-xs font-bold text-[var(--text-main)]">{formatRelativeTime(notificationTelemetry.lastEventAt)}</div>
              </div>
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{notificationText.lastNotificationSkipLabel}</div>
                <div className="mt-1 text-xs font-bold text-[var(--text-main)]">
                  {notificationTelemetry.lastSkippedAt ? `${notificationTelemetry.lastSkippedSource}:${notificationTelemetry.lastSkippedReason || '-'}` : notificationText.noNotificationActivity}
                </div>
              </div>
            </div>
            <div className="space-y-2 text-[11px] text-[var(--text-secondary)]">
              <div className="flex items-center justify-between gap-3"><span>{notificationText.lastNotificationTypeLabel}</span><span className="font-semibold text-[var(--text-main)]">{notificationTelemetry.lastEventType}</span></div>
              <div className="flex items-center justify-between gap-3"><span>{notificationText.lastNotificationSourceLabel}</span><span className="font-semibold text-[var(--text-main)]">{notificationTelemetry.lastEventSource}</span></div>
              <div className="flex items-center justify-between gap-3"><span>{notificationText.lastNotificationTargetLabel}</span><span className="text-right font-semibold text-[var(--text-main)]">{notificationTelemetry.lastBirthdayName || notificationTelemetry.lastEventPersonId || (notificationTelemetry.lastIntegrityCount !== undefined ? `${notificationTelemetry.lastIntegrityCount}` : notificationText.noNotificationActivity)}</span></div>
              <div className="flex items-center justify-between gap-3"><span>{notificationText.lastNotificationDedupLabel}</span><span className="text-right font-semibold text-[var(--text-main)]">{notificationTelemetry.lastEventDedupKey || notificationText.noNotificationActivity}</span></div>
            </div>
          </div>
        </section>
        ) : null}

        {includeTelemetry ? (
        <section className="space-y-4">
          <h4 className="px-3 text-xs font-semibold tracking-wide text-[var(--text-muted)]">{invitationText.invitationDiagnostics}</h4>
          <div className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{invitationText.lastInvitationHydrationLabel}</div>
                <div className="mt-1 text-xs font-bold text-[var(--text-main)]">{formatRelativeTime(invitationTelemetry.lastHydratedAt)}</div>
              </div>
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{invitationText.lastInvitationEventLabel}</div>
                <div className="mt-1 text-xs font-bold text-[var(--text-main)]">{formatRelativeTime(invitationTelemetry.lastEventAt)}</div>
              </div>
            </div>
            <div className="space-y-2 text-[11px] text-[var(--text-secondary)]">
              <div className="flex items-center justify-between gap-3"><span>{invitationText.hydrationSummaryLabel}</span><span className="font-semibold text-[var(--text-main)]">{`${invitationTelemetry.lastHydrationCount}/${invitationTelemetry.lastHydrationAddedCount}/${invitationTelemetry.lastHydrationRemovedCount}`}</span></div>
              <div className="flex items-center justify-between gap-3"><span>{invitationText.lastInvitationSourceLabel}</span><span className="font-semibold text-[var(--text-main)]">{invitationTelemetry.lastEventSource}</span></div>
              <div className="flex items-center justify-between gap-3"><span>{invitationText.lastInvitationStatusLabel}</span><span className="font-semibold text-[var(--text-main)]">{invitationTelemetry.lastEventStatus || '-'}</span></div>
              <div className="flex items-center justify-between gap-3"><span>{invitationText.lastInvitationIdLabel}</span><span className="font-semibold text-[var(--text-main)]">{invitationTelemetry.lastEventInvitationId || '-'}</span></div>
              <div className="flex items-center justify-between gap-3"><span>{invitationText.lastInvitationIgnoredLabel}</span><span className="font-semibold text-[var(--text-main)]">{invitationTelemetry.lastIgnoredAt ? `${invitationTelemetry.lastIgnoredSource}:${invitationTelemetry.lastIgnoredStatus || '-'}` : invitationText.noInvitationActivity}</span></div>
              <div className="flex items-center justify-between gap-3"><span>{invitationText.lastInvitationIgnoredAtLabel}</span><span className="font-semibold text-[var(--text-main)]">{invitationTelemetry.lastIgnoredAt ? formatRelativeTime(invitationTelemetry.lastIgnoredAt) : invitationText.noInvitationActivity}</span></div>
              <div className="flex items-center justify-between gap-3"><span>{invitationText.lastOwnerInvitationEventLabel}</span><span className="font-semibold text-[var(--text-main)]">{invitationTelemetry.lastOwnerEventAt ? formatRelativeTime(invitationTelemetry.lastOwnerEventAt) : invitationText.noInvitationActivity}</span></div>
              <div className="flex items-center justify-between gap-3"><span>{invitationText.lastOwnerInvitationDetailsLabel}</span><span className="text-right font-semibold text-[var(--text-main)]">{invitationTelemetry.lastOwnerEventEmail ? `${invitationTelemetry.lastOwnerEventEmail} · ${invitationTelemetry.lastOwnerEventRole || '-'} · ${invitationTelemetry.lastOwnerEventStatus || '-'} · ${invitationTelemetry.lastOwnerEventInvitationId || '-'}` : invitationText.noInvitationActivity}</span></div>
            </div>
            {invitationTelemetry.lastErrorMessage ? (
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/10 px-3 py-3 space-y-1">
                <div className="text-[11px] font-bold text-amber-300">{invitationText.invitationErrorLabel}</div>
                <div className="text-[10px] text-[var(--text-secondary)]">{invitationTelemetry.lastErrorMessage}</div>
                <div className="text-[10px] text-[var(--text-muted)]">{formatRelativeTime(invitationTelemetry.lastErrorAt)}</div>
              </div>
            ) : null}
          </div>
        </section>
        ) : null}

        {includeMaintenance ? (
          <DiagnosticsMaintenancePanels />
        ) : null}
      </div>
    </>
  );
};
