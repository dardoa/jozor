import { lazy, memo, Suspense, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Cloud, X } from 'lucide-react';
import { format } from 'date-fns';
import { DriveFileManagerModalProps } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { OverlayPrimitive } from '../context/OverlayContext';
import { showToast } from '../utils/showToast';

const DriveFileSaveSection = lazy(() =>
  import('./driveFileManager/DriveFileSaveSection').then((module) => ({
    default: module.DriveFileSaveSection,
  }))
);

const DriveFileListSection = lazy(() =>
  import('./driveFileManager/DriveFileListSection').then((module) => ({
    default: module.DriveFileListSection,
  }))
);

export const DriveFileManagerModal = memo<DriveFileManagerModalProps>(
  ({
    isOpen,
    onClose,
    files,
    currentActiveFileId,
    onLoadFile,
    onSaveAsNewFile,
    onOverwriteExistingFile,
    onDeleteFile,
    refreshDriveFiles,
    isSaving,
    isDeleting,
    isListing,
    onImportLocalFile,
  }) => {
    const { t, dateLocale } = useTranslation();
    const [newFileName, setNewFileName] = useState('');
    const [confirmOverwriteId, setConfirmOverwriteId] = useState<string | null>(null);
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (!isOpen) return;

      if (newFileName !== '') setTimeout(() => setNewFileName(''), 0);
      if (confirmOverwriteId !== null) setTimeout(() => setConfirmOverwriteId(null), 0);
      if (confirmDeleteId !== null) setTimeout(() => setConfirmDeleteId(null), 0);
      refreshDriveFiles();
    }, [isOpen, refreshDriveFiles, newFileName, confirmOverwriteId, confirmDeleteId]);

    const handleSaveAsNew = async () => {
      if (!newFileName.trim()) {
        showToast.error('googleDriveFileNameRequired');
        return;
      }

      await onSaveAsNewFile(newFileName.trim());
      setNewFileName('');
      onClose();
    };

    const handleImportClick = () => {
      fileInputRef.current?.click();
    };

    const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text) as unknown;

        await onImportLocalFile(data);

        showToast.success('messages.success.importSuccess');
        onClose();
      } catch (error) {
        console.error('Import error:', error);
        showToast.error('messages.success.importError');
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    const handleOverwrite = async (fileId: string) => {
      await onOverwriteExistingFile(fileId);
      setConfirmOverwriteId(null);
      onClose();
    };

    const handleDelete = async (fileId: string) => {
      await onDeleteFile(fileId);
      setConfirmDeleteId(null);
    };

    const handleLoad = async (fileId: string) => {
      await onLoadFile(fileId);
      onClose();
    };

    const formatDate = (isoString: string) => {
      try {
        return format(new Date(isoString), t.dateFnsInfo.format, { locale: dateLocale });
      } catch {
        return isoString;
      }
    };

    return (
      <OverlayPrimitive
        isOpen={isOpen}
        onClose={onClose}
        id='drive-file-manager-modal'
        backdropClassName='ds-overlay-backdrop fixed inset-0 z-[var(--z-index-modal)] flex items-end justify-center p-0 sm:items-center sm:p-4'
      >
        <div
          className='ds-overlay-card relative z-[calc(var(--z-index-modal)+1)] flex max-h-[92dvh] w-full sm:max-w-2xl flex-col overflow-hidden animate-scale-in'
          onClick={(event) => event.stopPropagation()}
        >
          <div className='ds-modal-header'>
            <div className='flex items-center gap-2'>
              <div className='rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-[var(--color-info-500)]'>
                <Cloud className='w-5 h-5' />
              </div>
              <h3 className='ds-heading'>{t.manageDriveFiles}</h3>
            </div>
            <button
              onClick={onClose}
              aria-label={t.close}
              className='inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          <div className='flex-1 space-y-8 overflow-y-auto bg-[var(--surface-app)]/45 p-4 sm:p-6'>
            <Suspense fallback={null}>
              <DriveFileSaveSection
                t={t}
                newFileName={newFileName}
                isSaving={isSaving}
                fileInputRef={fileInputRef}
                onFileNameChange={setNewFileName}
                onSaveAsNew={handleSaveAsNew}
                onImportClick={handleImportClick}
                onFileImport={handleFileImport}
              />
            </Suspense>

            <Suspense fallback={null}>
              <DriveFileListSection
                t={t}
                files={files}
                currentActiveFileId={currentActiveFileId}
                confirmOverwriteId={confirmOverwriteId}
                confirmDeleteId={confirmDeleteId}
                isSaving={isSaving}
                isDeleting={isDeleting}
                isListing={isListing}
                formatDate={formatDate}
                onConfirmOverwriteChange={setConfirmOverwriteId}
                onConfirmDeleteChange={setConfirmDeleteId}
                onOverwrite={handleOverwrite}
                onDelete={handleDelete}
                onLoad={handleLoad}
              />
            </Suspense>
          </div>

          <div className='p-4 border-t border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-900/50 flex justify-end'>
            <button
              onClick={onClose}
              className='px-4 py-2 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-200 rounded-lg font-bold text-sm shadow-sm transition-all active:scale-[0.98]'
            >
              {t.cancel}
            </button>
          </div>
        </div>
      </OverlayPrimitive>
    );
  }
);
