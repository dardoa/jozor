import React, { useCallback, useState } from 'react';

import { useTranslation } from '../context/TranslationContext';
import { useAppStore } from '../store/useAppStore';
import { deltaSyncService } from '../services/deltaSyncService';
import { pruneActivityLogs, pruneTreeOperations } from '../services/operationalMaintenanceService';
import { showToast } from '../utils/showToast';
import { ConfirmationModal } from './ConfirmationModal';

export const DiagnosticsMaintenancePanels: React.FC = () => {
  const { t } = useTranslation();
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const currentUserRole = useAppStore((state) => state.currentUserRole);
  const user = useAppStore((state) => state.user);

  const [isRunningMaintenance, setIsRunningMaintenance] = useState(false);
  const [isClearSyncConfirmOpen, setClearSyncConfirmOpen] = useState(false);

  const canRunMaintenance = Boolean(currentTreeId && user && currentUserRole === 'owner');

  const runMaintenance = useCallback(async (
    mode: 'operations' | 'activity',
    task: () => Promise<number>
  ) => {
    if (!canRunMaintenance || !currentTreeId || !user) {
      showToast.error('settings.maintenanceOwnerOnly');
      return;
    }

    const loadingMessage =
      mode === 'operations'
        ? t.settings.pruneOperationsRunning
        : t.settings.pruneActivityLogsRunning;
    const successTemplate =
      mode === 'operations'
        ? t.settings.pruneOperationsSuccess
        : t.settings.pruneActivityLogsSuccess;
    const fallbackError =
      mode === 'operations'
        ? t.settings.pruneOperationsError
        : t.settings.pruneActivityLogsError;

    setIsRunningMaintenance(true);
    const toastId = showToast.loading(loadingMessage);

    try {
      const deletedCount = await task();
      showToast.success(successTemplate.replace('{count}', String(deletedCount)), { id: toastId, duration: 3500 });
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : fallbackError, { id: toastId, duration: 4500 });
    } finally {
      setIsRunningMaintenance(false);
    }
  }, [canRunMaintenance, currentTreeId, t.settings, user]);

  return (
    <>
      <section className="space-y-4">
        <h4 className="px-3 text-xs font-semibold tracking-wide text-[var(--text-muted)]">{t.settings.maintenance}</h4>
        <div className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] p-4">
          <p className="px-1 text-[11px] font-bold leading-relaxed text-[var(--text-secondary)]">{t.settings.maintenanceDesc}</p>
          {canRunMaintenance ? (
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => void runMaintenance('operations', () => pruneTreeOperations(currentTreeId!, user!, 2000))} disabled={isRunningMaintenance} className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] py-2.5 text-[11px] font-semibold tracking-wide text-[var(--text-main)] transition-all hover:border-[var(--primary-500)]/20 hover:bg-[var(--primary-600)]/10 disabled:cursor-not-allowed disabled:opacity-50">{t.settings.pruneOperations}</button>
              <button onClick={() => void runMaintenance('activity', () => pruneActivityLogs(currentTreeId!, user!, 180))} disabled={isRunningMaintenance} className="w-full rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] py-2.5 text-[11px] font-semibold tracking-wide text-[var(--text-main)] transition-all hover:border-[var(--primary-500)]/20 hover:bg-[var(--primary-600)]/10 disabled:cursor-not-allowed disabled:opacity-50">{t.settings.pruneActivityLogs}</button>
            </div>
          ) : (
            <div className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-3 text-[11px] font-semibold text-[var(--text-secondary)]">
              {t.settings.maintenanceOwnerOnly}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h4 className="px-3 text-xs font-semibold tracking-wide text-[var(--text-muted)]">{t.settings.clearSyncQueue}</h4>
        <div className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] p-4">
          <p className="px-1 text-[11px] font-bold leading-relaxed text-[var(--text-secondary)]">{t.settings.clearSyncQueueDesc}</p>
          <button
            onClick={() => setClearSyncConfirmOpen(true)}
            className="w-full rounded-xl border border-[var(--danger-500)]/20 bg-[var(--danger-500)]/10 py-2.5 text-[11px] font-semibold tracking-wide text-[var(--danger-500)] transition-all hover:bg-[var(--danger-500)]/15"
          >
            {t.settings.clearSyncQueue}
          </button>
        </div>
      </section>

      <ConfirmationModal
        isOpen={isClearSyncConfirmOpen}
        onClose={() => setClearSyncConfirmOpen(false)}
        onConfirm={() => deltaSyncService.clearOutgoingQueue()}
        title={t.settings.clearSyncQueue}
        message={t.settings.clearSyncQueueDesc}
        type="danger"
        overlayId="clear-sync-queue-confirm"
        requiredConfirmText={t.settings.clearSyncConfirmValue}
        confirmPlaceholder={t.settings.clearSyncConfirmPlaceholder}
      />
    </>
  );
};
