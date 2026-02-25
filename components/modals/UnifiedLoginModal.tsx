import React, { memo } from 'react';
import { useTranslation } from '../../context/TranslationContext';
import { LoginButton } from '../LoginButton';
import { EmailLoginForm } from '../EmailLoginForm';
import { X } from 'lucide-react';

interface UnifiedLoginModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGoogleLogin: () => Promise<void>;
}

export const UnifiedLoginModal: React.FC<UnifiedLoginModalProps> = memo(({ isOpen, onClose, onGoogleLogin }) => {
    const { t } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className='fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300'>
            <div
                className='bg-stone-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-300'
                role='dialog'
                aria-modal='true'
            >
                {/* Header - X on right in RTL by putting it first in DOM with justify-between */}
                <div className='flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-white/5 to-transparent'>
                    <button
                        onClick={onClose}
                        className='p-1.5 rounded-full hover:bg-white/10 text-gray-400 hover:text-white transition-colors order-2'
                        aria-label='Close'
                    >
                        <X className='w-5 h-5' />
                    </button>
                    <h2 className='text-lg font-bold text-white order-1'>
                        {t.loginTitle || 'Welcome Back'}
                    </h2>
                </div>

                <div className='p-6 flex flex-col gap-6 relative'>
                    {/* Background glow */}
                    <div className='absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-500/10 blur-[60px] pointer-events-none' />

                    {/* Google Login Section */}
                    <div className='flex flex-col gap-4'>
                        <p className='text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center'>
                            {t.quickLogin || 'Quick Access'}
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

                    {/* Separator - Enhanced symmetry */}
                    <div className='flex items-center gap-4 px-2'>
                        <div className='h-px bg-white/5 flex-1'></div>
                        <span className='text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2'>
                            {t.or || 'OR'}
                        </span>
                        <div className='h-px bg-white/5 flex-1'></div>
                    </div>

                    {/* Email Login Section */}
                    <div className='px-1'>
                        <EmailLoginForm
                            onSuccess={onClose}
                            onCancel={onClose}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
});
