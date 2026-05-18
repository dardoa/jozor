import React, { memo } from 'react';
import { Undo, Redo, Menu, X } from 'lucide-react';
import { Logo } from '../Logo';
import { HeaderLeftSectionProps } from '../../types';
import { useTranslation } from '../../context/TranslationContext';

export const HeaderLeftSection: React.FC<HeaderLeftSectionProps> = memo(
  ({ themeLanguage: _themeLanguage, toggleDetailsPanel, detailsPanelOpen, hasActivePerson, historyControls }) => {
    const { t } = useTranslation();
    const detailsLabel = detailsPanelOpen
      ? (t.closeDetails || 'Close details')
      : (t.openDetails || 'Open details');
    const inactiveLabel = t.selectPersonForDetails || 'Select a person to view details';
    const detailsTriggerLabel = hasActivePerson ? detailsLabel : inactiveLabel;

    return (
      <div className='flex items-center gap-3 md:gap-6'>
        <button
          type="button"
          onClick={toggleDetailsPanel}
          className='p-3 md:p-2 text-[var(--text-muted)] hover:bg-[var(--theme-bg)] rounded-xl transition-colors disabled:opacity-35 disabled:cursor-not-allowed disabled:hover:bg-transparent'
          aria-label={detailsTriggerLabel}
          title={detailsTriggerLabel}
          disabled={!hasActivePerson}
        >
          {detailsPanelOpen ? <X className='w-5 h-5' /> : <Menu className='w-5 h-5' />}
        </button>
        <div
          className='flex items-center gap-3 select-none cursor-pointer group'
          onClick={() => window.dispatchEvent(new CustomEvent('reset-interactive-view'))}
          role='link'
          aria-label={t.appTitle}
        >
          <div className='block group-hover:scale-105 transition-transform'>
            <Logo variant="dark" className='h-[40px] md:h-[55px] w-auto max-w-[140px] sm:max-w-[220px] object-contain' />
          </div>
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
            <Undo className="w-4 h-4 rtl:-scale-x-100" />
          </button>
          <div className='w-px h-3 bg-[var(--border-main)] mx-0.5'></div>
          <button
            onClick={historyControls.onRedo}
            disabled={!historyControls.canRedo}
            className='p-1.5 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--card-bg)] rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent'
            dir='ltr'
            aria-label={t.redo}
          >
            <Redo className="w-4 h-4 rtl:-scale-x-100" />
          </button>
        </div>
      </div>
    );
  }
);
