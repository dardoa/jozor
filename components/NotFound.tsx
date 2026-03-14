import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../context/TranslationContext';
import { ArrowLeft, Home, HelpCircle } from 'lucide-react';

export const NotFound: React.FC = () => {
  const { language, t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-[var(--theme-bg)] text-[var(--text-main)] p-4'>
      <div className='max-w-md w-full text-center space-y-8 animate-in zoom-in-95 duration-500'>
        {/* Playful Error Icon / Visual */}
        <div className='relative flex justify-center'>
          <div className='absolute inset-0 bg-red-500/20 blur-[100px] rounded-full' />
          <svg className='w-40 h-40 text-red-500/80 drop-shadow-2xl' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' />
            <line x1='12' y1='9' x2='12' y2='13' />
            <line x1='12' y1='17' x2='12.01' y2='17' />
          </svg>
          <div className='absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-black text-6xl text-[var(--theme-bg)] drop-shadow-md'>
            404
          </div>
        </div>

        <div className='space-y-3'>
          <h1 className='text-3xl sm:text-4xl font-black tracking-tight text-[var(--theme-text)]'>
            {t.notFound.title}
          </h1>
          <p className='text-[var(--theme-text-muted)] text-sm sm:text-base max-w-[300px] mx-auto leading-relaxed'>
            {t.notFound.description}
          </p>
        </div>

        <div className='flex flex-col sm:flex-row gap-3 pt-4 sm:pt-8 w-full max-w-[350px] mx-auto'>
          <button
            onClick={() => navigate(-1)}
            className='flex-1 px-6 py-3.5 bg-[var(--card-bg)] hover:bg-[var(--card-bg-hover)] border border-white/5 text-[var(--theme-text)] rounded-2xl font-bold text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 group'
          >
            <ArrowLeft className='w-4 h-4 rtl:rotate-180 transition-transform group-hover:-translate-x-1 rtl:group-hover:translate-x-1' />
            {t.notFound.goBack}
          </button>
          
          <button
            onClick={() => navigate('/')}
            className='flex-1 px-6 py-3.5 bg-[var(--brand-color)] hover:brightness-110 text-white rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2'
          >
            <Home className='w-4 h-4' />
            {t.notFound.goHome}
          </button>
        </div>

        <button
          onClick={() => navigate('/help')}
          className='w-full text-center text-[var(--theme-text-muted)] hover:text-[var(--brand-color)] text-sm font-medium transition-colors flex items-center justify-center gap-2 pt-4'
        >
          <HelpCircle className='w-4 h-4' />
          {t.notFound.needHelp}
        </button>
      </div>
    </div>
  );
};
