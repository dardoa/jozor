import * as React from 'react';
import { X } from 'lucide-react';

import { Sidebar } from './Sidebar';
import { FamilyTree } from './FamilyTree';
import { TreeErrorBoundary } from './TreeErrorBoundary';
import { Header } from './Header';
import { ModalManagerContainer } from './ModalManagerContainer';
import ActivityLogDrawer from './ActivityLogDrawer';
import { OnboardingTour } from './OnboardingTour';
import { SettingsDrawer } from './ui/SettingsDrawer';
import { MobileActionBar } from './ui/MobileActionBar';
import { useAppStore } from '../store/useAppStore';
import {
  AppStateAndActions,
  ModalStateAndActions,
  GoogleSyncStateAndActions,
  WelcomeScreenLogicProps,
  HistoryControlsProps,
  ThemeLanguageProps,
  ViewSettingsProps,
  ToolsActionsProps,
  ExportActionsProps,
  SearchProps,
  FamilyActionsProps,
  AuthProps,
} from '../types';

interface AppLayoutProps {
  appState: AppStateAndActions;
  modals: ModalStateAndActions;
  googleSync: GoogleSyncStateAndActions;
  welcomeScreen: WelcomeScreenLogicProps;
  historyControls: HistoryControlsProps;
  themeLanguage: ThemeLanguageProps;
  viewSettings: ViewSettingsProps;
  toolsActions: ToolsActionsProps;
  exportActions: ExportActionsProps;
  searchProps: SearchProps;
  sidebarFamilyActions: FamilyActionsProps;
  coreFamilyActions: FamilyActionsProps;
  isPresentMode: boolean;
  setIsPresentMode: (v: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;
  auth: AuthProps;
  svgRef: React.RefObject<SVGSVGElement | null>;
  isActivityLogOpen: boolean;
  setActivityLogOpen: (v: boolean) => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  appState,
  modals,
  googleSync,
  welcomeScreen,
  historyControls,
  themeLanguage,
  viewSettings,
  toolsActions,
  exportActions,
  searchProps,
  sidebarFamilyActions,
  coreFamilyActions,
  isPresentMode,
  setIsPresentMode,
  sidebarOpen,
  setSidebarOpen,
  auth,
  svgRef,
  isActivityLogOpen,
  setActivityLogOpen,
}) => {
  const { people, focusId, setFocusId, activePerson } = appState;
  const { treeSettings } = viewSettings;
  const isExporting = useAppStore((state) => state.exportStatus?.isExporting);
  const isAdvancedBarOpen = useAppStore((state) => state.isAdvancedBarOpen);

  return (
    <>
      {!isPresentMode && (
        <Header
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          historyControls={historyControls}
          themeLanguage={themeLanguage}
          auth={auth}
          viewSettings={viewSettings}
          toolsActions={toolsActions}
          exportActions={exportActions}
          searchProps={searchProps}
        />
      )}

      {isPresentMode && (
        <button
          onClick={() => setIsPresentMode(false)}
          className='fixed top-4 right-4 z-[100] bg-black/50 text-white px-4 py-2 rounded-full backdrop-blur hover:bg-black/70 flex items-center gap-2'
        >
          <X className='w-4 h-4' /> Exit Present Mode
        </button>
      )}

      {!isPresentMode && googleSync.isSyncing && (
        <div
          className={`absolute top-16 start-1/2 -translate-x-1/2 z-50 text-white text-xs px-3 py-1 rounded-b-lg shadow-lg flex items-center gap-2 ${googleSync.isDemoMode ? 'bg-orange-500' : 'bg-[var(--primary-600)] animate-pulse'}`}
        >
          {googleSync.isDemoMode
            ? 'Saving locally...'
            : themeLanguage.language === 'ar'
              ? 'جاري المزامنة...'
              : 'Syncing...'}
        </div>
      )}

      {/* Export Progress Overlay */}
      {isExporting && (
        <div className='fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-300'>
          <div className='bg-[var(--theme-bg)] p-8 rounded-2xl shadow-2xl border border-[var(--border-main)] flex flex-col items-center gap-4 max-w-sm text-center'>
            <div className='w-12 h-12 border-4 border-[var(--primary-600)]/20 border-t-[var(--primary-600)] rounded-full animate-spin' />
            <div>
              <h3 className='font-bold text-lg mb-1'>
                {themeLanguage?.language === 'ar' ? 'جاري تصدير الملف...' : 'Generating Export...'}
              </h3>
              <p className='text-sm text-[var(--text-dim)]'>
                {themeLanguage?.language === 'ar'
                  ? 'برجاء الانتظار، يتم تصوير الشجرة بدقة عالية (300 DPI)...'
                  : 'Capturing High-Resolution (300 DPI) Family Tree Snapshot...'}
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className='flex flex-1 overflow-hidden relative transition-all duration-300'
      >
        {activePerson && !isPresentMode && (
          <div className='print:hidden h-full z-20 shadow-xl border-e border-[var(--border-main)]'>
            <Sidebar
              person={activePerson}
              people={people}
              onUpdate={appState.updatePerson}
              onDelete={appState.deletePerson}
              onSelect={setFocusId}
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              onOpenModal={toolsActions.onOpenModal}
              user={auth.user}
              familyActions={{
                onAddParent: (g) => modals.handleOpenLinkModal('parent', g),
                onAddSpouse: (g) => modals.handleOpenLinkModal('spouse', g),
                onAddChild: (g) => modals.handleOpenLinkModal('child', g),
                onRemoveRelationship: sidebarFamilyActions.onRemoveRelationship,
                onLinkPerson: sidebarFamilyActions.onLinkPerson,
              }}
              onOpenCleanTreeOptions={modals.onOpenCleanTreeOptions}
              settings={treeSettings}
            />
          </div>
        )}

        <TreeErrorBoundary>
          <FamilyTree
            people={people}
            focusId={focusId}
            onSelect={setFocusId}
            settings={treeSettings}
            svgRef={svgRef}
            onOpenModal={modals.handleOpenModal}
            activeModal={modals.activeModal}
            setSidebarOpen={setSidebarOpen}
            onOpenLinkModal={modals.handleOpenLinkModal}
            onPresent={viewSettings.onPresent}
            onOpenSnapshotHistory={viewSettings.onOpenSnapshotHistory}
            isSidebarOpen={sidebarOpen}
          />
        </TreeErrorBoundary>
      </div>

      <footer className='bg-[var(--theme-bg)]/80 backdrop-blur-md text-xs text-[var(--text-dim)] py-3 px-6 flex justify-center items-center gap-4 border-t border-[var(--border-main)] print:hidden'>
        <a
          href='/privacy-policy.html'
          target='_blank'
          rel='noopener noreferrer'
          className='hover:underline hover:text-[var(--primary-600)] transition-colors'
        >
          Privacy Policy
        </a>
        <span aria-hidden='true'>•</span>
        <a
          href='/terms-of-service.html'
          target='_blank'
          rel='noopener noreferrer'
          className='hover:underline hover:text-[var(--primary-600)] transition-colors'
        >
          Terms of Service
        </a>
        <span aria-hidden='true'>•</span>
        <a
          href='/help'
          onClick={(e) => {
            e.preventDefault();
            window.history.pushState({}, '', '/help');
            window.dispatchEvent(new PopStateEvent('popstate'));
          }}
          className='hover:underline hover:text-[var(--primary-600)] transition-colors'
        >
          {themeLanguage.language === 'ar' ? 'مركز المساعدة' : 'Help Center'}
        </a>
      </footer>

      <ActivityLogDrawer
        isOpen={isActivityLogOpen}
        onClose={() => setActivityLogOpen(false)}
        treeId={appState.currentTreeId || ''}
        onNavigate={appState.setFocusId}
      />

      <OnboardingTour sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <SettingsDrawer />

      {/* Mobile Action Bar */}
      {!isPresentMode && (
        <MobileActionBar
          onCenterView={() => {
            window.dispatchEvent(new CustomEvent('reset-interactive-view'));
          }}
          onOpenTools={() => {
            // Open a useful default tool on mobile (Statistics dashboard)
            toolsActions.onOpenModal('stats');
          }}
          onOpenAccount={() => {
            if (auth.user) {
              // Open global settings/account hub for signed-in users
              modals.onOpenGlobalSettings();
            } else {
              // Trigger unified login flow for guests
              auth.onOpenLoginModal();
            }
          }}
        />
      )}
    </>
  );
};
