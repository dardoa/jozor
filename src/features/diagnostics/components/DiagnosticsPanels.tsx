import React, { useCallback, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslation } from '../../../context/TranslationContext';
import { useAppStore } from '../../../store/useAppStore';
import { DiagnosticsMaintenancePanels } from './DiagnosticsMaintenancePanels';
import { deltaSyncService } from '../../../services/deltaSyncService';

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

type NotificationDiagnosticsSettings = SettingsTranslator['settings'] & Partial<NotificationDiagnosticsText>;

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

const getNotificationDiagnosticsText = (t: SettingsTranslator): NotificationDiagnosticsText => {
  const settings = t.settings as NotificationDiagnosticsSettings;

  return {
    notificationDiagnostics: settings.notificationDiagnostics || 'Notification Diagnostics',
    lastNotificationEventLabel: settings.lastNotificationEventLabel || 'Last Notification Event',
    lastNotificationTypeLabel: settings.lastNotificationTypeLabel || 'Last Notification Type',
    lastNotificationSourceLabel: settings.lastNotificationSourceLabel || 'Last Notification Source',
    lastNotificationTargetLabel: settings.lastNotificationTargetLabel || 'Last Notification Target',
    lastNotificationDedupLabel: settings.lastNotificationDedupLabel || 'Last Notification Key',
    lastNotificationSkipLabel: settings.lastNotificationSkipLabel || 'Last Skipped Notification',
    noNotificationActivity: settings.noNotificationActivity || 'None',
  };
};

export const DiagnosticsPanels: React.FC<{
  includeTelemetry?: boolean;
  includeMaintenance?: boolean;
  layout?: 'stack' | 'grid';
}> = ({
  includeTelemetry = true,
  includeMaintenance = false,
  layout = 'stack',
}) => {
  const { t, dateLocale } = useTranslation();
  const syncStatus = useAppStore((state) => state.syncStatus);
  const invitationTelemetry = useAppStore((state) => state.invitationTelemetry);
  const notificationTelemetry = useAppStore((state) => state.notificationTelemetry);

  const invitationText = useMemo(() => getInvitationDiagnosticsText(t), [t]);
  const notificationText = useMemo(() => getNotificationDiagnosticsText(t), [t]);

  const [fps, setFps] = React.useState<number | null>(null);
  const [domNodeCount, setDomNodeCount] = React.useState<number>(0);

  React.useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animId: number;

    const tick = () => {
      frameCount++;
      const now = performance.now();
      if (now - lastTime >= 1000) {
        setFps(Math.round((frameCount * 1000) / (now - lastTime)));
        frameCount = 0;
        lastTime = now;
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animId);
    };
  }, []);

  React.useEffect(() => {
    const updateCount = () => {
      const count = document.getElementById('family-tree-canvas')?.querySelectorAll('*').length || 0;
      setDomNodeCount(count);
    };
    updateCount();
    const interval = setInterval(updateCount, 1000);
    return () => clearInterval(interval);
  }, []);

  const layoutDuration = (typeof window !== 'undefined' && window.__LAST_LAYOUT_DURATION__ !== undefined)
    ? window.__LAST_LAYOUT_DURATION__
    : null;
  const layoutCached = (typeof window !== 'undefined' && window.__LAST_LAYOUT_CACHED__ !== undefined)
    ? window.__LAST_LAYOUT_CACHED__
    : false;

  const lastCheckpointVersion = useMemo(() => {
    return typeof deltaSyncService.getLastCheckpointVersion === 'function'
      ? deltaSyncService.getLastCheckpointVersion()
      : 0;
  }, []);

  const perfText = useMemo(() => ({
    performanceDiagnostics: t.settings.performanceDiagnostics || 'Performance & Graphics',
    renderingFps: t.settings.renderingFps || 'Rendering Frame Rate',
    fpsExcellent: t.settings.fpsExcellent || 'Excellent',
    fpsFair: t.settings.fpsFair || 'Fair',
    fpsPoor: t.settings.fpsPoor || 'Poor',
    domNodeCount: t.settings.domNodeCount || 'Active DOM Nodes',
    layoutDuration: t.settings.layoutDuration || 'Layout Execution',
    layoutCached: t.settings.layoutCached || 'Cached',
    startupTimeline: t.settings.startupTimeline || 'Startup Bootstrap Trace',
    lastCheckpoint: t.settings.lastCheckpoint || 'Last Synced Checkpoint',
    stepAuthSession: t.settings.stepAuthSession || 'Auth Session Resolved',
    stepProfileFetch: t.settings.stepProfileFetch || 'Profile Fetch',
    stepMemberships: t.settings.stepMemberships || 'Tree Memberships Fetch',
    stepHydration: t.settings.stepHydration || 'State Hydration',
    stepInteractive: t.settings.stepInteractive || 'Render to Interactive',
    stepUid: t.settings.stepUid || 'UID Resolved',
  }), [t]);

  const getLocalizedStepName = useCallback((name: string) => {
    switch (name) {
      case 'Auth Session Available': return perfText.stepAuthSession;
      case 'UID Resolved': return perfText.stepUid;
      case 'Profile Fetch': return perfText.stepProfileFetch;
      case 'Memberships Fetch': return perfText.stepMemberships;
      case 'State Hydration': return perfText.stepHydration;
      case 'Render to Interactive': return perfText.stepInteractive;
      default: return name;
    }
  }, [perfText]);

  interface StartupStep {
    name: string;
    durationMs: number | null;
    timestampMs: number;
  }

  const startupSteps = useMemo<StartupStep[]>(() => {
    const steps: StartupStep[] = [];
    const measures = performance.getEntriesByType('measure');
    
    const addMeasureIfExists = (measureName: string, label: string) => {
      const entry = measures.find(m => m.name === measureName);
      if (entry) {
        steps.push({
          name: label,
          durationMs: Math.round(entry.duration),
          timestampMs: Math.round(entry.startTime),
        });
      }
    };

    addMeasureIfExists('Diagnostic Checkpoint 3: Profile Fetch', 'Profile Fetch');
    addMeasureIfExists('Diagnostic Checkpoint 4: Memberships Claim', 'Memberships Fetch');
    addMeasureIfExists('Diagnostic Checkpoint 8: State Hydration', 'State Hydration');
    addMeasureIfExists('Diagnostic Checkpoint 9 to 10: Render to Interactive', 'Render to Interactive');
    
    const marks = performance.getEntriesByType('mark');
    const sessionMark = marks.find(m => m.name === 'diagnostic-1-auth-session-available');
    if (sessionMark) {
      steps.push({
        name: 'Auth Session Available',
        durationMs: null,
        timestampMs: Math.round(sessionMark.startTime),
      });
    }
    
    const uidMark = marks.find(m => m.name === 'diagnostic-2-uid-available');
    if (uidMark) {
      steps.push({
        name: 'UID Resolved',
        durationMs: null,
        timestampMs: Math.round(uidMark.startTime),
      });
    }

    return steps.sort((a, b) => a.timestampMs - b.timestampMs);
  }, []);

  const formatRelativeTime = useCallback((time: Date | null | undefined) => {
    if (!time) return t.settings.neverSynced;
    return formatDistanceToNow(time, { addSuffix: true, locale: dateLocale });
  }, [dateLocale, t.settings.neverSynced]);

  return (
    <>
      <div className={layout === 'grid' ? "grid grid-cols-1 lg:grid-cols-2 gap-6" : "space-y-6"}>
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
          <h4 className="px-3 text-xs font-semibold tracking-wide text-[var(--text-muted)]">{perfText.performanceDiagnostics}</h4>
          <div className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] p-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{perfText.renderingFps}</div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-xs font-black text-[var(--text-main)]">{fps !== null ? `${fps} FPS` : '...'}</span>
                  {fps !== null && (
                    <span className={`inline-flex items-center rounded px-1 py-0.5 text-[8px] font-bold ${
                      fps >= 55 ? 'bg-emerald-500/10 text-emerald-500' :
                      fps >= 30 ? 'bg-amber-500/10 text-amber-500' :
                      'bg-rose-500/10 text-rose-500'
                    }`}>
                      {fps >= 55 ? perfText.fpsExcellent : fps >= 30 ? perfText.fpsFair : perfText.fpsPoor}
                    </span>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">{perfText.domNodeCount}</div>
                <div className="mt-1 text-xs font-bold text-[var(--text-main)]">{domNodeCount}</div>
              </div>
            </div>

            <div className="space-y-2 text-[11px] text-[var(--text-secondary)]">
              <div className="flex items-center justify-between gap-3">
                <span>{perfText.layoutDuration}</span>
                <span className="font-semibold text-[var(--text-main)]">
                  {layoutDuration !== null ? (
                    layoutCached ? (
                      <span className="inline-flex items-center rounded bg-blue-500/10 px-1 py-0.5 text-[8px] font-bold text-blue-500">
                        {perfText.layoutCached}
                      </span>
                    ) : (
                      `${Math.round(layoutDuration)}ms`
                    )
                  ) : (
                    '-'
                  )}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span>{perfText.lastCheckpoint}</span>
                <span className="font-semibold text-[var(--text-main)] font-mono">
                  {lastCheckpointVersion > 0 ? `v${lastCheckpointVersion}` : '-'}
                </span>
              </div>
            </div>

            {startupSteps.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[var(--border-soft)]">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)] mb-2">{perfText.startupTimeline}</div>
                <div className="space-y-3 relative pl-3 border-l border-[var(--border-soft)] ml-1">
                  {startupSteps.map((step, idx) => (
                    <div key={idx} className="relative flex flex-col gap-0.5">
                      <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full border border-[var(--surface-panel-subtle)] bg-[var(--primary-500)]" />
                      <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]">
                        <span className="font-bold text-[var(--text-main)]">{getLocalizedStepName(step.name)}</span>
                        <span className="font-mono">{step.timestampMs}ms</span>
                      </div>
                      {step.durationMs !== null && (
                        <div className="text-[9px] text-[var(--text-muted)] font-medium">
                          Duration: <span className="font-mono">{step.durationMs}ms</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
          <div className={layout === 'grid' ? "lg:col-span-2" : ""}>
            <DiagnosticsMaintenancePanels layout={layout} />
          </div>
        ) : null}
      </div>
    </>
  );
};
