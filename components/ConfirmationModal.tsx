import React, { memo } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = memo(
  ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, type = 'danger' }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
      <div
        className='fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300'
        onClick={onClose}
      >
        <div
          className='
                    bg-white/90 dark:bg-stone-900/90 backdrop-blur-xl 
                    rounded-2xl shadow-2xl ring-1 ring-stone-900/5 dark:ring-white/10
                    max-w-sm w-full overflow-hidden flex flex-col 
                    animate-scale-in
                '
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className='flex items-center justify-between p-6 pb-2'>
            <div
              className={`
                        w-12 h-12 rounded-full flex items-center justify-center
                        ${type === 'danger'
                  ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                  : 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                }
                    `}
            >
              <AlertTriangle className='w-6 h-6 stroke-[2.5]' />
            </div>
            <button
              onClick={onClose}
              className='p-2 -mr-2 -mt-2 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-full transition-colors text-stone-400 hover:text-stone-600 dark:hover:text-stone-200'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          {/* Content */}
          <div className='px-6 pb-6 pt-2'>
            <h3 className='text-xl font-bold text-stone-900 dark:text-white mb-2'>{title}</h3>
            <p className='text-stone-600 dark:text-stone-300 text-base leading-relaxed'>
              {message}
            </p>
          </div>

          {/* Footer */}
          <div className='p-4 bg-stone-50/50 dark:bg-stone-900/50 border-t border-stone-200/50 dark:border-stone-800/50 flex justify-end gap-3'>
            <button
              onClick={onClose}
              className='
                            px-5 py-2.5 text-sm font-semibold rounded-xl transition-all duration-200
                            text-stone-600 dark:text-stone-300 
                            hover:bg-stone-200/80 dark:hover:bg-stone-800
                            active:scale-[0.98]
                        '
            >
              {cancelText || t.cancel}
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`
                            px-6 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all transform active:scale-[0.98]
                            flex items-center gap-2
                            ${type === 'danger'
                  ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-500/25 dark:shadow-rose-900/20'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-blue-500/25'
                }
                        `}
            >
              {confirmText || t.confirm}
            </button>
          </div>
        </div>
      </div>
    );
  }
);
