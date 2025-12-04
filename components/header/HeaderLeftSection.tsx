import React, { memo } from 'react';
import { Undo, Redo, Menu } from 'lucide-react';
import { Logo } from '../Logo';
import { HeaderLeftSectionProps } from '../../types'; // Import HeaderLeftSectionProps
import { useTranslation } from '../../context/TranslationContext'; // Import useTranslation

export const HeaderLeftSection: React.FC<HeaderLeftSectionProps> = memo(({
  themeLanguage, // Changed to grouped prop
  toggleSidebar, historyControls
}) => {
  const { t } = useTranslation(); // Use useTranslation hook directly

  // Removed handleLanguageToggle as it's no longer used here.

  return (
    <div className="flex items-center gap-3 md:gap-6">
      <button onClick={toggleSidebar} className="md:hidden p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors" aria-label={t.toggleSidebar}>
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-3 select-none cursor-pointer group" onClick={() => window.location.reload()}>
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/30 p-2 rounded-xl border border-teal-200/50 dark:border-teal-700/50 shadow-sm hidden md:block group-hover:scale-105 transition-transform">
          <Logo className="w-6 h-6 text-teal-600 dark:text-teal-400" />
        </div>
        <h1 className="text-xl font-bold tracking-tight font-sans text-stone-900 dark:text-stone-100">{t.appTitle}</h1>
      </div>
      
      {/* History Controls */}
      <div className="hidden sm:flex items-center p-1 bg-stone-100/50 dark:bg-stone-800/50 rounded-full border border-stone-200/50 dark:border-stone-700/50 backdrop-blur-sm">
        <button onClick={historyControls.onUndo} disabled={!historyControls.canUndo} className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-white dark:hover:bg-stone-700 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent" dir="ltr" aria-label={t.undo}>
          <Undo className={`w-4 h-4 ${themeLanguage.language === 'ar' ? 'scale-x-[-1]' : ''}`} />
        </button>
        <div className="w-px h-3 bg-stone-300 dark:bg-stone-600 mx-0.5"></div>
        <button onClick={historyControls.onRedo} disabled={!historyControls.canRedo} className="p-1.5 text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-white dark:hover:bg-stone-700 rounded-full transition-all disabled:opacity-30 disabled:hover:bg-transparent" dir="ltr" aria-label={t.redo}>
          <Redo className={`w-4 h-4 ${themeLanguage.language === 'ar' ? 'scale-x-[-1]' : ''}`} />
        </button>
      </div>
    </div>
  );
});