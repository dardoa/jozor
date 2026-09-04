import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'sonner';

import { FamilyTree } from './tree/FamilyTree';
import { TreeErrorBoundary } from './TreeErrorBoundary';
import { Header } from './header/Header';
import { SyncStatusRibbon } from './ui/SyncStatusRibbon';
import { PresentModeExitButton } from './ui/PresentModeExitButton';
import { AppOverlays } from './AppOverlays';
import { useAppStore, selectIsSyncing } from '../store/useAppStore';
import { useTranslation } from '../context/TranslationContext';
import { useTreeAppearanceAdapter } from '../hooks/utils/useTreeAppearanceAdapter';
import { useTreePermissions } from '../hooks/tree/useTreePermissions';
import { isHelpActionId } from '../features/help/helpKnowledgeBase';
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
  detailsPanelFamilyActions: FamilyActionsProps;
  coreFamilyActions: FamilyActionsProps;
  isPresentMode: boolean;
  setIsPresentMode: (v: boolean) => void;
  detailsPanelOpen: boolean;
  setDetailsPanelOpen: (v: boolean) => void;
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
  detailsPanelFamilyActions,
  coreFamilyActions,
  isPresentMode,
  setIsPresentMode,
  detailsPanelOpen,
  setDetailsPanelOpen,
  auth,
  svgRef,
  onAddPerson,
}) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const handledHelpActionRef = React.useRef<string | null>(null);
  const { people, focusId, setFocusId, activePerson } = appState;
  const { treeSettings: legacyTreeSettings } = viewSettings;
  const adapterPatch = useTreeAppearanceAdapter();

  const effectiveTreeSettings = React.useMemo(() => ({
    ...legacyTreeSettings,
    ...adapterPatch,
  }), [legacyTreeSettings, adapterPatch]);

  const { canEdit: canEditActiveTree } = useTreePermissions();
  const isSettingsDrawerOpen = useAppStore((state) => state.isSettingsDrawerOpen);
  const setSettingsDrawerOpen = useAppStore((state) => state.setSettingsDrawerOpen);
  const isDiagnosticsDrawerOpen = useAppStore((state) => state.isDiagnosticsDrawerOpen);
  const setDiagnosticsDrawerOpen = useAppStore((state) => state.setDiagnosticsDrawerOpen);
  const isTreeControlCenterOpen = useAppStore((state) => state.isTreeControlCenterOpen);
  const setTreeControlCenterOpen = useAppStore((state) => state.setTreeControlCenterOpen);
  const setNodeContextMenu = useAppStore((state) => state.setNodeContextMenu);
  const setVaultOpen = useAppStore((state) => state.setVaultOpen);
  const setVaultTab = useAppStore((state) => state.setVaultTab);
  const setVaultExportSection = useAppStore((state) => state.setVaultExportSection);
  const isSyncing = useAppStore(selectIsSyncing);
  const isDemoMode = useAppStore((state) => state.isDemoMode);
  const setActivityLogOpen = useAppStore((state) => state.setActivityLogOpen);

  const { t, language } = useTranslation();

  const focusAndNavigate = React.useCallback(
    (personId: string) => {
      setFocusId(personId);
      navigate(`/person/${personId}`);
    },
    [navigate, setFocusId]
  );

  const openKindiPersonRecord = React.useCallback<NonNullable<SearchProps['onOpenPersonRecord']>>((
    personId,
    targetTab = 'about',
    targetSection,
    targetField
  ) => {
    focusAndNavigate(personId);
    setDetailsPanelOpen(true);
    useAppStore.getState().setSmartPersonaTab(targetTab);
    useAppStore.getState().setSmartPersonaTargetSection(targetSection ?? null);
    useAppStore.getState().setSmartPersonaTargetField(targetField ?? null);
    useAppStore.getState().setSmartPersonaEditing(canEditActiveTree);
  }, [canEditActiveTree, focusAndNavigate, setDetailsPanelOpen]);

  const routedSearchProps = React.useMemo<SearchProps>(() => ({
    ...searchProps,
    onFocusPerson: focusAndNavigate,
    onOpenPersonRecord: openKindiPersonRecord,
  }), [focusAndNavigate, openKindiPersonRecord, searchProps]);

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

  const openVaultExportSection = React.useCallback((
    section: 'family-book' | 'visuals' | 'data-export' | 'history' | 'cloud-backup'
  ) => {
    setTreeControlCenterOpen(false);
    setSettingsDrawerOpen(false);
    setVaultTab('cloud');
    setVaultExportSection(section);
    setVaultOpen(true);
  }, [setSettingsDrawerOpen, setTreeControlCenterOpen, setVaultExportSection, setVaultOpen, setVaultTab]);

  React.useEffect(() => {
    const helpAction = searchParams.get('helpAction');
    if (!isHelpActionId(helpAction)) {
      handledHelpActionRef.current = null;
      return;
    }
    if (handledHelpActionRef.current === helpAction) return;
    handledHelpActionRef.current = helpAction;

    switch (helpAction) {
      case 'tree-preferences':
        openAppearanceLab();
        break;
      case 'tree-control':
        openTreeControlCenter();
        break;
      case 'kindi':
        window.dispatchEvent(new CustomEvent('jozor:open-kindi'));
        break;
      case 'add-person':
        openAddPersonModal();
        break;
      case 'activity-log':
        setActivityLogOpen(true);
        break;
      case 'global-settings':
        modals.onOpenGlobalSettings();
        break;
      case 'diagnostics':
        setDiagnosticsDrawerOpen(true);
        break;
      case 'vault-trees':
        openVaultTab('trees');
        break;
      case 'vault-members':
        openVaultTab('members');
        break;
      case 'vault-security':
        openVaultTab('security');
        break;
      case 'vault-stats':
        openVaultTab('stats');
        break;
      case 'vault-family-book':
        openVaultExportSection('family-book');
        break;
      case 'vault-visuals':
        openVaultExportSection('visuals');
        break;
      case 'vault-data-export':
        openVaultExportSection('data-export');
        break;
      case 'vault-history':
        openVaultExportSection('history');
        break;
      case 'vault-cloud-backup':
        openVaultExportSection('cloud-backup');
        break;
    }

    const nextSearchParams = new URLSearchParams(searchParams);
    nextSearchParams.delete('helpAction');
    setSearchParams(nextSearchParams, { replace: true });
  }, [
    modals,
    openAddPersonModal,
    openAppearanceLab,
    openTreeControlCenter,
    openVaultExportSection,
    openVaultTab,
    searchParams,
    setActivityLogOpen,
    setDiagnosticsDrawerOpen,
    setSearchParams,
  ]);

  return (
    <>
      <a href="#main-content" className="skip-link">
        {t.skipToMainContent}
      </a>
      {!isPresentMode && (
        <Header
          toggleDetailsPanel={() => setDetailsPanelOpen(!detailsPanelOpen)}
          detailsPanelOpen={detailsPanelOpen}
          hasActivePerson={!!activePerson}
          historyControls={historyControls}
          themeLanguage={themeLanguage}
          auth={auth}
          viewSettings={viewSettings}
          toolsActions={toolsActions}
          exportActions={exportActions}
          searchProps={routedSearchProps}
          globalActions={{
            onOpenTreeControlCenter: openTreeControlCenter,
            onOpenGlobalSettings: modals.onOpenGlobalSettings,
            onOpenDiagnostics: () => setDiagnosticsDrawerOpen(true),
            onOpenShare: () => openVaultTab('members'),
            onOpenCleanTree: modals.onOpenCleanTreeOptions,
            onOpenTreeManager: auth.onOpenTreeManager,
            onOpenCloudBackups: auth.onOpenCloudBackups,
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
            hasBlockingOverlay={detailsPanelOpen || isSettingsDrawerOpen || isDiagnosticsDrawerOpen || isTreeControlCenterOpen}
            ref={svgRef}
            activeModal={modals.activeModal}
            setDetailsPanelOpen={setDetailsPanelOpen}
            onOpenLinkModal={modals.handleOpenLinkModal}
            onPresent={viewSettings.onPresent}
            isDetailsPanelOpen={detailsPanelOpen}
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
        detailsPanelFamilyActions={detailsPanelFamilyActions}
        auth={auth}
        isPresentMode={isPresentMode}
        detailsPanelOpen={detailsPanelOpen}
        setDetailsPanelOpen={setDetailsPanelOpen}
        focusAndNavigate={focusAndNavigate}
        openVaultTab={openVaultTab}
        openAppearanceLab={openAppearanceLab}
        openAddPersonModal={openAddPersonModal}
        effectiveTreeSettings={effectiveTreeSettings}
        canEditActiveTree={canEditActiveTree}
      />
      <Toaster richColors position="bottom-center" dir={language === 'ar' ? 'rtl' : 'ltr'} />
    </>
  );
};
