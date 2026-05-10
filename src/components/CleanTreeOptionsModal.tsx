import React, { memo } from 'react';
import { X, Plus, Upload, AlertTriangle } from 'lucide-react'; // Import AlertTriangle icon
import { CleanTreeOptionsModalProps } from '../types';
import { useTranslation } from '../context/TranslationContext';
import { OverlayPrimitive } from '../context/OverlayContext';

export const CleanTreeOptionsModal: React.FC<CleanTreeOptionsModalProps> = memo(
  ({ isOpen, onClose, onStartNewTree, onTriggerImportFile }) => {
    const { t, language } = useTranslation();
    const [confirmMode, setConfirmMode] = React.useState<'none' | 'startNew' | 'import'>('none');
    const [confirmInput, setConfirmInput] = React.useState('');

    const targetWord = language === 'ar' ? 'حذف' : 'RESET';

    const handleStartNew = () => {
      onStartNewTree();
      onClose();
      setConfirmMode('none');
      setConfirmInput('');
    };

    const handleImport = () => {
      onTriggerImportFile();
      onClose();
      setConfirmMode('none');
      setConfirmInput('');
    };

    const isConfirmed = confirmInput === targetWord;

    return (
      <OverlayPrimitive
        isOpen={isOpen}
        onClose={() => {
          onClose();
          setConfirmMode('none');
          setConfirmInput('');
        }}
        id='clean-tree-options-modal'
      >
        <div
          className='ds-overlay-card flex max-h-[92dvh] w-full sm:max-w-md flex-col overflow-hidden animate-in zoom-in-95 duration-200'
          onClick={(e) => e.stopPropagation()}
        >
          <div className='ds-modal-header'>
            <div>
              <h3 className='ds-heading'>
                {t.cleanTreeOptionsTitle}
              </h3>
            </div>
            <button
              onClick={onClose}
              className='inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          <div className='space-y-6 bg-[var(--surface-app)]/45 p-4 sm:p-6'>
            {confirmMode === 'none' ? (
              <>
                {/* Warning Message */}
                <div className='flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl text-orange-700 dark:text-orange-300 text-xs font-bold'>
                  <AlertTriangle className='w-5 h-5 shrink-0 opacity-80' />
                  <span>{t.dataLossWarning}</span>
                </div>

                <div className='grid gap-4'>
                  {/* Option 1: Start a Blank Tree */}
                  <button
                    onClick={() => setConfirmMode('startNew')}
                    className='group relative w-full p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:border-blue-200 dark:hover:border-blue-700 transition-all flex items-center gap-4 text-start'
                  >
                    <div className='w-12 h-12 bg-white dark:bg-blue-800 rounded-2xl flex items-center justify-center shadow-lg text-blue-600 dark:text-blue-200 group-hover:scale-110 transition-transform'>
                      <Plus className='w-6 h-6' />
                    </div>
                    <div>
                      <div className='font-black text-blue-900 dark:text-blue-100'>
                        {t.startNewTreeOption}
                      </div>
                    </div>
                  </button>

                  {/* Option 2: Import from File */}
                  <button
                    onClick={() => setConfirmMode('import')}
                    className='group relative w-full p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl hover:bg-emerald-100 dark:hover:bg-emerald-900/40 hover:border-emerald-200 dark:hover:border-emerald-700 transition-all flex items-center gap-4 text-start'
                  >
                    <div className='w-12 h-12 bg-white dark:bg-emerald-800 rounded-2xl flex items-center justify-center shadow-lg text-emerald-600 dark:text-emerald-200 group-hover:scale-110 transition-transform'>
                      <Upload className='w-6 h-6' />
                    </div>
                    <div>
                      <div className='font-black text-emerald-900 dark:text-emerald-100'>
                        {t.importFileOption}
                      </div>
                    </div>
                  </button>
                </div>
              </>
            ) : (
              <div className='space-y-6 animate-in slide-in-from-bottom-4 duration-300'>
                <div className='p-5 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl'>
                  <div className='flex items-center gap-3 text-red-600 dark:text-red-400 mb-2'>
                    <AlertTriangle className='w-5 h-5' />
                    <span className='text-sm font-black uppercase tracking-wider'>{t.confirmDelete}</span>
                  </div>
                  <p className='text-xs font-bold text-stone-600 dark:text-stone-400 leading-relaxed'>
                    {confirmMode === 'startNew' ? t.startNewTreeOption : t.importFileOption}: {t.dataLossWarning}
                  </p>
                </div>

                <div className='space-y-3'>
                  <p className='text-[11px] font-black text-stone-500 uppercase tracking-widest px-1'>
                    {t.cleanTreeConfirmPlaceholder}
                  </p>
                  <input
                    autoFocus
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder={targetWord}
                    className='w-full px-4 py-3 bg-stone-50 dark:bg-stone-900/50 border border-stone-200 dark:border-stone-700 rounded-2xl text-sm font-black text-stone-900 dark:text-white placeholder:opacity-30 outline-none focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all'
                  />
                </div>

                <div className='flex items-center gap-3 pt-2'>
                  <button
                    onClick={() => {
                      setConfirmMode('none');
                      setConfirmInput('');
                    }}
                    className='flex-1 py-3 bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-600 dark:text-stone-200 rounded-2xl text-sm font-bold transition-all'
                  >
                    {t.common.back}
                  </button>
                  <button
                    onClick={confirmMode === 'startNew' ? handleStartNew : handleImport}
                    disabled={!isConfirmed}
                    className='flex-1 py-3 bg-red-600 hover:bg-red-500 text-white disabled:bg-stone-200 dark:disabled:bg-stone-700 disabled:text-stone-400 rounded-2xl text-sm font-black transition-all shadow-lg shadow-red-500/20 active:scale-95'
                  >
                    {t.confirm}
                  </button>
                </div>
              </div>
            )}

            {confirmMode === 'none' && (
              <button
                onClick={onClose}
                className='w-full py-3 text-stone-500 dark:text-stone-400 font-bold text-sm hover:text-stone-800 dark:hover:text-stone-200 transition-colors'
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
