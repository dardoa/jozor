import React, { memo } from 'react';
import {
  Moon, Sun, ChevronDown, Share2, Hammer, SlidersHorizontal
} from 'lucide-react';
import { LoginButton } from '../LoginButton';
import { ExportMenu } from './ExportMenu';
import { ToolsMenu } from './ToolsMenu';
import { ViewSettingsMenu } from './ViewSettingsMenu';
import { UserMenu } from './UserMenu';
import { SearchInputWithResults } from './SearchInputWithResults';
import { Dropdown } from '../ui/Dropdown';
import { useTranslation } from '../../context/TranslationContext';
import { HeaderRightSectionProps } from '../../types';

export const HeaderRightSection: React.FC<HeaderRightSectionProps> = memo(({
  themeLanguage, auth, viewSettings, toolsActions, exportActions,
  searchProps
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-2 md:gap-3">
      {/* Search */}
      <SearchInputWithResults people={searchProps.people} onFocusPerson={searchProps.onFocusPerson} />

      <div className="h-6 w-px bg-stone-200 dark:bg-stone-800 hidden md:block mx-1"></div>

      {/* Share Button */}
      {auth.user && (
        <button 
          onClick={() => toolsActions.onOpenModal('share')}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-all bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-900/40"
          title={t.shareTree}
          aria-label={t.shareTree}
        >
          <Share2 className="w-4 h-4" />
        </button>
      )}
      
      {/* Tools Dropdown */}
      <Dropdown
        trigger={
          <button
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 dark:text-stone-400`}
            aria-label={t.tools}
          >
            <Hammer className="w-4 h-4" />
          </button>
        }
        align="end"
      >
        <ToolsMenu
          onOpenModal={toolsActions.onOpenModal}
        />
      </Dropdown>

      {/* View Settings Dropdown */}
      <Dropdown
        trigger={
          <button
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all border hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 border-transparent`}
            aria-label={t.viewOptions}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        }
        align="end"
      >
        <ViewSettingsMenu
          settings={viewSettings.treeSettings}
          onUpdate={viewSettings.setTreeSettings}
          onPresent={() => { viewSettings.onPresent(); }}
        />
      </Dropdown>

      <div className="hidden sm:flex items-center gap-1">
        <button onClick={() => {
            const newLanguage = themeLanguage.language === 'en' ? 'ar' : 'en';
            themeLanguage.setLanguage(newLanguage);
          }} className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 flex items-center justify-center font-bold text-[10px]" aria-label={themeLanguage.language === 'en' ? 'Switch to Arabic' : 'Switch to English'}>{themeLanguage.language === 'en' ? 'AR' : 'EN'}</button>
        <button onClick={() => themeLanguage.setDarkMode(!themeLanguage.darkMode)} className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-500 flex items-center justify-center" aria-label={themeLanguage.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>{themeLanguage.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}</button>
      </div>

      {/* Auth Section */}
      <div className="hidden sm:block">
        {auth.user ? (
          <Dropdown
            trigger={
              <button className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors border border-transparent hover:border-stone-200 dark:hover:border-stone-700" aria-label={t.welcomeUser}>
                <img src={auth.user.photoURL} alt={auth.user.displayName} className="w-7 h-7 rounded-full object-cover border border-stone-200 dark:border-stone-600" />
              </button>
            }
            align="end"
          >
            <UserMenu user={auth.user} isDemoMode={auth.isDemoMode} onLogout={auth.onLogout} />
          </Dropdown>
        ) : (
          <LoginButton onLogin={auth.onLogin} label={t.loginGoogle} />
        )}
      </div>

      {/* Export Dropdown */}
      <div className="relative hidden md:block">
        <Dropdown
          trigger={
            <button className="px-5 py-2 text-xs font-semibold bg-stone-900 dark:bg-teal-600 text-white rounded-full shadow-lg flex items-center gap-2" aria-label={t.export}>
              <span>{t.export}</span> <ChevronDown className="w-3 h-3 opacity-70"/>
            </button>
          }
          align="end"
        >
          <ExportMenu
            onExport={exportActions.handleExport}
          />
        </Dropdown>
      </div>
    </div>
  );
});