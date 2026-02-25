import React, { useState } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { Mail, Lock, User, ArrowLeft, Loader2, Eye, EyeOff } from 'lucide-react';
import { loginWithEmail, registerWithEmail, resetPassword } from '../services/firebaseAuthService';
import { useAppStore } from '../store/useAppStore';

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
    const authError = useAppStore(state => state.authError);
    const setAuthLoading = useAppStore(state => state.setAuthLoading);
    const setAuthError = useAppStore(state => state.setAuthError);

    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAuthError(null);
        setSuccessMsg(null);
        setAuthLoading(true);

        try {
            if (mode === 'login') {
                await loginWithEmail(email, password);
                onSuccess();
            } else if (mode === 'signup') {
                await registerWithEmail(email, password, name);
                onSuccess();
            } else if (mode === 'reset') {
                await resetPassword(email);
                setSuccessMsg(t.resetSuccess);
                setMode('login'); // Return to login but show success
            }
        } catch (err: any) {
            console.error(err);
            // Simplify error messages
            let msg = err.message || 'An error occurred';
            if (msg.includes('auth/invalid-email')) msg = 'Invalid email address';
            if (msg.includes('auth/user-not-found')) msg = 'User not found';
            if (msg.includes('auth/wrong-password')) msg = 'Incorrect password';
            if (msg.includes('auth/email-already-in-use')) msg = 'Email already in use';
            if (msg.includes('auth/weak-password')) msg = 'Password should be at least 6 characters';
            setAuthError(msg);
        } finally {
            setAuthLoading(false);
        }
    };

    const inputClasses = 'w-full bg-white/5 border border-white/10 rounded-lg py-2.5 ps-10 pe-10 text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--primary-600)]/50 focus:border-[var(--primary-600)]/50 transition-all';

    return (
        <div className='w-full flex flex-col gap-4 animate-in slide-in-from-right duration-300'>
            <div className='flex items-center gap-2 mb-2'>
                <button
                    onClick={onCancel}
                    className='p-1 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors'
                >
                    <ArrowLeft className='w-5 h-5 rtl:rotate-180' />
                </button>
                <h2 className='text-lg font-bold text-white'>
                    {mode === 'login' && t.login}
                    {mode === 'signup' && t.signUp}
                    {mode === 'reset' && t.resetPassword}
                </h2>
            </div>

            {authError && (
                <div className='p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-200 text-xs animate-in shake duration-500'>
                    {authError}
                </div>
            )}

            {successMsg && (
                <div className='p-3 rounded-lg bg-green-500/20 border border-green-500/30 text-green-200 text-xs'>
                    {successMsg}
                </div>
            )}

            <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
                {mode === 'signup' && (
                    <div className='relative group'>
                        <User className='absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--primary-600)] transition-colors' />
                        <input
                            type='text'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={t.namePlaceholder}
                            className={inputClasses}
                            required
                        />
                    </div>
                )}

                <div className='relative group'>
                    <Mail className='absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--primary-600)] transition-colors' />
                    <input
                        type='email'
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={t.emailPlaceholder}
                        className={inputClasses}
                        required
                    />
                </div>

                {mode !== 'reset' && (
                    <div className='relative group'>
                        <Lock className='absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-[var(--primary-600)] transition-colors' />
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t.passwordPlaceholder}
                            className={inputClasses}
                            required
                        />
                        <button
                            type='button'
                            onClick={() => setShowPassword(!showPassword)}
                            className='absolute end-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors'
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
                                    className='peer appearance-none h-4 w-4 rounded-md border border-white/20 bg-white/5 checked:bg-[var(--primary-600)] checked:border-[var(--primary-600)] transition-all cursor-pointer focus:ring-2 focus:ring-[var(--primary-600)]/50'
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
                            <span className='text-[10px] text-gray-400 font-medium hover:text-gray-300 transition-colors'>
                                {t.rememberMe}
                            </span>
                        </label>

                        <button
                            type='button'
                            onClick={() => setMode('reset')}
                            className='text-[10px] text-[var(--primary-600)] hover:text-[var(--primary-500)] transition-colors font-medium'
                        >
                            {t.forgotPassword}
                        </button>
                    </div>
                )}

                <button
                    type='submit'
                    disabled={authLoading}
                    className='mt-2 w-full py-2.5 bg-[var(--primary-600)] hover:bg-[var(--primary-500)] disabled:bg-[var(--primary-700)] disabled:opacity-70 text-[var(--primary-text)] rounded-xl font-bold text-sm shadow-lg shadow-[var(--primary-600)]/20 transition-all flex items-center justify-center gap-2 active:scale-95'
                >
                    {authLoading && <Loader2 className='w-4 h-4 animate-spin' />}
                    {!authLoading && mode === 'login' && t.login}
                    {!authLoading && mode === 'signup' && t.signUp}
                    {!authLoading && mode === 'reset' && t.sendResetLink}
                </button>
            </form>

            <div className='flex flex-col items-center gap-2 text-[11px] text-gray-400 mt-2'>
                {mode === 'login' && (
                    <div className='flex gap-1 items-center'>
                        <span>{t.dontHaveAccount}</span>
                        <button onClick={() => setMode('signup')} className='text-[var(--primary-600)] hover:text-[var(--primary-500)] font-bold'>
                            {t.signUp}
                        </button>
                    </div>
                )}

                {mode === 'signup' && (
                    <div className='flex gap-1 items-center'>
                        <span>{t.alreadyHaveAccount}</span>
                        <button onClick={() => setMode('login')} className='text-[var(--primary-600)] hover:text-[var(--primary-500)] font-bold'>
                            {t.login}
                        </button>
                    </div>
                )}

                {mode === 'reset' && (
                    <button onClick={() => setMode('login')} className='text-[var(--primary-600)] hover:text-[var(--primary-500)] font-bold'>
                        {t.backToLogin}
                    </button>
                )}
            </div>
        </div>
    );
};
