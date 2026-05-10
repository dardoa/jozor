import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/TranslationContext';
import { ArrowLeft, Home, HelpCircle, TriangleAlert } from 'lucide-react';
import { Button } from './ui/Button';
import { EmptyState } from './ui/EmptyState';

export const NotFound: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className='relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--surface-app)] px-4 py-12 text-[var(--text-main)]'>
      <div className='pointer-events-none absolute inset-0 overflow-hidden'>
        <div className='absolute top-[-6rem] start-[-4rem] h-72 w-72 rounded-full bg-[var(--danger-500)]/10 blur-3xl' />
        <div className='absolute bottom-[-5rem] end-[-5rem] h-80 w-80 rounded-full bg-[var(--color-info-500)]/8 blur-3xl' />
      </div>

      <div className='relative z-10 w-full max-w-xl animate-in zoom-in-95 duration-500'>
        <EmptyState
          className='ds-panel mx-auto gap-5 rounded-[var(--radius-2xl)] p-8 shadow-[var(--shadow-lg)]'
          icon={
            <div className='relative flex items-center justify-center'>
              <div className='absolute inset-0 rounded-full bg-[var(--danger-500)]/12 blur-2xl' />
              <div className='relative flex h-20 w-20 items-center justify-center rounded-[var(--radius-xl)] border border-[var(--danger-500)]/20 bg-[var(--surface-subtle)] text-[var(--danger-500)] shadow-[var(--shadow-sm)]'>
                <TriangleAlert className='h-9 w-9' />
              </div>
            </div>
          }
          title={t.notFound.title}
          description={t.notFound.description}
          action={
            <div className='mt-2 flex w-full max-w-[360px] flex-col gap-3 sm:flex-row'>
              <Button
                onClick={() => navigate(-1)}
                variant='secondary'
                className='flex-1'
                leftIcon={<ArrowLeft className='h-4 w-4 rtl:rotate-180' />}
              >
                {t.notFound.goBack}
              </Button>
              <Button
                onClick={() => navigate('/')}
                className='flex-1'
                leftIcon={<Home className='h-4 w-4' />}
              >
                {t.notFound.goHome}
              </Button>
            </div>
          }
        />

        <div className='mt-5 text-center'>
          <button
            onClick={() => navigate('/help')}
            className='inline-flex items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--color-primary-600)]'
          >
            <HelpCircle className='h-4 w-4' />
            {t.notFound.needHelp}
          </button>
        </div>
      </div>
    </div>
  );
};
