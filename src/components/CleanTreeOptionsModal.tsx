import React, { memo } from 'react';
import { X, Plus, Upload, AlertTriangle, ArrowLeft } from 'lucide-react';
import { CleanTreeOptionsModalProps } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { OverlayPrimitive } from '../context/OverlayContext';

export const CleanTreeOptionsModal: React.FC<CleanTreeOptionsModalProps> = memo(
  ({ isOpen, onClose, onStartNewTree, onTriggerImportFile }) => {
    const { t, language } = useTranslation();
    const [confirmMode, setConfirmMode] = React.useState<'none' | 'startNew' | 'import'>('none');
    const [confirmInput, setConfirmInput] = React.useState('');

    const targetWord = language === 'ar' ? 'حذف' : 'RESET';

    const resetAndClose = () => {
      setConfirmMode('none');
      setConfirmInput('');
      onClose();
    };

    const handleStartNew = () => {
      onStartNewTree();
      resetAndClose();
    };

    const handleImport = () => {
      onTriggerImportFile();
      resetAndClose();
    };

    const isConfirmed = confirmInput === targetWord;

    return (
      <OverlayPrimitive
        isOpen={isOpen}
        onClose={resetAndClose}
        id='clean-tree-options-modal'
      >
        <div
          role='dialog'
          aria-modal='true'
          aria-labelledby='clean-tree-options-title'
          className='ds-overlay-card flex max-h-[92dvh] w-full flex-col overflow-hidden animate-in zoom-in-95 duration-200 sm:max-w-md'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='ds-modal-header'>
            <h3 id='clean-tree-options-title' className='ds-heading'>{t.cleanTreeOptionsTitle}</h3>
            <button
              type='button'
              onClick={resetAndClose}
              aria-label={t.close}
              className='inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]'
            >
              <X className='h-5 w-5' />
            </button>
          </div>

          <div className='space-y-4 overflow-y-auto bg-[var(--surface-app)]/45 p-4 sm:p-5'>
            {confirmMode === 'none' ? (
              <>
                <div className='flex items-start gap-3 rounded-lg border border-[var(--warning-500)]/30 bg-[var(--warning-500)]/8 p-3 text-xs font-semibold leading-5 text-[var(--text-secondary)]'>
                  <AlertTriangle className='mt-0.5 h-4 w-4 shrink-0 text-[var(--warning-600)]' />
                  <span>{t.dataLossWarning}</span>
                </div>

                <div className='divide-y divide-[var(--border-soft)] overflow-hidden rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)]'>
                  <button
                    type='button'
                    onClick={() => setConfirmMode('startNew')}
                    className='flex min-h-16 w-full items-center gap-3 p-4 text-start transition-colors hover:bg-[var(--surface-hover)]'
                  >
                    <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-600)]/10 text-[var(--primary-600)]'>
                      <Plus className='h-5 w-5' />
                    </div>
                    <span className='min-w-0 flex-1 text-sm font-bold text-[var(--text-main)]'>{t.startNewTreeOption}</span>
                    <ArrowLeft className='h-4 w-4 shrink-0 text-[var(--text-muted)] rtl:rotate-180' />
                  </button>

                  <button
                    type='button'
                    onClick={() => setConfirmMode('import')}
                    className='flex min-h-16 w-full items-center gap-3 p-4 text-start transition-colors hover:bg-[var(--surface-hover)]'
                  >
                    <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--surface-subtle)] text-[var(--text-secondary)]'>
                      <Upload className='h-5 w-5' />
                    </div>
                    <span className='min-w-0 flex-1 text-sm font-bold text-[var(--text-main)]'>{t.importFileOption}</span>
                    <ArrowLeft className='h-4 w-4 shrink-0 text-[var(--text-muted)] rtl:rotate-180' />
                  </button>
                </div>
              </>
            ) : (
              <div className='space-y-4 animate-in slide-in-from-bottom-2 duration-200'>
                <div className='rounded-lg border border-[var(--danger-500)]/25 bg-[var(--danger-500)]/8 p-4'>
                  <div className='mb-2 flex items-center gap-2 text-[var(--danger-600)]'>
                    <AlertTriangle className='h-4 w-4' />
                    <span className='text-sm font-bold'>{t.confirmDelete}</span>
                  </div>
                  <p className='text-xs font-medium leading-5 text-[var(--text-secondary)]'>
                    {confirmMode === 'startNew' ? t.startNewTreeOption : t.importFileOption}: {t.dataLossWarning}
                  </p>
                </div>

                <div className='space-y-2'>
                  <label htmlFor='clean-tree-confirm-input' className='ds-label px-1'>
                    {t.cleanTreeConfirmPlaceholder}
                  </label>
                  <input
                    id='clean-tree-confirm-input'
                    autoFocus
                    type='text'
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={targetWord}
                    className='ds-input w-full px-4 py-3 text-sm font-semibold'
                  />
                </div>

                <div className='flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end'>
                  <button
                    type='button'
                    onClick={() => {
                      setConfirmMode('none');
                      setConfirmInput('');
                    }}
                    className='min-h-11 rounded-lg border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]'
                  >
                    {t.common.back}
                  </button>
                  <button
                    type='button'
                    onClick={confirmMode === 'startNew' ? handleStartNew : handleImport}
                    disabled={!isConfirmed}
                    className='min-h-11 rounded-lg bg-[var(--danger-500)] px-4 py-2 text-sm font-bold text-white transition-colors hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-45'
                  >
                    {t.confirm}
                  </button>
                </div>
              </div>
            )}

            {confirmMode === 'none' && (
              <button
                type='button'
                onClick={resetAndClose}
                className='min-h-11 w-full rounded-lg text-sm font-semibold text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]'
              >
                {t.cancel}
              </button>
            )}
          </div>
        </div>
      </OverlayPrimitive>
    );
  }
);
