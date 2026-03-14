import * as React from 'react';
import { X } from 'lucide-react';
import { EMPTY_STRING } from '../constants';

import { Sidebar } from './Sidebar';
import { FamilyTree } from './FamilyTree';
import { TreeErrorBoundary } from './TreeErrorBoundary';
import { Header } from './Header';
import { ModalManagerContainer } from './ModalManagerContainer';
import ActivityLogDrawer from './ActivityLogDrawer';
import { OnboardingTour } from './OnboardingTour';
import { SettingsDrawer } from './ui/SettingsDrawer';
import { MobileActionBar } from './ui/MobileActionBar';
import { ExportProgressOverlay } from './ui/ExportProgressOverlay';
import { SyncStatusRibbon } from './ui/SyncStatusRibbon';
import { PresentModeExitButton } from './ui/PresentModeExitButton';
import { ConfirmationModal } from './ConfirmationModal';
import { useAppStore } from '../store/useAppStore';
import { useTranslation } from '../context/TranslationContext';
import { showSuccess } from '../utils/toast';
import { Link } from 'react-router-dom';
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
  const isSettingsDrawerOpen = useAppStore((state) => state.isSettingsDrawerOpen);
  const setSettingsDrawerOpen = useAppStore((state) => state.setSettingsDrawerOpen);

  const { t } = useTranslation();
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const handleDeleteConfirm = () => {
    if (activePerson) {
      appState.deletePerson(activePerson.id);
      showSuccess(t.personDeletedSuccess);
    }
    setDeleteModalOpen(false);
    setSidebarOpen(false);
  };

  const triggerDelete = () => setDeleteModalOpen(true);

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

      {isPresentMode && <PresentModeExitButton onExit={() => setIsPresentMode(false)} />}

      {!isPresentMode && <SyncStatusRibbon isSyncing={googleSync.isSyncing} isDemoMode={googleSync.isDemoMode} />}

      <ExportProgressOverlay />

      <div
        className='flex flex-1 overflow-hidden relative transition-all duration-300'
      >
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
            onAddFirstPerson={coreFamilyActions.onAddFirstPerson}
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
          {t.general.footer.privacyPolicy}
        </a>
        <span aria-hidden='true'>•</span>
        <a
          href='/terms-of-service.html'
          target='_blank'
          rel='noopener noreferrer'
          className='hover:underline hover:text-[var(--primary-600)] transition-colors'
        >
          {t.general.footer.termsOfService}
        </a>
        <span aria-hidden='true'>•</span>
        <Link
          to='/help'
          className='hover:underline hover:text-[var(--primary-600)] transition-colors'
        >
          {t.general.footer.helpCenter}
        </Link>
      </footer>

      <ActivityLogDrawer
        isOpen={isActivityLogOpen}
        onClose={() => setActivityLogOpen(false)}
        treeId={appState.currentTreeId || EMPTY_STRING}
        onNavigate={appState.setFocusId}
      />

      <OnboardingTour sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      {/* Sidebar - Moved to root level for true portal layering */}
      {activePerson && !isPresentMode && (
         <Sidebar
         person={activePerson}
         people={people}
         onUpdate={appState.updatePerson}
         onDelete={triggerDelete}
         onSelect={setFocusId}
         isOpen={sidebarOpen}
         onClose={() => setSidebarOpen(false)}
         onOpenModal={toolsActions.onOpenModal}
         user={auth.user}
         familyActions={{
           onAddParent: (g) => modals.handleOpenLinkModal('parent', g),
           onAddSpouse: (g) => modals.handleOpenLinkModal('spouse', g),
           onAddChild: (g) => modals.handleOpenLinkModal('child', g),
           onAddFirstPerson: (g) => sidebarFamilyActions.onAddFirstPerson(g),
           onRemoveRelationship: sidebarFamilyActions.onRemoveRelationship,
           onLinkPerson: sidebarFamilyActions.onLinkPerson,
         }}
         onOpenCleanTreeOptions={modals.onOpenCleanTreeOptions}
         settings={treeSettings}
       />
      )}

      <SettingsDrawer />

      {/* Mobile Action Bar */}
      {!isPresentMode && (
        <MobileActionBar
          activeTab={
            sidebarOpen ? null : // Hide highlight on bottom icons if profile is open
              isSettingsDrawerOpen ? 'tools' : // This is for visualization settings
                null
          }
          onCenterView={() => {
            window.dispatchEvent(new CustomEvent('reset-interactive-view'));
          }}
          onOpenAdmin={() => {
            viewSettings.onOpenAdminHub?.();
          }}
          onOpenTools={() => {
            setSettingsDrawerOpen(true);
          }}
          onDelete={() => {
            if (activePerson) triggerDelete();
          }}
        />
      )}

      {activePerson && (
        <ConfirmationModal
          isOpen={deleteModalOpen}
          onClose={() => setDeleteModalOpen(false)}
          onConfirm={handleDeleteConfirm}
          title={t.deletePerson}
          message={`${t.personDeleteConfirm} (${activePerson.firstName} ${activePerson.lastName})`}
        />
      )}
    </>
  );
};
