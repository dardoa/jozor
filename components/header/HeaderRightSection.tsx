import React, { memo } from 'react';
import { ChevronDown, SlidersHorizontal, Settings, Wrench, Download } from 'lucide-react';
import { LoginButton } from '../LoginButton';
import { UserMenu } from './UserMenu';
import { GuestMenu } from './GuestMenu';
import { SearchInputWithResults } from './SearchInputWithResults';
import { Dropdown } from '../ui/Dropdown';
import { useTranslation } from '../../context/TranslationContext';
import { HeaderRightSectionProps } from '../../types';
import { SyncStatusIndicator } from '../SyncStatusIndicator';
import { useAppStore } from '../../store/useAppStore';
import { Tooltip } from '../ui/Tooltip';
import { ToolsMenu } from './ToolsMenu';
import { ExportMenu } from './ExportMenu';

export const HeaderRightSection: React.FC<HeaderRightSectionProps> = memo(
  ({ themeLanguage, auth, viewSettings, toolsActions, exportActions, searchProps }) => {
    const { t, language } = useTranslation();
    const isSettingsDrawerOpen = useAppStore(state => state.isSettingsDrawerOpen);
    const setSettingsDrawerOpen = useAppStore(state => state.setSettingsDrawerOpen);

    return (
      <div
        className='flex items-center gap-2 md:gap-3'
        role='navigation'
        aria-label={t.mainNavigation}
      >
        {/* Search */}
        <SearchInputWithResults
          people={searchProps.people}
          onFocusPerson={searchProps.onFocusPerson}
        />

        <div
          className='h-6 w-px bg-[var(--border-main)] hidden lg:block mx-1'
          aria-hidden='true'
        ></div>

        {/* Sync Status Indicator */}
        <div className="hidden sm:block">
          <SyncStatusIndicator />
        </div>

        <div
          className='h-6 w-px bg-[var(--border-main)] hidden lg:block mx-1'
          aria-hidden='true'
        ></div>


        {/* Auth Section - Always visible now, with sm: gap adjustments */}
        <div className='flex items-center gap-1 sm:gap-2'>
          {auth.user ? (
            <>
              {/* Advanced HUD Toggle - Universal Visualization Controls (Desktop Only) */}
              <Tooltip content={t.header.tooltips.visualPreferences} position="bottom">
                <button
                  onClick={() => setSettingsDrawerOpen(!isSettingsDrawerOpen)}
                  className={`hidden sm:block p-2.5 rounded-xl hover:bg-[var(--card-bg)] hover:shadow-lg active:scale-95 transition-all duration-300 group border border-transparent hover:border-[var(--border-main)] ${isSettingsDrawerOpen ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : ''}`}
                >
                  <SlidersHorizontal className={`w-5 h-5 transition-all duration-300 ${isSettingsDrawerOpen ? 'text-amber-500 scale-110' : 'text-[var(--text-main)] group-hover:scale-110'}`} />
                </button>
              </Tooltip>

              {/* Admin Hub (Gear) - Primary Management (Desktop Only, Action Bar handles mobile) */}
              {viewSettings.currentUserRole === 'owner' && (
                <Tooltip content={t.header.tooltips.adminHub} position="bottom">
                  <button
                    onClick={() => viewSettings.onOpenAdminHub?.()}
                    className='hidden sm:block p-2.5 rounded-xl hover:bg-[var(--card-bg)] hover:shadow-lg active:scale-95 transition-all duration-300 group border border-transparent hover:border-[var(--border-main)]'
                  >
                    <Settings className='w-5 h-5 text-[var(--text-main)] group-hover:rotate-90 transition-transform duration-500' />
                  </button>
                </Tooltip>
              )}

              {/* Tools Menu - Analysis & Insights (Desktop Only, Action Bar handles mobile) */}
              <Tooltip content={t.header.tooltips.tools} position="bottom">
                <Dropdown
                  trigger={
                    <button
                      type='button'
                      className='hidden sm:block p-2.5 rounded-xl hover:bg-[var(--card-bg)] hover:shadow-lg active:scale-95 transition-all duration-300 group border border-transparent hover:border-[var(--border-main)]'
                    >
                      <Wrench className='w-5 h-5 text-[var(--text-main)] group-hover:text-[var(--primary-500)] transition-colors' />
                    </button>
                  }
                  align={t.dropdownAlign.start}
                >
                  <ToolsMenu
                    onOpenModal={toolsActions.onOpenModal}
                  />
                </Dropdown>
              </Tooltip>

              {/* Export Menu - Downloads & Sharing (Desktop Only) */}
              <Tooltip content={t.header.tooltips.export} position="bottom">
                <Dropdown
                  trigger={
                    <button
                      type='button'
                      className='hidden sm:block p-2.5 rounded-xl hover:bg-[var(--card-bg)] hover:shadow-lg active:scale-95 transition-all duration-300 group border border-transparent hover:border-[var(--border-main)]'
                    >
                      <Download className='w-5 h-5 text-[var(--text-main)] group-hover:text-[var(--primary-500)] transition-colors' />
                    </button>
                  }
                  align={t.dropdownAlign.start}
                >
                  <ExportMenu
                    onExport={exportActions.handleExport}
                  />
                </Dropdown>
              </Tooltip>

              {/* User Account Menu - ALWAYS VISIBLE */}
              <Dropdown
                trigger={
                  <button
                    id="user-menu-trigger"
                    type='button'
                    className='flex items-center gap-1.5 p-1 sm:pe-2 rounded-full border border-[var(--border-main)] bg-[var(--theme-bg)] hover:bg-[var(--theme-hover)] transition-all active:scale-95'
                  >
                    <div className='w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-400)] flex items-center justify-center text-white text-[10px] sm:text-[9px] font-bold overflow-hidden shadow-sm'>
                      {auth.user.photoURL ? (
                        <img
                          src={auth.user.photoURL}
                          alt='Avatar'
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        (auth.user.displayName || auth.user.email)[0].toUpperCase()
                      )}
                    </div>
                    <ChevronDown className='w-3 h-3 text-[var(--text-dim)] hidden sm:block' />
                  </button>
                }
                align='end'
              >
                <UserMenu
                  onLogout={auth.onLogout}
                  onBackupNow={auth.onSaveToGoogleDrive}
                  onOpenDriveFileManager={auth.onOpenDriveFileManager}
                  onOpenTreeManager={auth.onOpenTreeManager}
                />
              </Dropdown>
            </>
          ) : (
            <>
              {/* Guest / Settings - ALWAYS VISIBLE */}
              <Dropdown
                trigger={
                  <button
                    className='w-11 h-11 sm:w-9 sm:h-9 rounded-full flex items-center justify-center hover:bg-[var(--theme-hover)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors border border-[var(--border-main)] sm:border-transparent'
                    aria-label={t.settings}
                  >
                    <Settings className='w-5 h-5 sm:w-4 sm:h-4' />
                  </button>
                }
                align='end'
              >
                <GuestMenu
                  themeLanguage={themeLanguage}
                  onLogin={auth.onOpenLoginModal}
                />
              </Dropdown>
              <div className="hidden sm:block">
                <LoginButton onLogin={auth.onOpenLoginModal} label={t.loginGoogle} />
              </div>
            </>
          )}
        </div>

      </div >
    );
  }
);
