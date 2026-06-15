import { memo } from 'react';
import { HeaderProps } from '../../types';
import { selectCanonicalSyncState, useAppStore } from '../../store/useAppStore';
import { useTranslation } from '../../context/TranslationContext';

// Import sub-components
import { HeaderLeftSection } from './HeaderLeftSection';
import { HeaderRightSection } from './HeaderRightSection';

export const Header = memo<HeaderProps>(
  ({
    toggleDetailsPanel,
    detailsPanelOpen,
    hasActivePerson,
    historyControls,
    themeLanguage,
    auth,
    viewSettings,
    searchProps,
    globalActions,
  }) => {
    const { t } = useTranslation();
    const currentTreeId = useAppStore((state) => state.currentTreeId);
    const currentTreeName = useAppStore((state) => state.treeName);
    const isLowGraphicsMode = useAppStore(state => state.isLowGraphicsMode);
    const syncState = useAppStore(selectCanonicalSyncState);
    const activeFile = auth.driveFiles.find((f) => f.id === auth.currentActiveDriveFileId) || null;
    const resolvedTreeName = currentTreeId && currentTreeName.trim()
      ? currentTreeName
      : activeFile?.name || t.untitledTree;
    const treeLabel = `${t.treeLabelPrefix}${resolvedTreeName}`;

    const role = viewSettings.currentUserRole;
    const roleLabelPrefix = t.roleLabelPrefix;
    const roleName =
      role === 'owner'
        ? t.roles.owner
        : role === 'editor'
          ? t.roles.editor
          : role === 'viewer'
            ? t.roles.viewer
            : t.roles.unknown;
    const roleLabel = `${roleLabelPrefix}${roleName}`;

    const syncStatusLabel =
      syncState === 'checking'
        ? (t.syncStatus.checking || t.loading)
        : syncState === 'saving'
        ? t.syncStatus.saving
        : syncState === 'error'
          ? t.syncStatus.error
          : syncState === 'offline'
            ? t.syncStatus.offline
            : t.syncStatus.synced;
    const syncLabel = `${t.syncStatusPrefix}${syncStatusLabel}`;

    const syncColorClass =
      syncState === 'checking'
        ? 'text-[var(--text-muted)]'
        : syncState === 'saving'
        ? 'text-amber-600'
        : syncState === 'error'
          ? 'text-red-600'
          : syncState === 'offline'
            ? 'text-[var(--text-muted)]'
            : 'text-emerald-600';

    return (
      <header
        className={`h-14 md:h-16 bg-[var(--card-bg)]/80 flex items-center px-4 md:px-6 justify-between border-b border-[var(--border-main)] z-[var(--z-index-nav)] print:hidden transition-all shadow-sm sticky top-0 ${isLowGraphicsMode ? '' : 'backdrop-blur-md'}`}
        role='banner'
      >
        {/* Left Section */}
        <HeaderLeftSection
          themeLanguage={themeLanguage}
          toggleDetailsPanel={toggleDetailsPanel}
          detailsPanelOpen={detailsPanelOpen}
          hasActivePerson={hasActivePerson}
          historyControls={historyControls}
        />

        {/* Center Status Strip */}
        <div className='hidden lg:flex flex-1 justify-center px-2 xl:px-4'>
          <div className='flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--theme-surface)]/60 border border-[var(--border-main)] shadow-[var(--shadow-sm)] text-[11px] font-medium text-[var(--text-dim)] max-w-[34rem] overflow-hidden xl:max-w-xl xl:px-4'>
            <span className='truncate'>
              {treeLabel}
            </span>
            <span aria-hidden='true' className='opacity-45'>&middot;</span>
            <span className='truncate'>
              {roleLabel}
            </span>
            <span aria-hidden='true' className='opacity-45'>&middot;</span>
            <span className={`truncate ${syncColorClass}`}>
              {syncLabel}
            </span>
            {auth.isDemoMode && (
              <>
                <span aria-hidden='true' className='opacity-45'>&middot;</span>
                <span className='px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 font-semibold shadow-[var(--shadow-sm)]'>
                  {t.demoMode}
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
          searchProps={searchProps}
          globalActions={globalActions}
        />
      </header>
    );
  }
);
