import React, { memo } from 'react';
import { Logo } from './Logo';
import { Plus, Upload, Languages } from 'lucide-react';
import { useTranslation } from '../context/TranslationContext';
import { LoginButton } from './LoginButton';
import { useAppStore } from '../store/useAppStore';

interface WelcomeScreenProps {
  onStartNew: () => void;
  onImport: () => void;
  onLogin: () => Promise<void>;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = memo(
  ({ onStartNew, onImport, onLogin }) => {
    const { t, language, setLanguage } = useTranslation();
    const isLowGraphicsMode = useAppStore(state => state.treeSettings.isLowGraphicsMode);

    return (
      <div className='fixed inset-0 z-50 flex flex-col items-center justify-center bg-black'>
        {/* Background Image */}
        {!isLowGraphicsMode && (
          <div className='absolute inset-0 z-0 overflow-hidden'>
            <img
              src='https://images.unsplash.com/photo-1516733968668-dbdce39c4651?q=80&w=2574&auto=format&fit=crop'
              alt='Grandfather and grandson walking'
              className='w-full h-full object-cover opacity-60 animate-in fade-in duration-1000 scale-105'
            />
            <div className='absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent' />
          </div>
        )}

        {/* Fallback solid background for low graphics */}
        {isLowGraphicsMode && (
          <div className='absolute inset-0 z-0 bg-slate-950' />
        )}

        {/* Language Toggle (Top Right) */}
        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className={`absolute top-6 end-6 z-20 text-white/70 hover:text-white bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-full flex items-center gap-2 transition-all ${isLowGraphicsMode ? '' : 'backdrop-blur'}`}
        >
          <Languages className='w-4 h-4' />
          <span className='text-xs font-bold'>{language === 'en' ? 'Arabic' : 'English'}</span>
        </button>

        {/* Content */}
        <div className='relative z-10 flex flex-col items-center max-w-sm w-full px-6 text-center animate-in slide-in-from-bottom-8 duration-700 max-h-screen overflow-y-auto py-8 scrollbar-hide'>
          {/* Logo */}
          <div className='w-16 h-16 bg-[var(--primary-600)]/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-[var(--primary-600)]/30 mb-6 shadow-2xl ring-4 ring-[var(--primary-600)]/10 shrink-0'>
            <Logo className='w-10 h-10 text-[var(--primary-600)]' />
          </div>

          <h1 className='text-3xl md:text-4xl font-bold text-white mb-2 tracking-tight font-sans'>
            {t.welcomeTitle} <span className='text-[var(--primary-600)]'>.</span>
          </h1>
          <p className='text-sm md:text-base text-gray-300 mb-8 font-medium max-w-xs mx-auto leading-relaxed'>
            {t.welcomeSubtitle}
          </p>

          <div className='flex flex-col gap-3 w-full'>
            <button
              onClick={onStartNew}
              className='group relative w-full py-3 bg-[var(--primary-button-bg)] hover:bg-[var(--primary-button-hover-bg)] text-[var(--primary-button-text)] rounded-lg font-bold text-sm shadow-lg hover:shadow-blue-500/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2 overflow-hidden'
            >
              <div className='absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 rtl:-scale-x-100' />
              <Plus className='w-4 h-4' />
              <span>{t.startNew}</span>
            </button>

            <button
              onClick={onImport}
              className={`w-full py-3 bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:border-white/30 rounded-lg font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isLowGraphicsMode ? '' : 'backdrop-blur-md'}`}
            >
              <Upload className='w-4 h-4' />
              <span>{t.importFile}</span>
            </button>
          </div>

          <p className='mt-4 text-[10px] text-gray-400'>{t.safeData}</p>

          {/* Separator */}
          <div className='w-full flex items-center gap-3 my-4'>
            <div className='h-px bg-white/10 flex-1'></div>
            <span className='text-[10px] text-gray-500 font-bold uppercase tracking-widest'>
              {t.or}
            </span>
            <div className='h-px bg-white/10 flex-1'></div>
          </div>

          {/* Login Section */}
          <div className='w-full flex flex-col gap-2'>
            <button
              onClick={onLogin}
              className='w-full py-3.5 bg-[var(--primary-600)] hover:bg-[var(--primary-500)] text-[var(--primary-text)] rounded-xl font-bold text-sm shadow-lg shadow-[var(--primary-600)]/25 transition-all active:scale-[0.98] flex items-center justify-center gap-2'
            >
              <span>{t.signIn}</span>
            </button>
          </div>
        </div>
      </div>
    );
  }
);
