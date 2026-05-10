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

import type { DriveFile, ExportType } from '../../types';
import type { TranslationSchema } from '../../utils/translationLoader';
import { logInfo } from '../../utils/errorLogger';

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
      {/* Vault tools stay description-free by design: icon, title, and action only. */}
      <section className="rounded-[14px] bg-[#f9f7f3] p-4 shadow-none">
        {hasSessionError && (
          <div className="mb-4 flex flex-col gap-4 rounded-xl bg-red-50 p-4 border border-red-100 animate-in fade-in slide-in-from-top-2 duration-300">
            {/* ... red banner ... */}
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-100 p-2 text-red-600">
                <Cloud className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-red-900">
                  {t.vaultSessionExpired || 'Your session has expired.'}
                </p>
                <p className="mt-1 text-xs text-red-700/80 leading-relaxed">
                  Please connect your Google account to manage backups and cloud files.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoogleLogin}
              className="w-full rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-all shadow-sm active:scale-[0.98]"
            >
              Reconnect Google Account
            </button>
          </div>
        )}

        {!isAuthorized && !hasSessionError && canManageCloud && (
          <div className="mb-4 flex flex-col gap-4 rounded-xl bg-blue-50 p-4 border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-blue-100 p-2 text-blue-600">
                <Cloud className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-blue-900">
                  Google Drive Disconnected
                </p>
                <p className="mt-1 text-xs text-blue-700/80 leading-relaxed">
                  Connect your account to enable automatic cloud backups and cross-device synchronization.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onGoogleLogin}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition-all shadow-sm active:scale-[0.98]"
            >
              Connect Google Drive
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-[16px] font-bold tracking-tight text-slate-800">{t.vaultCloudBackupTitle}</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              type="button"
              onClick={() => void onBackupNow()}
              disabled={!canManageCloud}
              className="min-h-11 rounded-xl bg-[#a67c37] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                {t.vaultBackupNow}
              </span>
            </button>
            <button
              type="button"
              onClick={onManageDriveFiles}
              disabled={!canManageCloud}
              className="min-h-11 rounded-xl border border-black/[0.04] bg-white/40 px-4 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 ease-in-out hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t.vaultManageCloudFiles}
            </button>
            <button
              type="button"
              onClick={onOpenActivityLog}
              className="min-h-11 rounded-xl border border-black/[0.04] bg-white/40 px-4 py-2 text-sm font-semibold text-slate-600 transition-all duration-200 ease-in-out hover:bg-white"
            >
              {t.vaultActivityLog}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[14px] bg-[#f9f7f3] p-4 shadow-none">
        <h4 className="text-[16px] font-bold tracking-tight text-slate-800">{t.vaultExportDataTitle}</h4>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {EXPORT_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => void handleExport(action.id)}
                className="flex min-h-[88px] flex-col items-center justify-center gap-3 rounded-2xl bg-white/55 px-4 py-3 text-center transition-all duration-200 ease-in-out hover:bg-white"
              >
                <div className="rounded-xl bg-white/75 p-2 text-[#a67c37]">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-800">{t[action.labelKey] || action.id}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[14px] bg-[#f9f7f3] p-4 shadow-none">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h4 className="text-[16px] font-bold tracking-tight text-slate-800">{t.vaultCloudFiles}</h4>
          <button
            type="button"
            onClick={() => void onRefreshDriveFiles()}
            className="min-h-11 min-w-11 rounded-xl border border-black/[0.04] bg-white/40 p-2 text-slate-600 transition-all duration-200 ease-in-out hover:bg-white"
            aria-label={t.vaultRefreshCloudFiles}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {files.length === 0 ? (
          <div className="rounded-2xl bg-white/45 p-5 text-[12px] text-slate-500">
            {t.vaultCloudEmpty}
          </div>
        ) : (
          <div className="space-y-6">
            {files.map((file) => (
              <div key={file.id} className="flex flex-col gap-3 rounded-2xl bg-white/55 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex items-center gap-3">
                  <div className="rounded-xl bg-white/75 p-2 text-slate-500">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{file.name}</p>
                    <p className="truncate text-[12px] text-slate-500">{file.modifiedTime}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void onOpenDriveFile(file.id)}
                  className="min-h-11 rounded-xl bg-[#a67c37] px-3 py-2 text-xs font-semibold text-white transition-all duration-200 ease-in-out hover:brightness-105"
                >
                  {t.vaultOpenCloudFile}
                </button>
              </div>
            ))}
          </div>
        )}

        {!canManageCloud && (
          <div className="mt-4 rounded-2xl bg-white/45 p-4 text-[12px] text-slate-500">{t.vaultCloudAccessLimited}</div>
        )}
      </section>
    </div>
  );
};
