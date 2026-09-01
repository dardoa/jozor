import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Cloud, HardDrive, RefreshCw, Save, Trash2 } from 'lucide-react';

import type { DriveFile } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { showToast } from '../../../utils/showToast';

type PendingCloudFileAction = {
  action: 'overwrite' | 'restore' | 'delete';
  fileId: string;
} | null;

interface CloudBackupSectionProps {
  active: boolean;
  canManageCloud: boolean;
  files: DriveFile[];
  t: TranslationSchema;
  language: 'ar' | 'en';
  onBackupNow: () => Promise<void> | void;
  onOpenActivityLog: () => void;
  onRefreshDriveFiles: () => Promise<void> | void;
  onOpenDriveFile: (fileId: string) => Promise<void> | void;
  onSaveAsNewFile: (fileName: string) => Promise<void> | void;
  onOverwriteDriveFile: (fileId: string) => Promise<void> | void;
  onDeleteDriveFile: (fileId: string) => Promise<void> | void;
  hasSessionError: boolean;
  isAuthorized: boolean;
  onGoogleLogin: () => void;
  currentActiveDriveFileId: string | null;
  isBackingUp: boolean;
  isRefreshing: boolean;
  isSaving: boolean;
  isDeleting: boolean;
}

export const CloudBackupSection: React.FC<CloudBackupSectionProps> = ({
  active,
  canManageCloud,
  files,
  t,
  language,
  onBackupNow,
  onOpenActivityLog,
  onRefreshDriveFiles,
  onOpenDriveFile,
  onSaveAsNewFile,
  onOverwriteDriveFile,
  onDeleteDriveFile,
  hasSessionError,
  isAuthorized,
  onGoogleLogin,
  currentActiveDriveFileId,
  isBackingUp,
  isRefreshing,
  isSaving,
  isDeleting,
}) => {
  const [newFileName, setNewFileName] = useState('');
  const [pendingCloudFileAction, setPendingCloudFileAction] = useState<PendingCloudFileAction>(null);
  const [isCloudFileActionRunning, setIsCloudFileActionRunning] = useState(false);

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

  const handleConfirmCloudFileAction = useCallback(async () => {
    if (!pendingCloudFileAction || isCloudFileActionRunning) return;

    setIsCloudFileActionRunning(true);
    try {
      if (pendingCloudFileAction.action === 'overwrite') {
        await onOverwriteDriveFile(pendingCloudFileAction.fileId);
      } else if (pendingCloudFileAction.action === 'restore') {
        await onOpenDriveFile(pendingCloudFileAction.fileId);
      } else {
        await onDeleteDriveFile(pendingCloudFileAction.fileId);
      }
      setPendingCloudFileAction(null);
    } catch (error) {
      showToast.error(
        error instanceof Error
          ? error.message
          : language === 'ar'
            ? 'تعذر إكمال عملية النسخة السحابية.'
            : 'Unable to complete the cloud backup action.'
      );
    } finally {
      setIsCloudFileActionRunning(false);
    }
  }, [
    isCloudFileActionRunning,
    language,
    onDeleteDriveFile,
    onOpenDriveFile,
    onOverwriteDriveFile,
    pendingCloudFileAction,
  ]);

  useEffect(() => {
    if (!pendingCloudFileAction) return;

    const fileStillExists = files.some((file) => file.id === pendingCloudFileAction.fileId);
    if (!active || !canManageCloud || !isAuthorized || !fileStillExists) {
      setPendingCloudFileAction(null);
    }
  }, [active, canManageCloud, files, isAuthorized, pendingCloudFileAction]);

  const handleGoogleLogin = useCallback(async () => {
    try {
      await onGoogleLogin();
    } catch (error) {
      showToast.error(error instanceof Error ? error.message : 'Failed to connect Google Drive.');
    }
  }, [onGoogleLogin]);

  if (!active) return null;

  if (!canManageCloud) {
    return (
      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-[var(--surface-subtle)] p-2 text-[var(--text-muted)]">
            <Cloud className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">
              {t.vaultCloudBackupTitle}
            </h3>
            <p className="mt-1 text-[12px] leading-5 text-[var(--text-muted)]">{t.vaultCloudAccessLimited}</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
        {hasSessionError && (
          <div className="mb-4 flex animate-in flex-col gap-4 rounded-xl border border-[var(--danger-500)]/20 bg-[var(--danger-500)]/10 p-4 fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-[var(--danger-500)]/10 p-2 text-[var(--danger-600)]">
                <Cloud className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-main)]">
                  {t.vaultSessionExpired || 'Your session has expired.'}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                  {language === 'ar'
                    ? 'أعد ربط حساب Google لإدارة النسخ الاحتياطية وملفات السحابة.'
                    : 'Reconnect your Google account to manage backups and cloud files.'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleGoogleLogin()}
              className="w-full rounded-lg bg-[var(--danger-600)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:brightness-95 active:scale-[0.98]"
            >
              {t.vaultCloudReconnect}
            </button>
          </div>
        )}

        {!isAuthorized && !hasSessionError && (
          <div className="mb-4 flex animate-in flex-col gap-4 rounded-xl border border-[var(--color-info-500)]/20 bg-[var(--color-info-500)]/10 p-4 fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-[var(--color-info-500)]/10 p-2 text-[var(--color-info-500)]">
                <Cloud className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-[var(--text-main)]">{t.vaultCloudDisconnected}</p>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-muted)]">
                  {t.vaultCloudDisconnectedHint}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleGoogleLogin()}
              className="w-full rounded-lg bg-[var(--color-info-500)] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:brightness-95 active:scale-[0.98]"
            >
              {t.vaultCloudConnect}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <h3 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">
            {t.vaultCloudBackupTitle}
          </h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {isAuthorized && (
              <button
                type="button"
                onClick={() => void onBackupNow()}
                disabled={isBackingUp}
                className="min-h-11 rounded-xl bg-[var(--primary-600)] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  {isBackingUp ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Cloud className="h-4 w-4" />
                  )}
                  {t.vaultBackupNow}
                </span>
              </button>
            )}
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

      {isAuthorized && (
        <section className="rounded-[14px] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-none">
          <div className="mb-4 flex flex-col gap-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-[16px] font-bold tracking-tight text-[var(--text-main)]">{t.vaultCloudFiles}</h4>
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {t.vaultCloudFilesHint || 'Manage Google Drive backups from this tab.'}
                </p>
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
                aria-label={t.googleDriveFileName}
                disabled={isSaving}
                className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 text-sm text-[var(--text-main)] outline-none transition-all focus:border-[var(--primary-600)] disabled:cursor-not-allowed disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => void handleSaveAsNew()}
                disabled={isSaving || !newFileName.trim()}
                className="min-h-11 rounded-xl bg-[var(--primary-600)] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
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
                const pendingAction =
                  pendingCloudFileAction?.fileId === file.id ? pendingCloudFileAction.action : null;
                const pendingActionLabel =
                  pendingAction === 'overwrite'
                    ? language === 'ar'
                      ? `سيتم استبدال النسخة «${file.name}» ببيانات الشجرة الحالية.`
                      : `The backup "${file.name}" will be replaced with the current tree.`
                    : pendingAction === 'restore'
                      ? language === 'ar'
                        ? `ستحل النسخة «${file.name}» محل بيانات الشجرة المفتوحة حاليًا.`
                        : `The backup "${file.name}" will replace the tree currently open.`
                      : pendingAction === 'delete'
                        ? language === 'ar'
                          ? `سيتم حذف النسخة «${file.name}» نهائيًا من جوجل درايف.`
                          : `The backup "${file.name}" will be permanently deleted from Google Drive.`
                        : null;

                return (
                  <div
                    key={file.id}
                    className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
                      isActive
                        ? 'border-[var(--primary-600)]/40 bg-[var(--primary-600)]/5'
                        : 'border-[var(--border-soft)] bg-[var(--surface-subtle)]'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
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

                    {pendingAction && pendingActionLabel ? (
                      <div
                        role="group"
                        aria-label={pendingActionLabel}
                        aria-busy={isCloudFileActionRunning}
                        className="flex w-full flex-col gap-3 rounded-xl border border-[var(--warning-500)]/35 bg-[var(--warning-500)]/8 p-3 sm:max-w-md"
                      >
                        <p className="text-xs font-semibold leading-5 text-[var(--text-secondary)]">
                          {pendingActionLabel}
                        </p>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setPendingCloudFileAction(null)}
                            disabled={isCloudFileActionRunning || isSaving || isDeleting}
                            className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {t.cancel}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleConfirmCloudFileAction()}
                            disabled={
                              isCloudFileActionRunning || (pendingAction === 'delete' ? isDeleting : isSaving)
                            }
                            className={`min-h-11 rounded-xl px-3 py-2 text-xs font-semibold text-white transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50 ${
                              pendingAction === 'delete' ? 'bg-[var(--danger-500)]' : 'bg-[var(--warning-600)]'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {isCloudFileActionRunning ? (
                                <RefreshCw className="h-4 w-4 animate-spin" />
                              ) : pendingAction === 'delete' ? (
                                <Trash2 className="h-4 w-4" />
                              ) : (
                                <AlertTriangle className="h-4 w-4" />
                              )}
                              {pendingAction === 'overwrite'
                                ? t.confirmOverwrite
                                : pendingAction === 'delete'
                                  ? t.confirmDelete
                                  : language === 'ar'
                                    ? 'تأكيد الاستعادة'
                                    : 'Confirm restore'}
                            </span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPendingCloudFileAction({ action: 'overwrite', fileId: file.id })}
                          disabled={isSaving || isActive}
                          className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t.overwrite}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingCloudFileAction({ action: 'restore', fileId: file.id })}
                          disabled={isSaving || isActive}
                          className="min-h-11 rounded-xl bg-[var(--primary-600)] px-3 py-2 text-xs font-semibold text-white transition-all duration-200 ease-in-out hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t.vaultOpenCloudFile}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingCloudFileAction({ action: 'delete', fileId: file.id })}
                          disabled={isDeleting || isActive}
                          className="min-h-11 rounded-xl border border-[var(--border-soft)] bg-[var(--surface-panel)] px-3 py-2 text-xs font-semibold text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {t.delete}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}
    </>
  );
};
