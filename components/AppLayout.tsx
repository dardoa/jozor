import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';

import { FamilyTree } from './FamilyTree';
import { TreeErrorBoundary } from './TreeErrorBoundary';
import { Header } from './Header';
import { SyncStatusRibbon } from './ui/SyncStatusRibbon';
import { PresentModeExitButton } from './ui/PresentModeExitButton';
import { AppOverlays } from './AppOverlays';
import { useAppStore, selectIsSyncing } from '../store/useAppStore';
import { useTranslation } from '../context/TranslationContext';
import { useTreeAppearanceAdapter } from '../hooks/useTreeAppearanceAdapter';
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
  onAddPerson: () => void;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  appState,
  modals,
  googleSync,
  welcomeScreen: _welcomeScreen,
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
  onAddPerson,
}) => {
  const navigate = useNavigate();
  const { people, focusId, setFocusId, activePerson } = appState;
  const { treeSettings: legacyTreeSettings } = viewSettings;
  const adapterPatch = useTreeAppearanceAdapter();

  const effectiveTreeSettings = React.useMemo(() => ({
    ...legacyTreeSettings,
    ...adapterPatch,
  }), [legacyTreeSettings, adapterPatch]);

  const currentUserRole = viewSettings.currentUserRole;
  const canEditActiveTree = currentUserRole === 'owner' || currentUserRole === 'editor';
  const isTreeOwner = currentUserRole === 'owner';
  const isSettingsDrawerOpen = useAppStore((state) => state.isSettingsDrawerOpen);
  const setSettingsDrawerOpen = useAppStore((state) => state.setSettingsDrawerOpen);
  const isDiagnosticsDrawerOpen = useAppStore((state) => state.isDiagnosticsDrawerOpen);
  const setDiagnosticsDrawerOpen = useAppStore((state) => state.setDiagnosticsDrawerOpen);
  const isTreeControlCenterOpen = useAppStore((state) => state.isTreeControlCenterOpen);
  const setTreeControlCenterOpen = useAppStore((state) => state.setTreeControlCenterOpen);
  const setNodeContextMenu = useAppStore((state) => state.setNodeContextMenu);
  const setVaultOpen = useAppStore((state) => state.setVaultOpen);
  const setVaultTab = useAppStore((state) => state.setVaultTab);
  const isSyncing = useAppStore(selectIsSyncing);
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const isActivityLogOpen = useAppStore((state) => state.isActivityLogOpen);
  const setActivityLogOpen = useAppStore((state) => state.setActivityLogOpen);

  const { t, language } = useTranslation();

  const focusAndNavigate = React.useCallback(
    (personId: string) => {
      setFocusId(personId);
      navigate(`/person/${personId}`);
    },
    [navigate, setFocusId]
  );

  const handleNodeContextMenu = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    focusAndNavigate(id);
    setNodeContextMenu({
      personId: id,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const openTreeControlCenter = React.useCallback(() => {
    setTreeControlCenterOpen(true);
  }, [setTreeControlCenterOpen]);

  const openVaultTab = React.useCallback((tab: 'trees' | 'members' | 'security' | 'cloud' | 'stats') => {
    setTreeControlCenterOpen(false);
    setSettingsDrawerOpen(false);
    setVaultTab(tab);
    setVaultOpen(true);
  }, [setSettingsDrawerOpen, setTreeControlCenterOpen, setVaultOpen, setVaultTab]);

  const openAppearanceLab = React.useCallback(() => {
    setTreeControlCenterOpen(false);
    setVaultOpen(false);
    setSettingsDrawerOpen(true);
  }, [setSettingsDrawerOpen, setTreeControlCenterOpen, setVaultOpen]);

  const openAddPersonModal = React.useCallback(() => {
    if (focusId) {
      modals.handleOpenLinkModal('child', 'male', { initialMode: 'create' });
      return;
    }

    onAddPerson();
  }, [focusId, modals, onAddPerson]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t.skipToMainContent}
      </a>
      {!isPresentMode && (
        <Header
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          hasActivePerson={!!activePerson}
          historyControls={historyControls}
          themeLanguage={themeLanguage}
          auth={auth}
          viewSettings={viewSettings}
          toolsActions={toolsActions}
          exportActions={exportActions}
          searchProps={searchProps}
          globalActions={{
            onOpenTreeControlCenter: openTreeControlCenter,
            onOpenGlobalSettings: modals.onOpenGlobalSettings,
            onOpenDiagnostics: () => setDiagnosticsDrawerOpen(true),
            onOpenShare: () => openVaultTab('members'),
            onOpenCleanTree: modals.onOpenCleanTreeOptions,
            onOpenTreeManager: auth.onOpenTreeManager,
            onOpenDriveFileManager: auth.onOpenDriveFileManager,
            onOpenSnapshotHistory: modals.onOpenSnapshotHistory,
            onOpenActivityLog: () => setActivityLogOpen(true),
          }}
        />
      )}

      {isPresentMode && <PresentModeExitButton onExit={() => setIsPresentMode(false)} />}

      {!isPresentMode && (
          <SyncStatusRibbon isSyncing={isSyncing} isDemoMode={isDemoMode} />
      )}

      <main
        id="main-content"
        className='flex flex-1 overflow-hidden relative transition-all duration-300'
        role="main"
      >
        <TreeErrorBoundary>
          <FamilyTree
            people={people}
            focusId={focusId}
            onSelect={focusAndNavigate}
            settings={effectiveTreeSettings}
            onOpenPreferences={openAppearanceLab}
            hasBlockingOverlay={sidebarOpen || isSettingsDrawerOpen || isDiagnosticsDrawerOpen || isTreeControlCenterOpen}
            ref={svgRef}
            activeModal={modals.activeModal}
            setSidebarOpen={setSidebarOpen}
            onOpenLinkModal={modals.handleOpenLinkModal}
            onPresent={viewSettings.onPresent}
            onOpenSnapshotHistory={viewSettings.onOpenSnapshotHistory}
            isSidebarOpen={sidebarOpen}
            onAddFirstPerson={coreFamilyActions.onAddFirstPerson}
            onNodeContextMenu={handleNodeContextMenu}
          />
        </TreeErrorBoundary>
      </main>

      {/* Footer links are moved out of the main canvas layout to maximize tree workspace.
          They are now available from the help section instead of occupying vertical space here. */}

      <AppOverlays
        appState={appState}
        modals={modals}
        googleSync={googleSync}
        viewSettings={viewSettings}
        toolsActions={toolsActions}
        sidebarFamilyActions={sidebarFamilyActions}
        auth={auth}
        isPresentMode={isPresentMode}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        focusAndNavigate={focusAndNavigate}
        openVaultTab={openVaultTab}
        openAppearanceLab={openAppearanceLab}
        openAddPersonModal={openAddPersonModal}
        effectiveTreeSettings={effectiveTreeSettings}
        canEditActiveTree={canEditActiveTree}
        isTreeOwner={isTreeOwner}
      />
      <Toaster richColors position="bottom-center" dir={language === 'ar' ? 'rtl' : 'ltr'} />
    </>
  );
};
