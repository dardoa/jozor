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
    const { t } = useTranslation();
    const isSettingsDrawerOpen = useAppStore(state => state.isSettingsDrawerOpen);
    const setSettingsDrawerOpen = useAppStore(state => state.setSettingsDrawerOpen);
    const isRtl = themeLanguage.language === 'ar';

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


        {/* Auth Section */}
        <div className='hidden sm:flex items-center gap-2'>
          {auth.user ? (
            <>
              {/* Advanced HUD Toggle - Universal Visualization Controls */}
              <Tooltip content={isRtl ? 'تفضيلات العرض' : 'Visual Preferences'} position="bottom">
                <button
                  onClick={() => setSettingsDrawerOpen(!isSettingsDrawerOpen)}
                  className={`p-2.5 rounded-xl hover:bg-[var(--card-bg)] hover:shadow-lg active:scale-95 transition-all duration-300 group border border-transparent hover:border-[var(--border-main)] ${isSettingsDrawerOpen ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]' : ''}`}
                >
                  <SlidersHorizontal className={`w-5 h-5 transition-all duration-300 ${isSettingsDrawerOpen ? 'text-amber-500 scale-110' : 'text-[var(--text-main)] group-hover:scale-110'}`} />
                </button>
              </Tooltip>

              {/* Admin Hub (Gear) - Primary Management (Role-Locked) */}
              {viewSettings.currentUserRole === 'owner' && (
                <Tooltip content={isRtl ? 'مركز الإدارة' : 'Admin Hub'} position="bottom">
                  <button
                    onClick={() => viewSettings.onOpenAdminHub?.()}
                    className='p-2.5 rounded-xl hover:bg-[var(--card-bg)] hover:shadow-lg active:scale-95 transition-all duration-300 group border border-transparent hover:border-[var(--border-main)]'
                  >
                    <Settings className='w-5 h-5 text-[var(--text-main)] group-hover:rotate-90 transition-transform duration-500' />
                  </button>
                </Tooltip>
              )}

              {/* Tools Menu - Analysis & Insights */}
              <Tooltip content={isRtl ? 'الأدوات' : 'Tools'} position="bottom">
                <Dropdown
                  trigger={
                    <button
                      type='button'
                      className='p-2.5 rounded-xl hover:bg-[var(--card-bg)] hover:shadow-lg active:scale-95 transition-all duration-300 group border border-transparent hover:border-[var(--border-main)]'
                    >
                      <Wrench className='w-5 h-5 text-[var(--text-main)] group-hover:text-[var(--primary-500)] transition-colors' />
                    </button>
                  }
                  align={isRtl ? 'start' : 'end'}
                >
                  <ToolsMenu
                    onOpenModal={toolsActions.onOpenModal}
                  />
                </Dropdown>
              </Tooltip>

              {/* Export Menu - Downloads & Sharing */}
              <Tooltip content={isRtl ? 'تصدير' : 'Export'} position="bottom">
                <Dropdown
                  trigger={
                    <button
                      type='button'
                      className='p-2.5 rounded-xl hover:bg-[var(--card-bg)] hover:shadow-lg active:scale-95 transition-all duration-300 group border border-transparent hover:border-[var(--border-main)]'
                    >
                      <Download className='w-5 h-5 text-[var(--text-main)] group-hover:text-[var(--primary-500)] transition-colors' />
                    </button>
                  }
                  align={isRtl ? 'start' : 'end'}
                >
                  <ExportMenu
                    onExport={exportActions.handleExport}
                  />
                </Dropdown>
              </Tooltip>

              {/* User Account Menu */}
              <Dropdown
                trigger={
                  <button
                    id="user-menu-trigger"
                    type='button'
                    className='flex items-center gap-2 p-1 pe-2 rounded-full border border-[var(--border-main)] bg-[var(--theme-bg)] hover:bg-[var(--theme-hover)] transition-all active:scale-95'
                  >
                    <div className='w-7 h-7 rounded-full bg-gradient-to-br from-[var(--primary-600)] to-[var(--primary-400)] flex items-center justify-center text-white text-[10px] font-bold overflow-hidden shadow-sm'>
                      {auth.user.photoURL ? (
                        <img
                          src={auth.user.photoURL}
                          alt='Avatar'
                          className='w-full h-full object-cover'
                        />
                      ) : (
                        (auth.user.displayName || auth.user.email || 'U')[0].toUpperCase()
                      )}
                    </div>
                    <ChevronDown className='w-3 h-3 text-[var(--text-dim)]' />
                  </button>
                }
                align='end'
              >
                <UserMenu
                  onLogout={auth.onLogout}
                  onOpenDriveFileManager={auth.onOpenDriveFileManager}
                  onOpenTreeManager={auth.onOpenTreeManager}
                />
              </Dropdown>
            </>
          ) : (
            <>
              <Dropdown
                trigger={
                  <button
                    className='w-9 h-9 rounded-full flex items-center justify-center hover:bg-[var(--theme-hover)] text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors'
                    aria-label={t.settings}
                  >
                    <Settings className='w-4 h-4' />
                  </button>
                }
                align='end'
              >
                <GuestMenu
                  themeLanguage={themeLanguage}
                  onLogin={auth.onOpenLoginModal}
                />
              </Dropdown>
              <LoginButton onLogin={auth.onOpenLoginModal} label={t.loginGoogle} />
            </>
          )}
        </div>

      </div >
    );
  }
);
