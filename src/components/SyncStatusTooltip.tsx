import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import { FloatingArrow } from '@floating-ui/react';
import { SyncStatus } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { ConfirmationModal } from './ConfirmationModal';
import {
    deriveSyncStatusPresentation,
    type DriveConnectionState,
    getDriveStatusClass,
    getSupabaseStatusClass,
    getSyncStatusDotClass,
    getSyncStatusText,
} from './syncStatusPresentation';

interface SyncStatusTooltipProps {
    syncStatus: SyncStatus;
    driveConnectionState: DriveConnectionState;
    hasLinkedBackup: boolean;
    onForceSync: () => void;
    onOpenVault: () => void;
    onClearSyncCache: () => void;
    onResetError: () => void;
    onClose: () => void;
    setFloating: (node: HTMLElement | null) => void;
    setArrowElement: (node: SVGSVGElement | null) => void;
    floatingStyles: React.CSSProperties;
    getFloatingProps: (userProps?: React.HTMLProps<HTMLElement>) => Record<string, unknown>;
    context: ReturnType<typeof import('@floating-ui/react').useFloating>['context'];
}

export const SyncStatusTooltip: React.FC<SyncStatusTooltipProps> = ({
    setFloating,
    setArrowElement,
    floatingStyles,
    getFloatingProps,
    context,
    syncStatus,
    driveConnectionState,
    hasLinkedBackup,
    onForceSync,
    onOpenVault,
    onClearSyncCache,
    onResetError,
    onClose,
}) => {
    const { t, dateLocale } = useTranslation();
    const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = React.useState(false);
    const syncText = t.syncStatus;
    const presentation = deriveSyncStatusPresentation({
        syncStatus,
        driveConnectionState,
        hasLinkedBackup,
    });
    
    const formatTime = (time: Date | null) => {
        if (!time) return syncText.never;
        return formatDistanceToNow(time, { addSuffix: true, locale: dateLocale });
    };

    const databaseStatusLabel = presentation.databaseState === 'checking'
        ? syncText.checking
        : presentation.databaseState === 'offline'
            ? syncText.offline
            : presentation.databaseState === 'syncing'
                ? syncText.syncing
                : presentation.databaseState === 'error'
                    ? syncText.needsAttention
                    : syncText.online;
    const databaseStatusClass = presentation.databaseState === 'error'
        ? getSupabaseStatusClass('error')
        : presentation.databaseState === 'syncing' || presentation.databaseState === 'checking'
            ? getSupabaseStatusClass('syncing')
            : presentation.databaseState === 'offline'
                ? 'text-[var(--text-muted)]'
                : getSupabaseStatusClass('idle');
    const driveConnectionLabel = presentation.driveConnectionState === 'connected'
        ? syncText.connected
        : presentation.driveConnectionState === 'expired'
            ? syncText.sessionExpired
            : syncText.disconnected;
    const backupStatusLabel = presentation.backupState === 'uploading'
        ? syncText.uploading
        : presentation.backupState === 'error'
            ? syncText.needsAttention
            : presentation.backupState === 'backed-up'
                ? syncText.backedUp
                : presentation.backupState === 'ready'
                    ? syncText.backupReady
                    : presentation.backupState === 'unlinked'
                        ? syncText.backupUnlinked
                        : driveConnectionLabel;
    const backupStatusClass = presentation.backupState === 'error' || presentation.backupState === 'expired'
        ? getDriveStatusClass('error')
        : presentation.backupState === 'uploading'
            ? getDriveStatusClass('uploading')
            : presentation.backupState === 'disconnected' || presentation.backupState === 'unlinked'
                ? 'text-[var(--text-muted)]'
                : getDriveStatusClass('idle');
    const primaryActionLabel = presentation.primaryAction === 'retry-database'
        ? syncText.retryNow
        : presentation.primaryAction === 'open-backups'
            ? syncText.openBackupSettings
            : presentation.primaryAction === 'reset-backup'
                ? syncText.resetBackupAction
                : presentation.primaryAction === 'backup-now'
                    ? syncText.backupNow
                    : null;

    const handlePrimaryAction = () => {
        if (presentation.primaryAction === 'retry-database') {
            onResetError();
            onClose();
        } else if (presentation.primaryAction === 'open-backups') {
            onOpenVault();
            onClose();
        } else if (presentation.primaryAction === 'reset-backup') {
            setIsConfirmClearModalOpen(true);
        } else if (presentation.primaryAction === 'backup-now') {
            onForceSync();
            onClose();
        }
    };

    return (
        <div
            ref={setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="w-72 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-[var(--border-main)] p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-300"
        >
            <FloatingArrow
                ref={setArrowElement}
                context={context}
                fill="currentColor"
                className="text-white dark:text-gray-800"
                stroke="var(--border-main)"
                strokeWidth={1}
            />
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getSyncStatusDotClass(syncStatus.state)}`} />
                    <span className="font-semibold text-[var(--text-main)]">{getSyncStatusText(syncStatus.state, syncText)}</span>
                    {syncStatus.pendingCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-[var(--primary-100)] text-[var(--primary-700)] dark:bg-[var(--primary-900)] dark:text-[var(--primary-300)] text-[10px] font-bold">
                            {syncStatus.pendingCount}
                        </span>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-[var(--theme-hover)] rounded transition-colors"
                    aria-label={t.common.closeAria}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            <div className="space-y-3 text-xs mb-4 bg-[var(--theme-surface)] rounded-xl p-3 border border-[var(--border-main)]">
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-[var(--text-dim)]">{syncText.databaseSyncLabel}</span>
                        <span className={`font-bold ${databaseStatusClass}`}>
                            {databaseStatusLabel}
                        </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-dim)] opacity-70">
                        {syncText.lastLabel}: {formatTime(syncStatus.lastSyncSupabase)}
                    </div>
                </div>

                <div className="h-px bg-[var(--border-main)]/50 mx-1"></div>

                <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--text-dim)]">{syncText.offlineQueueLabel}</span>
                    <span className="text-end font-bold text-[var(--text-main)]">
                        {presentation.queueState === 'pending'
                            ? syncText.queuePending.replace('{count}', String(syncStatus.pendingCount))
                            : syncText.queueClear}
                    </span>
                </div>

                <div className="h-px bg-[var(--border-main)]/50 mx-1"></div>

                <div className="flex items-center justify-between gap-3">
                    <span className="text-[var(--text-dim)]">{syncText.driveConnectionLabel}</span>
                    <span className={`text-end font-bold ${presentation.driveConnectionState === 'connected' ? 'text-green-600 dark:text-green-400' : 'text-[var(--text-muted)]'}`}>
                        {driveConnectionLabel}
                    </span>
                </div>

                <div className="h-px bg-[var(--border-main)]/50 mx-1"></div>

                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-[var(--text-dim)]">{syncText.backupFileLabel}</span>
                        <span className={`text-end font-bold ${backupStatusClass}`}>
                            {backupStatusLabel}
                        </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-dim)] opacity-70">
                        {syncText.lastLabel}: {formatTime(syncStatus.lastSyncDrive)}
                    </div>
                </div>
            </div>

            {syncStatus.errorMessage && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2 mb-3">
                    {syncStatus.errorMessage}
                    {(syncStatus.lastErrorCategory || syncStatus.lastErrorAt || syncStatus.lastErrorRetryable !== undefined) && (
                        <div className="mt-2 space-y-1 text-[10px] opacity-80">
                            {syncStatus.lastErrorCategory && (
                                <div>{syncText.categoryLabel}: {syncStatus.lastErrorCategory}</div>
                            )}
                            {syncStatus.lastErrorAt && (
                                <div>{syncText.whenLabel}: {formatTime(syncStatus.lastErrorAt)}</div>
                            )}
                            {syncStatus.lastErrorRetryable !== undefined && (
                                <div>{syncText.retryLabel}: {syncStatus.lastErrorRetryable ? syncText.retryAutomatic : syncText.retryManual}</div>
                            )}
                            {(syncStatus.retryAttempt ?? 0) > 0 && (
                                <div>{syncText.retryAttemptLabel}: {syncStatus.retryAttempt}</div>
                            )}
                            {syncStatus.nextRetryAt && (
                                <div>{syncText.nextRetryLabel}: {formatTime(syncStatus.nextRetryAt)}</div>
                            )}
                            {syncStatus.retryPaused && (
                                <div>{syncText.retryPausedLabel}</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-2">
                {primaryActionLabel ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold uppercase text-[var(--text-dim)]">{syncText.nextActionLabel}</p>
                    <button
                        onClick={handlePrimaryAction}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--primary-600)] px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--primary-500)]"
                    >
                        {presentation.primaryAction === 'reset-backup' ? (
                            <AlertCircle className="h-4 w-4" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                        {primaryActionLabel}
                    </button>
                  </div>
                ) : null}
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--border-main)] text-xs text-[var(--text-dim)]">
                {syncText.footerNote}
            </div>

            {isConfirmClearModalOpen && (
                <ConfirmationModal
                    isOpen={isConfirmClearModalOpen}
                    onClose={() => setIsConfirmClearModalOpen(false)}
                    onConfirm={() => {
                        onClearSyncCache();
                        onClose();
                    }}
                    title={t.settings?.clearSyncQueue || syncText.resetBackupDialogTitle}
                    message={syncText.resetBackupMessage}
                    confirmText={t.confirm}
                    type="warning"
                    overlayId="sync-reset-confirm"
                />
            )}
        </div>
    );
};
