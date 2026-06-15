import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import { FloatingArrow } from '@floating-ui/react';
import { SyncStatus } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { ConfirmationModal } from './ConfirmationModal';
import {
    getDriveStatusClass,
    getDriveStatusLabel,
    getSupabaseStatusClass,
    getSupabaseStatusLabel,
    getSyncStatusDotClass,
    getSyncStatusText,
} from './syncStatusPresentation';

interface SyncStatusTooltipProps {
    syncStatus: SyncStatus;
    onForceSync: () => void;
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
    onForceSync,
    onClearSyncCache,
    onResetError,
    onClose,
}) => {
    const { t } = useTranslation();
    const [isConfirmClearModalOpen, setIsConfirmClearModalOpen] = React.useState(false);
    const syncText = t.syncStatus || {};
    
    const formatTime = (time: Date | null) => {
        if (!time) return syncText.never || 'Never';
        return formatDistanceToNow(time, { addSuffix: true });
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

                <div className="text-[11px] text-[var(--text-dim)] mb-3 flex items-center gap-2">
                <RefreshCw className="w-3 h-3" />
                <span><strong>{syncText.overallLabel || 'Overall'}:</strong> {formatTime(syncStatus.lastSyncTime)}</span>
            </div>

            <div className="space-y-3 text-xs mb-4 bg-[var(--theme-surface)] rounded-xl p-3 border border-[var(--border-main)]">
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-[var(--text-dim)]">Cloud Sync (Supabase)</span>
                        <span className={`font-bold ${getSupabaseStatusClass(syncStatus.supabaseStatus)}`}>
                            {getSupabaseStatusLabel(syncStatus.supabaseStatus, syncText)}
                        </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-dim)] opacity-70">
                        {syncText.lastLabel || 'Last'}: {formatTime(syncStatus.lastSyncSupabase)}
                    </div>
                </div>

                <div className="h-px bg-[var(--border-main)]/50 mx-1"></div>

                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-[var(--text-dim)]">Backup (Google Drive)</span>
                        <span className={`font-bold ${getDriveStatusClass(syncStatus.driveStatus)}`}>
                            {getDriveStatusLabel(syncStatus.driveStatus, syncText)}
                        </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-dim)] opacity-70">
                        {syncText.lastLabel || 'Last'}: {formatTime(syncStatus.lastSyncDrive)}
                    </div>
                </div>
            </div>

            {syncStatus.errorMessage && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2 mb-3">
                    {syncStatus.errorMessage}
                    {(syncStatus.lastErrorCategory || syncStatus.lastErrorAt || syncStatus.lastErrorRetryable !== undefined) && (
                        <div className="mt-2 space-y-1 text-[10px] opacity-80">
                            {syncStatus.lastErrorCategory && (
                                <div>{syncText.categoryLabel || 'Category'}: {syncStatus.lastErrorCategory}</div>
                            )}
                            {syncStatus.lastErrorAt && (
                                <div>{syncText.whenLabel || 'When'}: {formatTime(syncStatus.lastErrorAt)}</div>
                            )}
                            {syncStatus.lastErrorRetryable !== undefined && (
                                <div>{syncText.retryLabel || 'Retry'}: {syncStatus.lastErrorRetryable ? (syncText.retryAutomatic || 'Automatic retry expected') : (syncText.retryManual || 'Manual action may be required')}</div>
                            )}
                            {(syncStatus.retryAttempt ?? 0) > 0 && (
                                <div>{syncText.retryAttemptLabel || 'Attempt'}: {syncStatus.retryAttempt}</div>
                            )}
                            {syncStatus.nextRetryAt && (
                                <div>{syncText.nextRetryLabel || 'Next retry'}: {formatTime(syncStatus.nextRetryAt)}</div>
                            )}
                            {syncStatus.retryPaused && (
                                <div>{syncText.retryPausedLabel || 'Automatic retries paused. Your changes remain saved locally.'}</div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <button
                    onClick={() => {
                        onForceSync();
                        onClose();
                    }}
                    className="w-full py-2 px-3 bg-[var(--primary-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-500)] transition-colors flex items-center justify-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    {syncText.backupNow || 'Backup Now (Google Drive)'}
                </button>

                <button
                    onClick={() => setIsConfirmClearModalOpen(true)}
                    className="w-full py-2 px-3 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30 rounded-lg text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all flex items-center justify-center gap-2"
                    title={syncText.resetBackupTitle || 'Purge corrupted sync state and force new file creation'}
                >
                    <AlertCircle className="w-3.5 h-3.5" />
                    {syncText.resetBackupAction || 'Reset Backup Link & Retry'}
                </button>

                {syncStatus.state === 'error' && (
                    <button
                        onClick={() => {
                            onResetError();
                            onClose();
                        }}
                        className="w-full py-2 px-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        {syncStatus.retryPaused
                            ? (syncText.retryNow || 'Retry pending changes now')
                            : (syncText.dismissError || 'Dismiss Error')}
                    </button>
                )}
            </div>

            <div className="mt-3 pt-3 border-t border-[var(--border-main)] text-xs text-[var(--text-dim)]">
                {syncText.footerNote || 'Changes are saved to Supabase. Google Drive is used for backups.'}
            </div>

            {isConfirmClearModalOpen && (
                <ConfirmationModal
                    isOpen={isConfirmClearModalOpen}
                    onClose={() => setIsConfirmClearModalOpen(false)}
                    onConfirm={() => {
                        onClearSyncCache();
                        onClose();
                    }}
                    title={t.settings?.clearSyncQueue || syncText.resetBackupDialogTitle || "Reset Backup Link"}
                    message={syncText.resetBackupMessage || "This will reset the Google Drive file reference and create a new backup. Any current pending changes will be re-synced to the new file. Continue?"}
                    confirmText={t.confirm || syncText.resetBackupConfirm || "Reset & Retry"}
                    type="warning"
                    overlayId="sync-reset-confirm"
                />
            )}
        </div>
    );
};
