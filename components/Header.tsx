import { memo } from 'react';
import { HeaderProps } from '../types';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../context/TranslationContext';

// Import sub-components
import { HeaderLeftSection } from './header/HeaderLeftSection';
import { HeaderRightSection } from './header/HeaderRightSection';

export const Header = memo<HeaderProps>(
  ({
    toggleSidebar,
    historyControls,
    themeLanguage,
    auth,
    viewSettings,
    toolsActions,
    exportActions,
    searchProps,
  }) => {
    const { t, language } = useTranslation();
    const isRtl = language === 'ar';
    const activeFile = auth.driveFiles.find((f) => f.id === auth.currentActiveDriveFileId) || null;
    const treeLabel = activeFile
      ? `${t.header.treeLabelPrefix}${activeFile.name}`
      : t.header.untitledTree;

    const role = viewSettings.currentUserRole;
    const roleLabelPrefix = t.header.roleLabelPrefix;
    const roleName =
      role === 'owner'
        ? t.header.roles.owner
        : role === 'editor'
          ? t.header.roles.editor
          : role === 'viewer'
            ? t.header.roles.viewer
            : t.header.roles.unknown;
    const roleLabel = `${roleLabelPrefix}${roleName}`;

    const syncState = auth.syncStatus.state;
    const syncStatusLabel =
      syncState === 'saving'
        ? t.header.syncStatus.saving
        : syncState === 'error'
          ? t.header.syncStatus.error
          : syncState === 'offline'
            ? t.header.syncStatus.offline
            : t.header.syncStatus.synced;
    const syncLabel = `${t.header.syncStatusPrefix}${syncStatusLabel}`;

    const syncColorClass =
      syncState === 'saving'
        ? 'text-amber-600'
        : syncState === 'error'
          ? 'text-red-600'
          : syncState === 'offline'
            ? 'text-[var(--text-muted)]'
            : 'text-emerald-600';

    const isLowGraphicsMode = useAppStore(state => state.treeSettings.isLowGraphicsMode);

    return (
      <header
        className={`h-14 md:h-16 bg-[var(--card-bg)]/80 flex items-center px-4 md:px-6 justify-between border-b border-[var(--border-main)] z-30 print:hidden transition-all shadow-sm sticky top-0 ${isLowGraphicsMode ? '' : 'backdrop-blur-md'}`}
        role='banner'
      >
        {/* Left Section */}
        <HeaderLeftSection
          themeLanguage={themeLanguage}
          toggleSidebar={toggleSidebar}
          historyControls={historyControls}
        />

        {/* Center Status Strip */}
        <div className='hidden lg:flex flex-1 justify-center px-4'>
          <div className='flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--theme-bg)]/70 border border-[var(--border-main)] shadow-sm text-[10px] font-medium text-[var(--text-dim)] max-w-xl overflow-hidden'>
            <span className='truncate'>
              {treeLabel}
            </span>
            <span aria-hidden='true'>•</span>
            <span className='truncate'>
              {roleLabel}
            </span>
            <span aria-hidden='true'>•</span>
            <span className={`truncate ${syncColorClass}`}>
              {syncLabel}
            </span>
            {auth.isDemoMode && (
              <>
                <span aria-hidden='true'>•</span>
                <span className='px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold'>
                  {t.header.demoMode}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Section */}
        <HeaderRightSection
          themeLanguage={themeLanguage}
          auth={auth}
          viewSettings={viewSettings}
          toolsActions={toolsActions}
          exportActions={exportActions}
          searchProps={searchProps}
        />
      </header>
    );
  }
);
