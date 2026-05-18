import React, { useCallback } from 'react';
import {
  Archive,
  Calendar,
  Cloud,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Printer,
  RefreshCw,
} from 'lucide-react';

import type { DriveFile, ExportType } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { logInfo } from '../../../utils/errorLogger';

interface ExportCloudPanelProps {
  canManageCloud: boolean;
  files: DriveFile[];
  t: TranslationSchema;
  onCloseVault: () => void;
  onBackupNow: () => Promise<void> | void;
  onManageDriveFiles: () => void;
  onOpenActivityLog: () => void;
  onRefreshDriveFiles: () => Promise<void> | void;
  onOpenDriveFile: (fileId: string) => Promise<void> | void;
  onRunExport: (type: ExportType) => Promise<void>;
  hasSessionError: boolean;
  isAuthorized: boolean;
  onGoogleLogin: () => void;
  isBackingUp?: boolean;
  isRefreshing?: boolean;
}

const EXPORT_ACTIONS: Array<{
  id: ExportType;
  labelKey: keyof TranslationSchema;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'jozor', labelKey: 'vaultExportArchive', icon: Archive },
  { id: 'json', labelKey: 'vaultExportJson', icon: FileText },
  { id: 'gedcom', labelKey: 'vaultExportGedcom', icon: FileText },
  { id: 'ics', labelKey: 'vaultExportCalendar', icon: Calendar },
  { id: 'png', labelKey: 'vaultExportPng', icon: ImageIcon },
  { id: 'pdf', labelKey: 'vaultExportPdf', icon: FileText },
  { id: 'print', labelKey: 'vaultExportPrint', icon: Printer },
];

const waitForDrawerDismissal = () =>
  new Promise<void>((resolve) => {
    if (typeof window === 'undefined') {
      resolve();
      return;
    }
    window.setTimeout(resolve, 140);
  });

export const ExportCloudPanel: React.FC<ExportCloudPanelProps> = ({
  canManageCloud,
  files,
  t,
  onCloseVault,
  onBackupNow,
  onManageDriveFiles,
  onOpenActivityLog,
  onRefreshDriveFiles,
  onOpenDriveFile,
  onRunExport,
  hasSessionError,
  isAuthorized,
  onGoogleLogin,
  isBackingUp = false,
  isRefreshing = false,
}) => {
  const handleExport = useCallback(
    async (type: ExportType) => {
      if (type === 'print' || type === 'pdf') {
        onCloseVault();
        await waitForDrawerDismissal();
      }
      await onRunExport(type);
    },
    [onCloseVault, onRunExport]
  );

  return (
    <div className="space-y-6">
      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
        {hasSessionError && (
          <div className="mb-4 flex flex-col gap-4 rounded-xl border border-[var(--danger-500)]/20 bg-[var(--danger-500)]/10 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-[var(--danger-500)]/10 p-2 text-[var(--danger-600)]">
                <Cloud className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-main)]">
                  {t.vaultSessionExpired || 'Your session has expired.'}
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                  Please connect your Google account to manage backups and cloud files.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoogleLogin}
              className="w-full rounded-lg bg-[var(--danger-600)] px-4 py-2 text-sm font-bold text-white transition-all shadow-sm hover:brightness-95 active:scale-[0.98]"
            >
              Reconnect Google Account
            </button>
          </div>
        )}

        {!isAuthorized && !hasSessionError && canManageCloud && (
          <div className="mb-4 flex flex-col gap-4 rounded-xl border border-[var(--color-info-500)]/20 bg-[var(--color-info-500)]/10 p-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-[var(--color-info-500)]/10 p-2 text-[var(--color-info-500)]">
                <Cloud className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-main)]">
                  Google Drive Disconnected
                </p>
                <p className="mt-1 text-xs text-[var(--text-muted)] leading-relaxed">
                  Connect your account to enable automatic cloud backups and cross-device synchronization.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoogleLogin}
              className="w-full rounded-lg bg-[var(--color-info-500)] px-4 py-2 text-sm font-bold text-white transition-all shadow-sm hover:brightness-95 active:scale-[0.98]"
            >
              Connect Google Drive
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultCloudBackupTitle}</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void onBackupNow()}
              disabled={!canManageCloud || isBackingUp}
              className="min-h-11 rounded-xl bg-[var(--primary-600)] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                {isBackingUp ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                {t.vaultBackupNow}
              </span>
            </button>
            <button
              type="button"
              onClick={onManageDriveFiles}
              disabled={!canManageCloud}
              className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.vaultManageCloudFiles}
            </button>
            <button
              type="button"
              onClick={onOpenActivityLog}
              className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)]"
            >
              {t.vaultActivityLog}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
        <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultExportDataTitle}</h4>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {EXPORT_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => void handleExport(action.id)}
                className="flex min-h-[88px] flex-col items-center justify-center gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-center transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)]"
              >
                <div className="rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--primary-600)]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[var(--text-main)]">{(t as any)[action.labelKey] || action.id}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultCloudFiles}</h4>
          <button
            type="button"
            onClick={() => void onRefreshDriveFiles()}
            disabled={isRefreshing}
            className="min-h-11 min-w-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-[var(--text-secondary)] transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t.vaultRefreshCloudFiles}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {files.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-subtle)] p-5 text-[12px] text-[var(--text-muted)]">
            {t.vaultCloudEmpty}
          </div>
        ) : (
          <div className="space-y-6">
            {files.map((file) => (
              <div key={file.id} className="flex flex-col gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--text-muted)]">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--text-main)]">{file.name}</p>
                    <p className="truncate text-[12px] text-[var(--text-muted)]">{file.modifiedTime}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void onOpenDriveFile(file.id)}
                  className="min-h-11 rounded-xl bg-[var(--primary-600)] px-3 py-2 text-xs font-semibold text-white transition-all duration-200 ease-in-out hover:brightness-105"
                >
                  {t.vaultOpenCloudFile}
                </button>
              </div>
            ))}
          </div>
        )}

        {!canManageCloud && (
          <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 text-[12px] text-[var(--text-muted)]">{t.vaultCloudAccessLimited}</div>
        )}
      </section>
    </div>
  );
};
