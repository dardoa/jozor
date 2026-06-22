import type {
  AppOrchestrationReturn,
  AuthProps,
} from '../../types';
import { useAppStore } from '../../store/useAppStore';
import { useAppExportBindings } from './useAppExportBindings';
import { useAuthCoordinator } from './coordinators/useAuthCoordinator';
import { useSyncCoordinator } from './coordinators/useSyncCoordinator';
import { useTreeCoordinator } from './coordinators/useTreeCoordinator';
import { useUIOverlayCoordinator } from './coordinators/useUIOverlayCoordinator';

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

  const { svgRef, handleExport, handlePublishingExport } = useAppExportBindings(people);

  // 1. Coordinates Modals, UI & Welcome Settings
  const ui = useUIOverlayCoordinator({
    people,
    startNewTree,
    focusId,
    setFocusId,
    currentUserRole,
    handleExport,
    handlePublishingExport,
  });

  // 2. Coordinates Google/Supabase Live Sync
  const sync = useSyncCoordinator({
    people,
    onOpenGoogleSyncChoice: ui.onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice: ui.onCloseGoogleSyncChoice,
    setShowWelcome: ui.setShowWelcome,
    onOpenCloudBackups: ui.onOpenCloudBackups,
  });

  // 3. Coordinates Authentication, Session and Redirects
  const authCoord = useAuthCoordinator({
    isSharedMode,
    routeTreeId,
    routePersonId,
    people,
    setShowWelcome: ui.setShowWelcome,
    setSharedTreePromptModal: ui.modals.setSharedTreePromptModal,
    onGoogleSyncLogin: sync.googleSync.onLogin,
  });

  // 4. Coordinates Tree Modifications, History and ShortCuts
  const tree = useTreeCoordinator({
    people,
    locations,
    addLocation,
    updateLocationStatus,
    focusId,
    setFocusId,
    currentTreeId,
    setCurrentTreeId,
    past,
    future,
    undo,
    redo,
    isPresentMode: ui.isPresentMode,
    setIsPresentMode: ui.setIsPresentMode,
    showWelcome: ui.welcomeScreen.showWelcome,
    handleOpenLinkModal: ui.handleOpenLinkModal,
    setDetailsPanelOpen: ui.setDetailsPanelOpen,
    onOpenGoogleSyncChoice: ui.onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice: ui.onCloseGoogleSyncChoice,
    onOpenCloudBackups: ui.onOpenCloudBackups,
    onOpenTreeManager: ui.onOpenTreeManager,
    setSharedTreePromptModal: ui.modals.setSharedTreePromptModal,
    onOpenLoginModal: async (returnTo?: string) => {
      if (returnTo) {
        sessionStorage.setItem('jozor:return_to', returnTo);
        sessionStorage.setItem('jozor:post-login-redirect', returnTo);
      }
      ui.handleOpenModal('login');
    },
    handleExport,
  });

  const auth: AuthProps = {
    user: authCoord.user,
    isDemoMode: authCoord.isDemoMode,
    isSyncing: sync.googleSync.isSyncing,
    onLogin: authCoord.onLogin,
    onLogout: authCoord.onLogout,
    stopSyncing: sync.googleSync.stopSyncing,
    onLoadCloudData: sync.googleSync.onLoadCloudData,
    onSaveNewCloudFile: sync.googleSync.onSaveNewCloudFile,
    driveFiles: sync.googleSync.driveFiles,
    currentActiveDriveFileId: sync.googleSync.currentActiveDriveFileId,
    fileOwnerUid: sync.googleSync.fileOwnerUid,
    refreshDriveFiles: sync.googleSync.refreshDriveFiles,
    handleLoadDriveFile: sync.googleSync.handleLoadDriveFile,
    handleSaveAsNewDriveFile: sync.googleSync.handleSaveAsNewDriveFile,
    handleOverwriteExistingDriveFile: sync.googleSync.handleOverwriteExistingDriveFile,
    handleDeleteDriveFile: sync.googleSync.handleDeleteDriveFile,
    isSavingDriveFile: sync.googleSync.isSaving,
    isDeletingDriveFile: sync.googleSync.isDeleting,
    isListingDriveFiles: sync.googleSync.isListing,
    hasSessionError: sync.googleSync.hasSessionError,
    isAuthorized: sync.googleSync.isAuthorized,
    handleCreateSnapshot: sync.googleSync.handleCreateSnapshot,
    handleRestoreSnapshot: sync.googleSync.handleRestoreSnapshot,
    onOpenCloudBackups: ui.onOpenCloudBackups,
    onOpenTreeManager: ui.onOpenTreeManager,
    onOpenLoginModal: async (returnTo?: string) => {
      if (returnTo) {
        sessionStorage.setItem('jozor:return_to', returnTo);
        sessionStorage.setItem('jozor:post-login-redirect', returnTo);
      }
      ui.handleOpenModal('login');
    },
    syncStatus: sync.syncStatus,
    onExport: handleExport,
    onSaveToGoogleDrive: sync.googleSync.onSaveToGoogleDrive,
    onOpenActivityLog: () => ui.setActivityLogOpen(true),
  };

  return {
    appState: tree.appState,
    welcomeScreen: ui.welcomeScreen,
    modals: ui.modals,
    googleSync: sync.googleSync,
    historyControls: tree.historyControls,
    onAddPerson: tree.onAddPerson,
    themeLanguage: ui.themeLanguage,
    viewSettings: ui.viewSettings,
    toolsActions: ui.toolsActions,
    exportActions: ui.exportActions,
    searchProps: tree.searchProps,
    detailsPanelFamilyActions: tree.detailsPanelFamilyActions,
    coreFamilyActions: tree.coreFamilyActions,
    svgRef,
    isPresentMode: ui.isPresentMode,
    setIsPresentMode: ui.setIsPresentMode,
    detailsPanelOpen: ui.detailsPanelOpen,
    setDetailsPanelOpen: ui.setDetailsPanelOpen,
    isSettingsDrawerOpen: ui.isSettingsDrawerOpen,
    setSettingsDrawerOpen: ui.setSettingsDrawerOpen,
    isActivityLogOpen: ui.isActivityLogOpen,
    setActivityLogOpen: ui.setActivityLogOpen,
    auth,
  };
};
