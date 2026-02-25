import { memo } from 'react';
import { HeaderProps } from '../types';
import { useAppStore } from '../store/useAppStore';

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
    const isLowGraphicsMode = useAppStore(state => state.treeSettings.isLowGraphicsMode);

    const isRtl = themeLanguage.language === 'ar';
    const activeFile = auth.driveFiles.find((f) => f.id === auth.currentActiveDriveFileId) || null;
    const treeLabel = activeFile
      ? (isRtl ? `الشجرة: ${activeFile.name}` : `Tree: ${activeFile.name}`)
      : (isRtl ? 'شجرة غير مسماة' : 'Untitled tree');

    const role = viewSettings.currentUserRole;
    const roleLabel =
      role === 'owner'
        ? (isRtl ? 'دورك: مالك الشجرة' : 'Role: Tree owner')
        : role === 'editor'
          ? (isRtl ? 'دورك: محرّر' : 'Role: Editor')
          : role === 'viewer'
            ? (isRtl ? 'دورك: مشاهد' : 'Role: Viewer')
            : (isRtl ? 'دورك: غير محدد' : 'Role: Unknown');

    const syncState = auth.syncStatus.state;
    const syncLabel =
      syncState === 'saving'
        ? (isRtl ? 'الحالة: جارٍ الحفظ' : 'Status: Saving…')
        : syncState === 'error'
          ? (isRtl ? 'الحالة: خطأ في المزامنة' : 'Status: Sync error')
          : syncState === 'offline'
            ? (isRtl ? 'الحالة: غير متصل' : 'Status: Offline')
            : (isRtl ? 'الحالة: متزامن' : 'Status: Synced');

    const syncColorClass =
      syncState === 'saving'
        ? 'text-amber-600'
        : syncState === 'error'
          ? 'text-red-600'
          : syncState === 'offline'
            ? 'text-[var(--text-muted)]'
            : 'text-emerald-600';

    return (
      <header
        className={`h-16 bg-[var(--card-bg)]/80 flex items-center px-4 md:px-6 justify-between border-b border-[var(--border-main)] z-30 print:hidden transition-all shadow-sm sticky top-0 ${isLowGraphicsMode ? '' : 'backdrop-blur-md'}`}
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
                  {isRtl ? 'وضع تجريبي' : 'Demo mode'}
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
