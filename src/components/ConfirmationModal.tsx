import React, { memo } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { OverlayPrimitive } from '../context/OverlayContext';
import { Button } from './ui/Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  /** Unique id for the overlay manager (defaults to 'confirmation-modal') */
  overlayId?: string;
  /** If provided, user must type this exact text to enable confirm button */
  requiredConfirmText?: string;
  /** Placeholder for the confirmation input */
  confirmPlaceholder?: string;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = memo(
  ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    confirmText, 
    cancelText, 
    type = 'danger', 
    overlayId = 'confirmation-modal',
    requiredConfirmText,
    confirmPlaceholder
  }) => {
    const { t } = useTranslation();
    const [confirmInput, setConfirmInput] = React.useState('');

    // Reset input when modal opens/closes
    React.useEffect(() => {
      if (!isOpen) setConfirmInput('');
    }, [isOpen]);

    const isConfirmDisabled = requiredConfirmText ? confirmInput !== requiredConfirmText : false;

    return (
      <OverlayPrimitive
        id={overlayId}
        isOpen={isOpen}
        onClose={onClose}
        backdropClassName='ds-overlay-backdrop fixed inset-0 z-[var(--z-index-modal)] flex items-end justify-center p-0 animate-in fade-in duration-300 sm:items-center sm:p-4'
        contentClassName='w-full sm:max-w-sm'
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-desc"
          className='ds-overlay-card relative z-[calc(var(--z-index-modal)+1)] w-full overflow-hidden flex flex-col animate-scale-in'
        >
          <div className='ds-modal-header border-b-0 pb-2'>
            <div
              className={`
                w-12 h-12 rounded-full flex items-center justify-center
                ${type === 'danger'
                  ? 'bg-[var(--danger-500)]/12 text-[var(--danger-600)]'
                  : type === 'warning'
                    ? 'bg-[var(--warning-500)]/12 text-[var(--warning-500)]'
                    : 'bg-[var(--color-info-500)]/12 text-[var(--color-info-500)]'
                }
              `}
            >
              <AlertTriangle className='w-6 h-6 stroke-[2.5]' />
            </div>
            <button
              onClick={onClose}
              aria-label={t.close}
              className='p-2 -mr-2 -mt-2 hover:bg-[var(--theme-hover)] rounded-full transition-colors text-[var(--text-muted)] hover:text-[var(--text-main)]'
            >
              <X className='w-5 h-5' />
            </button>
          </div>

          <div className='ds-modal-body pt-2 space-y-4'>
            <div>
              <h3 id="confirm-title" className='text-[var(--font-size-h2)] font-bold text-[var(--text-main)] mb-2'>{title}</h3>
              <p id="confirm-desc" className='text-[var(--text-dim)] text-sm leading-relaxed'>
                {message}
              </p>
            </div>

            {requiredConfirmText && (
              <div className='space-y-2 animate-in slide-in-from-top-1 duration-200'>
                <label htmlFor={`${overlayId}-confirmation-input`} className='ds-label px-1'>
                  {confirmPlaceholder || t.deleteConfirmPlaceholder.replace('{name}', requiredConfirmText)}
                </label>
                <input
                  id={`${overlayId}-confirmation-input`}
                  autoFocus
                  type="text"
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={requiredConfirmText}
                  className='ds-input w-full px-4 py-2.5 text-sm font-semibold'
                />
              </div>
            )}
          </div>

          <div className='ds-modal-footer'>
            <Button
              onClick={onClose}
              variant="ghost"
            >
              {cancelText || t.cancel}
            </Button>
            <Button
              disabled={isConfirmDisabled}
              onClick={() => {
                onConfirm();
                onClose();
              }}
              variant={type === 'danger' ? 'danger' : 'primary'}
            >
              {confirmText || t.confirm}
            </Button>
          </div>
        </div>
      </OverlayPrimitive>
    );
  }
);
