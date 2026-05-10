import React, { memo } from 'react';
import { X, Cloud, HardDriveUpload, HardDriveDownload } from 'lucide-react';
import { GoogleSyncChoiceModalProps } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { OverlayPrimitive } from '../context/OverlayContext';
import { Button } from './ui/Button';

export const GoogleSyncChoiceModal: React.FC<GoogleSyncChoiceModalProps> = memo(
  ({
    isOpen,
    onClose,
    onLoadCloud,
    onSaveNewCloud,
    onOpenDriveManager,
    driveFileId,
  }) => {
    const { t } = useTranslation();

    const handleLoadClick = () => {
      if (onOpenDriveManager) {
        // If file manager handler is provided, open it to let user choose
        onOpenDriveManager();
        onClose(); // Close this modal
      } else if (driveFileId) {
        // Fallback: Load the specific file directly
        onLoadCloud(driveFileId);
      }
    };

    return (
      <OverlayPrimitive
        isOpen={isOpen}
        onClose={onClose}
        id='google-sync-choice-modal'
      >
        <div
          className='ds-overlay-card relative flex max-h-[92dvh] w-full sm:max-w-md animate-in zoom-in-95 flex-col overflow-hidden duration-200'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='ds-modal-header flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <div className='rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-[var(--color-info-500)]'>
                <Cloud className='w-5 h-5' />
              </div>
              <h3 className='text-lg font-bold text-[var(--text-main)]'>
                {t.googleDriveSyncTitle}
              </h3>
            </div>
            <button
              onClick={onClose}
              className='inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          <div className='ds-modal-body space-y-4'>
            <button
              onClick={handleLoadClick}
              className='group relative flex w-full items-center justify-center gap-4 rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] px-4 py-4 text-start shadow-[var(--shadow-sm)] transition-all hover:border-[var(--color-info-500)]/25 hover:bg-[var(--surface-hover)]'
            >
              <div className='flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--color-info-500)] shadow-[var(--shadow-sm)] transition-transform group-hover:scale-110'>
                <HardDriveDownload className='w-5 h-5' />
              </div>
              <div>
                <div className='font-bold text-[var(--text-main)]'>
                  {t.googleDriveLoadExisting}
                </div>
              </div>
            </button>

            <button
              onClick={onSaveNewCloud}
              className='group relative flex w-full items-center justify-center gap-4 rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] px-4 py-4 text-start shadow-[var(--shadow-sm)] transition-all hover:border-[var(--primary-600)]/25 hover:bg-[var(--surface-hover)]'
            >
              <div className='flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel)] text-[var(--primary-600)] shadow-[var(--shadow-sm)] transition-transform group-hover:scale-110'>
                <HardDriveUpload className='w-5 h-5' />
              </div>
              <div>
                <div className='font-bold text-[var(--text-main)]'>
                  {t.googleDriveSaveNewFile}
                </div>
              </div>
            </button>

            <Button onClick={onClose} variant='secondary' className='mt-4 w-full'>
              {t.cancel}
            </Button>
          </div>
        </div>
      </OverlayPrimitive>
    );
  }
);
