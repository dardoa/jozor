import React, { useState } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { Mail, Lock, User, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabaseAuthService } from '../services/supabaseAuthService';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { showToast } from '../utils/showToast';

interface EmailLoginFormProps {
    onSuccess: () => void;
    onCancel: () => void;
}

type AuthMode = 'login' | 'signup' | 'reset';

export const EmailLoginForm: React.FC<EmailLoginFormProps> = ({ onSuccess, onCancel }) => {
    const { t } = useTranslation();
    const [mode, setMode] = useState<AuthMode>('login');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    // Zustand State
    const authLoading = useAppStore(state => state.authLoading);
    const setAuthLoading = useAppStore(state => state.setAuthLoading);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthLoading(true);

        const authAction = async () => {
            if (mode === 'login') {
                await supabaseAuthService.signInWithPassword(email, password);
            } else if (mode === 'signup') {
                await supabaseAuthService.signUpWithPassword(email, password, name);
            } else if (mode === 'reset') {
                await supabaseAuthService.sendPasswordReset(email);
            }
        };

        const loadingMsg = mode === 'login' ? 'messages.loading.load' : mode === 'signup' ? 'messages.loading.save' : 'messages.loading.load';
        const successMsg = mode === 'login' ? 'loginSuccess' : mode === 'signup' ? 'loginSuccess' : 'resetSuccess';

        showToast.promise(authAction(), {
            loading: loadingMsg,
            success: (data) => {
                if (mode === 'login' || mode === 'signup') {
                    onSuccess();
                } else {
                    setMode('login');
                }
                return successMsg;
            },
            error: (err: any) => err instanceof Error ? err.message : 'authErrors.generic',
            finally: () => setAuthLoading(false),
        });
    };

    const inputShellClasses = 'ds-input-shell flex items-center gap-2.5 px-3 py-2.5';
    const inputClasses = 'ds-input w-full min-w-0 py-0 text-sm';

    return (
        <div className='w-full flex flex-col gap-4 animate-in slide-in-from-right duration-300'>
            <div className='flex items-center gap-2 mb-2'>
                <button
                    onClick={onCancel}
                    className='inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]'
                >
                    <ArrowLeft className='w-5 h-5 rtl:rotate-180' />
                </button>
                <h2 className='text-lg font-bold text-[var(--text-main)]'>
                    {mode === 'login' && t.login}
                    {mode === 'signup' && t.signUp}
                    {mode === 'reset' && t.resetPassword}
                </h2>
            </div>

            <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
                {mode === 'signup' && (
                    <div className={inputShellClasses}>
                        <User className='h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--primary-600)]' />
                        <input
                            type='text'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t.namePlaceholder}
                            className={inputClasses}
                            aria-label={t.namePlaceholder}
                            required
                        />
                    </div>
                )}

                <div className={inputShellClasses}>
                    <Mail className='h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--primary-600)]' />
                    <input
                        type='email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t.emailPlaceholder}
                        className={inputClasses}
                        aria-label={t.emailPlaceholder}
                        required
                    />
                </div>

                {mode !== 'reset' && (
                    <div className={inputShellClasses}>
                        <Lock className='h-4 w-4 shrink-0 text-[var(--text-muted)] transition-colors group-focus-within:text-[var(--primary-600)]' />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t.passwordPlaceholder}
                            className={inputClasses}
                            aria-label={t.passwordPlaceholder}
                            required
                        />
                        <button
                            type='button'
                            onClick={() => setShowPassword(!showPassword)}
                            className='inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-main)]'
                            title={showPassword ? t.hidePassword : t.showPassword}
                        >
                            {showPassword ? <EyeOff className='w-4 h-4' /> : <Eye className='w-4 h-4' />}
                        </button>
                    </div>
                )}

                {mode === 'login' && (
                    <div className='flex items-center justify-between mt-1'>
                        <label className='flex items-center gap-2 cursor-pointer select-none'>
                            <div className='relative flex items-center h-4 w-4'>
                                <input
                                    type='checkbox'
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className='peer appearance-none h-4 w-4 rounded-md border border-[var(--border-soft)] bg-[var(--surface-panel)] checked:bg-[var(--primary-600)] checked:border-[var(--primary-600)] transition-all cursor-pointer focus:ring-2 focus:ring-[var(--primary-600)]/20'
                                />
                                <svg
                                    className='absolute w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity start-0.5'
                                    xmlns='http://www.w3.org/2000/svg'
                                    viewBox='0 0 24 24'
                                    fill='none'
                                    stroke='currentColor'
                                    strokeWidth='4'
                                    strokeLinecap='round'
                                    strokeLinejoin='round'
                                >
                                    <polyline points='20 6 9 17 4 12' />
                                </svg>
                            </div>
                            <span className='text-[10px] text-[var(--text-muted)] font-medium transition-colors hover:text-[var(--text-main)]'>
                                {t.rememberMe}
                            </span>
                        </label>

                        <button
                            type='button'
                            onClick={() => setMode('reset')}
                            className='text-[10px] font-medium text-[var(--primary-600)] transition-colors hover:text-[var(--primary-500)]'
                        >
                            {t.forgotPassword}
                        </button>
                    </div>
                )}

                <Button
                    type='submit'
                    isLoading={authLoading}
                    size='lg'
                    className='mt-2 w-full'
                >
                    {mode === 'login' && t.login}
                    {mode === 'signup' && t.signUp}
                    {mode === 'reset' && t.sendResetLink}
                </Button>
            </form>

            <div className='mt-2 flex flex-col items-center gap-2 text-[11px] text-[var(--text-muted)]'>
                {mode === 'login' && (
                    <div className='flex gap-1 items-center'>
                        <span>{t.dontHaveAccount}</span>
                        <button type='button' onClick={() => setMode('signup')} className='font-bold text-[var(--primary-600)] hover:text-[var(--primary-500)]'>
                            {t.signUp}
                        </button>
                    </div>
                )}

                {mode === 'signup' && (
                    <div className='flex gap-1 items-center'>
                        <span>{t.alreadyHaveAccount}</span>
                        <button type='button' onClick={() => setMode('login')} className='font-bold text-[var(--primary-600)] hover:text-[var(--primary-500)]'>
                            {t.login}
                        </button>
                    </div>
                )}

                {mode === 'reset' && (
                    <button type='button' onClick={() => setMode('login')} className='font-bold text-[var(--primary-600)] hover:text-[var(--primary-500)]'>
                        {t.backToLogin}
                    </button>
                )}
            </div>
        </div>
    );
};
