import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { RefreshCw, X, AlertCircle } from 'lucide-react';
import { FloatingArrow, FloatingContext } from '@floating-ui/react';
import { SyncStatus } from '../types';

interface SyncStatusTooltipProps {
    syncStatus: SyncStatus;
    onForceSync: () => void;
    onClearSyncCache: () => void;
    onResetError: () => void;
    onClose: () => void;
    refs: {
        setFloating: (node: HTMLElement | null) => void;
    };
    setArrowElement: (node: SVGSVGElement | null) => void;
    floatingStyles: React.CSSProperties;
    getFloatingProps: (userProps?: React.HTMLProps<HTMLElement>) => Record<string, unknown>;
    context: FloatingContext<any>;
}

export const SyncStatusTooltip: React.FC<SyncStatusTooltipProps> = ({
    refs,
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
    const floating = refs.setFloating;
    const formatTime = (time: Date | null) => {
        if (!time) return 'Never';
        return formatDistanceToNow(time, { addSuffix: true });
    };

    const getStatusText = () => {
        switch (syncStatus.state) {
            case 'synced':
                return 'All changes saved';
            case 'saving':
                return 'Syncing...';
            case 'error':
                return 'Sync failed';
            case 'offline':
                return 'Offline';
        }
    };

    const getStatusDot = () => {
        switch (syncStatus.state) {
            case 'synced':
                return 'bg-green-500';
            case 'saving':
                return 'bg-yellow-500 animate-pulse';
            case 'error':
                return 'bg-red-500';
            case 'offline':
                return 'bg-gray-500';
        }
    };

    const getSubabaseStatusClass = () => {
        switch (syncStatus.supabaseStatus) {
            case 'idle':
                return 'text-green-600 dark:text-green-400';
            case 'syncing':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'error':
                return 'text-red-600 dark:text-red-400';
        }
    };

    const getDriveStatusClass = () => {
        switch (syncStatus.driveStatus) {
            case 'idle':
                return 'text-green-600 dark:text-green-400';
            case 'uploading':
                return 'text-yellow-600 dark:text-yellow-400';
            case 'error':
                return 'text-red-600 dark:text-red-400';
        }
    };

    return (
        <div
            ref={floating}
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
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getStatusDot()}`} />
                    <span className="font-semibold text-[var(--text-main)]">{getStatusText()}</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-[var(--theme-hover)] rounded transition-colors"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Last Sync Time Summary */}
            <div className="text-[11px] text-[var(--text-dim)] mb-3 flex items-center gap-2">
                <RefreshCw className="w-3 h-3" />
                <span><strong>Overall:</strong> {formatTime(syncStatus.lastSyncTime)}</span>
            </div>

            {/* Detailed Status */}
            <div className="space-y-3 text-xs mb-4 bg-[var(--theme-surface)] rounded-xl p-3 border border-[var(--border-main)]">
                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-[var(--text-dim)]">Cloud Sync (Supabase)</span>
                        <span className={`font-bold ${getSubabaseStatusClass()}`}>
                            {syncStatus.supabaseStatus === 'idle' ? '✓ Online' :
                                syncStatus.supabaseStatus === 'syncing' ? '⟳ Syncing' :
                                    '✗ Error'}
                        </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-dim)] opacity-70">
                        Last: {formatTime(syncStatus.lastSyncSupabase)}
                    </div>
                </div>

                <div className="h-px bg-[var(--border-main)]/50 mx-1"></div>

                <div className="space-y-1">
                    <div className="flex justify-between items-center">
                        <span className="text-[var(--text-dim)]">Backup (Google Drive)</span>
                        <span className={`font-bold ${getDriveStatusClass()}`}>
                            {syncStatus.driveStatus === 'idle' ? '✓ Backed up' :
                                syncStatus.driveStatus === 'uploading' ? '⟳ Uploading' :
                                    '✗ Error'}
                        </span>
                    </div>
                    <div className="text-[10px] text-[var(--text-dim)] opacity-70">
                        Last: {formatTime(syncStatus.lastSyncDrive)}
                    </div>
                </div>
            </div>

            {/* Error Message */}
            {syncStatus.errorMessage && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded p-2 mb-3">
                    ⚠️ {syncStatus.errorMessage}
                </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-2">
                <button
                    onClick={() => {
                        onForceSync();
                        onClose();
                    }}
                    className="w-full py-2 px-3 bg-[var(--primary-600)] text-white rounded-lg text-sm font-medium hover:bg-[var(--primary-500)] transition-colors flex items-center justify-center gap-2"
                >
                    <RefreshCw className="w-4 h-4" />
                    Force Sync to Drive
                </button>

                <button
                    onClick={() => {
                        if (confirm('This will reset the Google Drive file reference and create a new backup. Continue?')) {
                            onClearSyncCache();
                            onClose();
                        }
                    }}
                    className="w-full py-2 px-3 bg-amber-50 dark:bg-amber-900/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30 rounded-lg text-xs font-medium hover:bg-amber-100 dark:hover:bg-amber-900/20 transition-all flex items-center justify-center gap-2"
                    title="Purge corrupted sync state and force new file creation"
                >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Clear Sync Cache & Retry
                </button>

                {syncStatus.state === 'error' && (
                    <button
                        onClick={() => {
                            onResetError();
                            onClose();
                        }}
                        className="w-full py-2 px-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        Dismiss Error
                    </button>
                )}
            </div>

            {/* Info */}
            <div className="mt-3 pt-3 border-t border-[var(--border-main)] text-xs text-[var(--text-dim)]">
                💡 Changes are auto-saved to Supabase and backed up to Google Drive
            </div>
        </div>
    );
};
