import React, { memo } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { LoginButton } from '../LoginButton';
import { EmailLoginForm } from '../EmailLoginForm';
import { X } from 'lucide-react';
import { OverlayPrimitive } from '../../context/OverlayContext';

interface UnifiedLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoogleLogin: () => Promise<void>;
}

export const UnifiedLoginModal: React.FC<UnifiedLoginModalProps> = memo(({ isOpen, onClose, onGoogleLogin }) => {
    const { t } = useTranslation();

    return (
        <OverlayPrimitive
            isOpen={isOpen}
            onClose={onClose}
            id='login-modal'
            className='ds-overlay-backdrop fixed inset-0 z-[var(--z-index-modal)] flex items-end justify-center p-0 sm:items-center sm:p-4'
        >
            <div
                className='ds-overlay-card relative z-[calc(var(--z-index-modal)+1)] flex w-full sm:max-w-sm animate-in zoom-in-95 flex-col overflow-hidden duration-300'
                role='dialog'
                aria-modal='true'
            >
                <div className='ds-modal-header flex items-center justify-between'>
                    <button
                        onClick={onClose}
                        className='order-2 inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]'
                        aria-label={t.close}
                    >
                        <X className='w-5 h-5' />
                    </button>
                    <h2 className='order-1 text-lg font-bold text-[var(--text-main)]'>
                        {t.loginTitle}
                    </h2>
                </div>

                <div className='ds-modal-body relative flex flex-col gap-6 p-6'>
                    <div className='pointer-events-none absolute left-1/2 top-0 h-32 w-32 -translate-x-1/2 bg-[var(--color-info-500)]/10 blur-[60px]' />

                    <div className='flex flex-col gap-4'>
                        <p className='text-center text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]'>
                            {t.quickLogin}
                        </p>
                        <div className='flex justify-center px-2'>
                            <LoginButton
                                onLogin={async () => {
                                    await onGoogleLogin();
                                    onClose();
                                }}
                                label={t.loginGoogle}
                            />
                        </div>
                    </div>

                    <div className='flex items-center gap-4 px-2'>
                        <div className='h-px flex-1 bg-[var(--border-soft)]'></div>
                        <span className='px-2 text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]'>
                            {t.or}
                        </span>
                        <div className='h-px flex-1 bg-[var(--border-soft)]'></div>
                    </div>

                    <div className='px-1'>
                        <EmailLoginForm
                            onSuccess={onClose}
                            onCancel={onClose}
                        />
                    </div>
                </div>
            </div>
        </OverlayPrimitive>
    );
});
