import * as React from 'react';

import { useAppStore } from '../store/useAppStore';
import { useModalAndSidebarLogic } from './useModalAndSidebarLogic';
import { useAppModals } from './useAppModals';
import type { ModalStateAndActions } from '../types';

/**
 * Central orchestrator for all modal- and sidebar-related UI state.
 * Extracted from useAppOrchestration to improve maintainability.
 */
export const useModalOrchestrator = () => {
  // History/future drive some modal keyboard affordances (undo/redo availability)
  const history = useAppStore((state) => state.history);
  const future = useAppStore((state) => state.future);

  const {
    googleSyncChoiceModal,
    setGoogleSyncChoiceModal,
    onCloseGoogleSyncChoice,
    onOpenGoogleSyncChoice,
    driveFileManagerModal,
    setDriveFileManagerModal,
    onOpenDriveFileManager,
    cleanTreeOptionsModal,
    setCleanTreeOptionsModal,
    onOpenCleanTreeOptions,
    treeManagerModal,
    setTreeManagerModal,
    onOpenTreeManager,
    sharedTreePromptModal,
    setSharedTreePromptModal,
    snapshotHistoryModal,
    setSnapshotHistoryModal,
    onOpenSnapshotHistory,
    adminHubModal,
    setAdminHubModal,
    onOpenAdminHub,
    globalSettingsModal,
    setGlobalSettingsModal,
    onOpenGlobalSettings,
  } = useAppModals();

  const {
    sidebarOpen,
    setSidebarOpen,
    activeModal,
    setActiveModal,
    isPresentMode,
    setIsPresentMode,
    linkModal,
    setLinkModal,
    handleOpenLinkModal,
    handleOpenModal: rawHandleOpenModal,
  } = useModalAndSidebarLogic({
    canUndo: history.length > 0,
    canRedo: future.length > 0,
  });

  const handleOpenModal = React.useCallback(
    (modalType: any) => {
      if (modalType === 'globalSettings') {
        onOpenGlobalSettings();
      } else if (modalType === 'adminHub') {
        onOpenAdminHub();
      } else if (modalType === 'snapshotHistory') {
        onOpenSnapshotHistory();
      } else {
        rawHandleOpenModal(modalType);
      }
    },
    [onOpenGlobalSettings, onOpenAdminHub, onOpenSnapshotHistory, rawHandleOpenModal]
  );

  const modals: ModalStateAndActions = {
    activeModal,
    setActiveModal,
    linkModal,
    setLinkModal,
    cleanTreeOptionsModal,
    setCleanTreeOptionsModal,
    googleSyncChoiceModal,
    setGoogleSyncChoiceModal,
    driveFileManagerModal,
    setDriveFileManagerModal,
    treeManagerModal,
    setTreeManagerModal,
    handleOpenLinkModal,
    handleOpenModal,
    onOpenCleanTreeOptions,
    onOpenTreeManager,
    sharedTreePromptModal,
    setSharedTreePromptModal,
    snapshotHistoryModal,
    setSnapshotHistoryModal,
    onOpenSnapshotHistory,
    adminHubModal,
    setAdminHubModal,
    onOpenAdminHub,
    globalSettingsModal,
    setGlobalSettingsModal,
    onOpenGlobalSettings,
  };

  return {
    sidebarOpen,
    setSidebarOpen,
    isPresentMode,
    setIsPresentMode,
    modals,
    handleOpenModal,
    handleOpenLinkModal,
    onOpenSnapshotHistory,
    onOpenTreeManager,
    onOpenAdminHub,
    onOpenGlobalSettings,
    onOpenDriveFileManager,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
  };
};
