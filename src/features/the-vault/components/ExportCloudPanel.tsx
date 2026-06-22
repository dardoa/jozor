import React, { useCallback, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Calendar,
  Cloud,
  FileText,
  HardDrive,
  Image as ImageIcon,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  BookOpen,
  Download,
  Sparkles,
} from 'lucide-react';

import type { DriveFile, ExportType } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { showToast } from '../../../utils/showToast';
import { useAppStore } from '../../../store/useAppStore';

interface ExportCloudPanelProps {
  canManageCloud: boolean;
  files: DriveFile[];
  t: TranslationSchema;
  onCloseVault: () => void;
  onBackupNow: () => Promise<void> | void;
  onOpenActivityLog: () => void;
  onRefreshDriveFiles: () => Promise<void> | void;
  onOpenDriveFile: (fileId: string) => Promise<void> | void;
  onSaveAsNewFile: (fileName: string) => Promise<void> | void;
  onOverwriteDriveFile: (fileId: string) => Promise<void> | void;
  onDeleteDriveFile: (fileId: string) => Promise<void> | void;
  onRunExport: (type: ExportType) => Promise<void>;
  onRunPublishingExport?: (options: { templateId: string; format: 'png' | 'pdf' }) => Promise<void>;
  hasSessionError: boolean;
  isAuthorized: boolean;
  onGoogleLogin: () => void;
  currentActiveDriveFileId: string | null;
  isBackingUp?: boolean;
  isRefreshing?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
}

type ExportLabelKey =
  | 'vaultExportArchive'
  | 'vaultExportJson'
  | 'vaultExportGedcom'
  | 'vaultExportCalendar'
  | 'vaultExportPng'
  | 'vaultExportPdf'
  | 'vaultExportPrint';

const EXPORT_ACTIONS: Array<{
  id: ExportType;
  labelKey: ExportLabelKey;
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
  onOpenActivityLog,
  onRefreshDriveFiles,
  onOpenDriveFile,
  onSaveAsNewFile,
  onOverwriteDriveFile,
  onDeleteDriveFile,
  onRunExport,
  onRunPublishingExport,
  hasSessionError,
  isAuthorized,
  onGoogleLogin,
  currentActiveDriveFileId,
  isBackingUp = false,
  isRefreshing = false,
  isSaving = false,
  isDeleting = false,
}) => {
  const [newFileName, setNewFileName] = useState('');
  const [confirmOverwriteId, setConfirmOverwriteId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const language = useAppStore((state) => state.language);

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

  const handlePublishingExport = useCallback(
    async (options: { templateId: string; format: 'png' | 'pdf' }) => {
      onCloseVault();
      await waitForDrawerDismissal();
      await onRunPublishingExport?.(options);
    },
    [onCloseVault, onRunPublishingExport]
  );

  const sortedFiles = useMemo(
    () => [...files].sort((a, b) => String(b.modifiedTime || '').localeCompare(String(a.modifiedTime || ''))),
    [files]
  );

  const handleSaveAsNew = useCallback(async () => {
    const trimmed = newFileName.trim();
    if (!trimmed) {
      showToast.error('googleDriveFileNameRequired');
      return;
    }

    await onSaveAsNewFile(trimmed);
    setNewFileName('');
  }, [newFileName, onSaveAsNewFile]);

  const handleOverwrite = useCallback(async (fileId: string) => {
    await onOverwriteDriveFile(fileId);
    setConfirmOverwriteId(null);
  }, [onOverwriteDriveFile]);

  const handleDelete = useCallback(async (fileId: string) => {
    await onDeleteDriveFile(fileId);
    setConfirmDeleteId(null);
  }, [onDeleteDriveFile]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      await onGoogleLogin();
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to connect Google Drive.');
    }
  }, [onGoogleLogin]);

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
              onClick={() => void handleGoogleLogin()}
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
              onClick={() => void handleGoogleLogin()}
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
              onClick={onOpenActivityLog}
              className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-all duration-200 ease-in-out hover:bg-[var(--surface-hover)]"
            >
              {t.vaultActivityLog}
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[20px] border border-[var(--primary-500)]/20 bg-gradient-to-br from-[var(--surface-panel)] via-[var(--surface-panel)] to-[var(--primary-500)]/5 p-5 shadow-sm relative overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute -right-16 -top-16 h-36 w-36 rounded-full bg-[var(--primary-500)]/5 blur-3xl pointer-events-none" />
        
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-[var(--primary-500)]/10 p-2.5 text-[var(--primary-600)]">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h4 className="text-[17px] font-bold tracking-tight text-[var(--text-main)]">
              {language === 'ar' ? 'نظام النشر والطباعة (جذور 1.0)' : 'Publishing & Printing Engine (Jozor 1.0)'}
            </h4>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              {language === 'ar' 
                ? 'تصدير شجرتك باستخدام محرك التخطيط التلقائي وتوزيع الصفحات الذكي.' 
                : 'Export your tree using the automated publishing layouts and page distribution.'}
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {/* Template 1: Classic Family Book */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 transition-all hover:border-[var(--primary-500)]/30 hover:shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--primary-600)]">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="text-sm font-bold text-[var(--text-main)]">
                    {language === 'ar' ? 'كتاب العائلة الكلاسيكي المصغر' : 'Classic Family Book Manuscript'}
                  </h5>
                  <span className="rounded-full bg-[var(--primary-500)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--primary-600)]">
                    A4 PDF
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {language === 'ar' 
                    ? 'كتاب عائلي أنيق من 4 صفحات: غلاف ملكي، مقدمة توثيقية، شجرة الأسلاف (3 أجيال)، والخط الزمني للأحداث.'
                    : 'An elegant 4-page family book: royal cover, documentation intro, ancestor tree (3 generations), and events timeline.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end border-t border-[var(--border-soft)] pt-3">
              <button
                type="button"
                onClick={() => void handlePublishingExport({ templateId: 'classic-book-manuscript', format: 'pdf' })}
                className="flex items-center gap-2 rounded-xl bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white px-4 py-2 text-xs font-bold transition-all hover:brightness-105 active:scale-[0.98] shadow-sm shadow-[var(--primary-600)]/10"
              >
                <Download className="h-3.5 w-3.5" />
                {language === 'ar' ? 'تحميل ملف PDF المتجهة' : 'Download Vector PDF'}
              </button>
            </div>
          </div>

          {/* Template 2: Classic Ancestor Poster */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 transition-all hover:border-[var(--primary-500)]/30 hover:shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--primary-600)]">
                <ImageIcon className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="text-sm font-bold text-[var(--text-main)]">
                    {language === 'ar' ? 'شجرة الأسلاف الكلاسيكية الدافئة' : 'Classic Ancestor Poster'}
                  </h5>
                  <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600">
                    {language === 'ar' ? 'ثيم دافئ' : 'Warm Theme'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {language === 'ar' 
                    ? 'تصميم بوستر تقليدي مريح للعين، يعتمد على نبرات لونية هادئة (4 أجيال)، ملائم للطباعة الورقية والتأطير.'
                    : 'Traditional cozy poster design featuring warm vintage tones (4 generations), perfect for print and framing.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-soft)] pt-3">
              <button
                type="button"
                onClick={() => void handlePublishingExport({ templateId: 'classic-ancestor-poster', format: 'png' })}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] hover:bg-[var(--surface-hover)] text-[var(--text-main)] px-3 py-2 text-xs font-bold transition-all active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                {language === 'ar' ? 'تنزيل PNG' : 'Download PNG'}
              </button>
              <button
                type="button"
                onClick={() => void handlePublishingExport({ templateId: 'classic-ancestor-poster', format: 'pdf' })}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white px-3 py-2 text-xs font-bold transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5" />
                {language === 'ar' ? 'تنزيل PDF' : 'Download PDF'}
              </button>
            </div>
          </div>

          {/* Template 3: Modern Ancestor Poster */}
          <div className="flex flex-col gap-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 transition-all hover:border-[var(--primary-500)]/30 hover:shadow-sm">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--primary-600)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h5 className="text-sm font-bold text-[var(--text-main)]">
                    {language === 'ar' ? 'شجرة الأسلاف العصرية الداكنة' : 'Modern Ancestor Poster'}
                  </h5>
                  <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">
                    {language === 'ar' ? 'ثيم داكن' : 'Dark Theme'}
                  </span>
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-[var(--text-muted)]">
                  {language === 'ar' 
                    ? 'تصميم شجرة عصري بألوان داكنة ونظام ألوان ذكي يبرز التباين والعمق (4 أجيال) للتعليق الإلكتروني والطباعة الفاخرة.'
                    : 'Modern dark-themed poster design utilizing contrasting elements (4 generations) for screens or premium prints.'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[var(--border-soft)] pt-3">
              <button
                type="button"
                onClick={() => void handlePublishingExport({ templateId: 'modern-ancestor-poster', format: 'png' })}
                className="flex items-center gap-1.5 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] hover:bg-[var(--surface-hover)] text-[var(--text-main)] px-3 py-2 text-xs font-bold transition-all active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                {language === 'ar' ? 'تنزيل PNG' : 'Download PNG'}
              </button>
              <button
                type="button"
                onClick={() => void handlePublishingExport({ templateId: 'modern-ancestor-poster', format: 'pdf' })}
                className="flex items-center gap-1.5 rounded-xl bg-[var(--primary-600)] hover:bg-[var(--primary-700)] text-white px-3 py-2 text-xs font-bold transition-all hover:brightness-105 active:scale-[0.98]"
              >
                <Download className="h-3.5 w-3.5" />
                {language === 'ar' ? 'تنزيل PDF' : 'Download PDF'}
              </button>
            </div>
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
                  <div className="text-sm font-semibold text-[var(--text-main)]">{t[action.labelKey] || action.id}</div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
        <div className="mb-4 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultCloudFiles}</h4>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{t.vaultCloudFilesHint || 'Manage Google Drive backups from this tab.'}</p>
            </div>
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

          <div className="grid gap-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <input
              type="text"
              value={newFileName}
              onChange={(event) => setNewFileName(event.target.value)}
              placeholder={t.googleDriveFileName}
              disabled={!canManageCloud || isSaving}
              className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 text-sm text-[var(--text-main)] outline-none transition-all focus:border-[var(--primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => void handleSaveAsNew()}
              disabled={!canManageCloud || isSaving || !newFileName.trim()}
              className="min-h-11 rounded-xl bg-[var(--primary-600)] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {t.saveAsNewFile}
              </span>
            </button>
          </div>
        </div>

        {sortedFiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border-soft)] bg-[var(--surface-subtle)] p-5 text-[12px] text-[var(--text-muted)]">
            {t.vaultCloudEmpty}
          </div>
        ) : (
          <div className="space-y-6">
            {sortedFiles.map((file) => {
              const isActive = file.id === currentActiveDriveFileId;

              return (
              <div key={file.id} className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${isActive ? 'border-[var(--primary-600)]/40 bg-[var(--primary-600)]/5' : 'border-[var(--border-soft)] bg-[var(--surface-subtle)]'}`}>
                <div className="min-w-0 flex items-center gap-3">
                  <div className="rounded-xl bg-[var(--surface-panel)] p-2 text-[var(--text-muted)]">
                    <HardDrive className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-[var(--text-main)]">{file.name}</p>
                      {isActive && (
                        <span className="rounded-md bg-[var(--primary-600)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          {t.active}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[12px] text-[var(--text-muted)]">{file.modifiedTime}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {confirmOverwriteId === file.id ? (
                    <button
                      type="button"
                      onClick={() => void handleOverwrite(file.id)}
                      disabled={isSaving}
                      className="min-h-11 rounded-xl bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4" />
                        {t.confirmOverwrite}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmOverwriteId(file.id)}
                      disabled={!canManageCloud || isSaving || isActive}
                      className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t.overwrite}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void onOpenDriveFile(file.id)}
                    disabled={isActive}
                    className="min-h-11 rounded-xl bg-[var(--primary-600)] px-3 py-2 text-xs font-semibold text-white transition-all duration-200 ease-in-out hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t.vaultOpenCloudFile}
                  </button>
                  {confirmDeleteId === file.id ? (
                    <button
                      type="button"
                      onClick={() => void handleDelete(file.id)}
                      disabled={isDeleting}
                      className="min-h-11 rounded-xl bg-red-600 px-3 py-2 text-xs font-semibold text-white transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Trash2 className="h-4 w-4" />
                        {t.confirmDelete}
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(file.id)}
                      disabled={!canManageCloud || isDeleting || isActive}
                      className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t.delete}
                    </button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        )}

        {!canManageCloud && (
          <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4 text-[12px] text-[var(--text-muted)]">{t.vaultCloudAccessLimited}</div>
        )}
      </section>
    </div>
  );
};
