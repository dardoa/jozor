import type {
  AppOrchestrationReturn,
} from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { useUIAndSettingsOrchestrator } from './useUIAndSettingsOrchestrator';
import { useAuthAndSyncOrchestrator } from '../auth/useAuthAndSyncOrchestrator';
import { useDetailsPanelAutoOpenOnFocus } from './useDetailsPanelAutoOpenOnFocus';
import { useAppShortcutBindings } from './useAppShortcutBindings';
import { useAppUiBindings } from './useAppUiBindings';
import { useAppExportBindings } from './useAppExportBindings';
import { useAppModalBindings } from './useAppModalBindings';
import { useAppSearchBindings } from './useAppSearchBindings';
import { useAppTreeBindings } from './useAppTreeBindings';

export const useAppOrchestration = (
  isSharedMode: boolean = false,
  routeTreeId: string | null = null,
  routePersonId: string | null = null
): AppOrchestrationReturn => {

  const people = useAppStore((state) => state.people);
  const locations = useAppStore((state) => state.locations);
  const addLocation = useAppStore((state) => state.addLocation);
  const updateLocationStatus = useAppStore((state) => state.updateLocationStatus);
  const focusId = useAppStore((state) => state.focusId);
  const setFocusId = useAppStore((state) => state.setFocusId);
  const past = useAppStore((state) => state.past);
  const future = useAppStore((state) => state.future);
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);
  const startNewTree = useAppStore((state) => state.startNewTree);
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
  const currentUserRole = useAppStore((state) => state.currentUserRole);
  const isSettingsDrawerOpen = useAppStore((state) => state.isSettingsDrawerOpen);
  const setSettingsDrawerOpen = useAppStore((state) => state.setSettingsDrawerOpen);

  const {
    detailsPanelOpen,
    setDetailsPanelOpen,
    isPresentMode,
    setIsPresentMode,
    modals,
    handleOpenModal,
    handleOpenLinkModal,
    onOpenSnapshotHistory,
    onOpenTreeManager,
    onOpenCloudBackups,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
  } = useAppModalBindings();

  const { svgRef, handleExport } = useAppExportBindings(people);
  const searchProps = useAppSearchBindings({ people, setFocusId });

  const {
    welcomeScreen,
    themeLanguage,
    viewSettings,
    setShowWelcome,
  } = useUIAndSettingsOrchestrator({
    people,
    startNewTree,
    focusId,
    setFocusId,
    currentUserRole,
    setIsPresentMode,
    onOpenSnapshotHistory,
  });

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;
  useAppShortcutBindings({
    canUndo,
    canRedo,
    undo,
    redo,
    isPresentMode,
    setIsPresentMode,
    enabled: !welcomeScreen.showWelcome,
  });

  useDetailsPanelAutoOpenOnFocus({
    focusId,
    isPresentMode,
    setDetailsPanelOpen,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
    onOpenCloudBackups,
    onOpenTreeManager,
    setSharedTreePromptModal: modals.setSharedTreePromptModal,
    onOpenLoginModal: async (returnTo?: string) => {
      if (returnTo) {
        sessionStorage.setItem('jozor:return_to', returnTo);
        sessionStorage.setItem('jozor:post-login-redirect', returnTo);
      }
      handleOpenModal('login');
    },
    onExport: handleExport,
  } as any);

  const isActivityLogOpen = useAppStore((state: any) => state.isActivityLogOpen);
  const setActivityLogOpen = useAppStore((state: any) => state.setActivityLogOpen);

  const {
    auth,
    googleSync,
  } = useAuthAndSyncOrchestrator({
    isSharedMode,
    routeTreeId,
    routePersonId,
    people,
    setShowWelcome,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
    onOpenCloudBackups,
    onOpenTreeManager,
    setSharedTreePromptModal: modals.setSharedTreePromptModal,
    onOpenLoginModal: async (returnTo?: string) => {
      if (returnTo) {
        sessionStorage.setItem('jozor:return_to', returnTo);
        sessionStorage.setItem('jozor:post-login-redirect', returnTo);
      }
      handleOpenModal('login');
    },
    onExport: handleExport,
  } as any);

  const {
    appState,
    historyControls,
    onAddPerson,
    detailsPanelFamilyActions,
    coreFamilyActions,
  } = useAppTreeBindings({
    people,
    locations,
    addLocation,
    updateLocationStatus,
    focusId,
    setFocusId,
    currentTreeId,
    setCurrentTreeId,
    canUndo,
    canRedo,
    undo,
    redo,
    handleOpenLinkModal,
  });

  const { modalsReturn, toolsActions, exportActions } = useAppUiBindings({
    modals,
    handleOpenModal,
    handleExport,
  });

  return {
    appState,
    welcomeScreen,
    modals: modalsReturn,
    googleSync,
    historyControls,
    onAddPerson,
    themeLanguage,
    viewSettings,
    toolsActions,
    exportActions,
    searchProps,
    detailsPanelFamilyActions,
    coreFamilyActions,
    svgRef,
    isPresentMode,
    setIsPresentMode,
    detailsPanelOpen,
    setDetailsPanelOpen,
    isSettingsDrawerOpen,
    setSettingsDrawerOpen,
    isActivityLogOpen,
    setActivityLogOpen,
    auth,
  };
};
