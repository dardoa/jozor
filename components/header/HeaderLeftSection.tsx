import React, { memo } from 'react';
import { Undo, Redo, Menu } from 'lucide-react';
import { Logo } from '../Logo';
import { HeaderLeftSectionProps } from '../../types';
import { useTranslation } from '../../context/TranslationContext';

export const HeaderLeftSection: React.FC<HeaderLeftSectionProps> = memo(
  ({ themeLanguage, toggleSidebar, historyControls }) => {
    const { t } = useTranslation();

    return (
      <div className='flex items-center gap-3 md:gap-6'>
        <button
          onClick={toggleSidebar}
          className='p-2 text-[var(--text-muted)] hover:bg-[var(--theme-bg)] rounded-xl transition-colors'
          aria-label={t.toggleSidebar}
        >
          <Menu className='w-5 h-5' />
        </button>
        <div
          className='flex items-center gap-3 select-none cursor-pointer group'
          onClick={() => window.dispatchEvent(new CustomEvent('reset-interactive-view'))}
          role='link'
          aria-label={t.appTitle}
        >
          <div className='bg-[var(--primary-600)]/10 p-2 rounded-xl border border-[var(--primary-600)]/20 shadow-sm hidden md:block group-hover:scale-105 transition-transform'>
            <Logo className='w-6 h-6 text-[var(--primary-600)]' />
          </div>
          <h1 className='text-xl font-bold tracking-tight font-sans text-[var(--text-main)] hidden sm:block'>
            {t.appTitle}
          </h1>
        </div>

        {/* History Controls */}
        <div
          className='hidden sm:flex items-center p-1 bg-[var(--theme-bg)]/50 rounded-full border border-[var(--border-main)] backdrop-blur-sm'
          role='group'
          aria-label={t.historyControls}
        >
          <button
            onClick={historyControls.onUndo}
            disabled={!historyControls.canUndo}
            className='p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-bg)] rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent'
            dir='ltr'
            aria-label={t.undo}
          >
            <Undo className={`w-4 h-4 ${themeLanguage.language === 'ar' ? 'scale-x-[-1]' : ''}`} />
          </button>
          <div className='w-px h-3 bg-[var(--border-main)] mx-0.5'></div>
          <button
            onClick={historyControls.onRedo}
            disabled={!historyControls.canRedo}
            className='p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-bg)] rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent'
            dir='ltr'
            aria-label={t.redo}
          >
            <Redo className={`w-4 h-4 ${themeLanguage.language === 'ar' ? 'scale-x-[-1]' : ''}`} />
          </button>
        </div>
      </div>
    );
  }
);
