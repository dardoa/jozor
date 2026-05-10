import React, { memo } from 'react';
import { Logo } from './Logo';
import { Plus, Upload, Languages } from 'lucide-react';
import { useAppUIStore } from '../store/useAppUIStore';
import { useTranslation } from '../context/TranslationContext';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';

interface WelcomeScreenProps {
  onStartNew: () => void;
  onImport: () => void;
  onLogin: () => Promise<void>;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = memo(
  ({ onStartNew, onImport, onLogin }) => {
    const { t, language, setLanguage } = useTranslation();
    const isLowGraphicsMode = useAppUIStore(state => state.isLowGraphicsMode);

    return (
      <div className='fixed inset-0 z-[var(--z-index-modal)] overflow-y-auto bg-[var(--surface-app)] text-[var(--text-main)]'>
        {!isLowGraphicsMode && (
          <div className='pointer-events-none absolute inset-0 overflow-hidden'>
            <div className='absolute -top-24 start-[-5rem] h-72 w-72 rounded-full bg-[var(--color-primary-500)]/10 blur-3xl' />
            <div className='absolute top-1/3 end-[-4rem] h-80 w-80 rounded-full bg-[var(--color-info-500)]/10 blur-3xl' />
            <div className='absolute bottom-[-5rem] start-1/3 h-72 w-72 rounded-full bg-[var(--color-accent-500)]/10 blur-3xl' />
            <svg className='absolute inset-0 h-full w-full opacity-60' viewBox='0 0 100 100' preserveAspectRatio='none'>
              <path d='M0,0 L100,100 M100,0 L0,100' stroke='var(--border-soft)' strokeWidth='0.12' />
              <circle cx='50' cy='50' r='40' stroke='var(--border-soft)' strokeWidth='0.12' fill='none' />
            </svg>
          </div>
        )}

        <button
          onClick={() => setLanguage(language === 'en' ? 'ar' : 'en')}
          className='absolute top-6 end-6 z-20 inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel)]/92 px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] shadow-[var(--shadow-sm)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]'
        >
          <Languages className='h-4 w-4' />
          <span>{language === 'en' ? 'العربية' : 'English'}</span>
        </button>

        <div className='relative z-10 mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-6 py-12'>
          <div className='grid w-full max-w-5xl gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center'>
            <div className='space-y-6 text-center lg:text-start'>
              <div className='inline-flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel-subtle)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[var(--text-secondary)] shadow-[var(--shadow-sm)]'>
                <span className='h-2 w-2 rounded-full bg-[var(--color-accent-500)]' />
                Jozor
              </div>

              <div className='space-y-4'>
                <h1 className='text-4xl font-black tracking-tight text-[var(--text-main)] sm:text-5xl lg:text-6xl'>
                  {t.welcomeTitle}
                  <span className='text-[var(--color-primary-600)]'>.</span>
                </h1>
                <p className='mx-auto max-w-2xl text-base leading-relaxed text-[var(--text-secondary)] lg:mx-0 lg:text-lg'>
                  {t.welcomeSubtitle}
                </p>
              </div>

              <div className='grid gap-3 sm:grid-cols-2 lg:max-w-xl'>
                <div className='ds-panel-subtle rounded-[var(--radius-xl)] p-4 text-start shadow-[var(--shadow-sm)]'>
                  <div className='mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-primary-600)]/12 text-[var(--color-primary-600)]'>
                    <Plus className='h-5 w-5' />
                  </div>
                  <h2 className='text-sm font-bold text-[var(--text-main)]'>{t.startNew}</h2>
                  <p className='mt-1 text-xs leading-relaxed text-[var(--text-dim)]'>{t.safeData}</p>
                </div>

                <div className='ds-panel-subtle rounded-[var(--radius-xl)] p-4 text-start shadow-[var(--shadow-sm)]'>
                  <div className='mb-2 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-info-500)]/12 text-[var(--color-info-500)]'>
                    <Upload className='h-5 w-5' />
                  </div>
                  <h2 className='text-sm font-bold text-[var(--text-main)]'>{t.importFile}</h2>
                  <p className='mt-1 text-xs leading-relaxed text-[var(--text-dim)]'>{t.or}</p>
                </div>
              </div>
            </div>

            <div className='ds-panel relative rounded-[var(--radius-2xl)] p-6 text-center shadow-[var(--shadow-lg)] sm:p-8'>
              <div className='mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--primary-600)]/18 bg-[var(--primary-600)]/10 shadow-[var(--shadow-sm)] ring-4 ring-[var(--primary-600)]/8'>
                <Logo className='h-10 w-10 text-[var(--primary-600)]' />
              </div>

              <h2 className='text-2xl font-black tracking-tight text-[var(--text-main)]'>
                {t.signIn}
              </h2>
              <p className='mt-2 text-sm leading-relaxed text-[var(--text-secondary)]'>
                {t.safeData}
              </p>

              <div className='mt-8 flex flex-col gap-3'>
                <Button onClick={onLogin} size='lg' className='w-full'>
                  {t.signIn}
                </Button>
                <Button
                  onClick={onStartNew}
                  variant='secondary'
                  size='lg'
                  className='w-full'
                  leftIcon={<Plus className='h-4 w-4' />}
                >
                  {t.startNew}
                </Button>
                <Button
                  onClick={onImport}
                  variant='outline'
                  size='lg'
                  className='w-full'
                  leftIcon={<Upload className='h-4 w-4' />}
                >
                  {t.importFile}
                </Button>
              </div>

              <div className='my-6 flex w-full items-center gap-3'>
                <div className='h-px flex-1 bg-[var(--border-soft)]' />
                <span className='text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--text-muted)]'>
                  {t.or}
                </span>
                <div className='h-px flex-1 bg-[var(--border-soft)]' />
              </div>

              <p className='text-xs leading-relaxed text-[var(--text-muted)]'>
                {t.welcomeSubtitle}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
