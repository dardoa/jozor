import * as React from 'react';

import { useAppStore } from '../store/useAppStore';
import { useModalAndSidebarLogic } from './useModalAndSidebarLogic';
import { useAppModals } from './useAppModals';
import type { ModalStateAndActions, ModalType } from '../types';

/**
 * Central orchestrator for all modal- and sidebar-related UI state.
 * Extracted from useAppOrchestration to improve maintainability.
 */
export const useModalOrchestrator = () => {
  // History/future drive some modal keyboard affordances (undo/redo availability)
  const past = useAppStore((state) => state.past);
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
    globalSettingsModal,
    setGlobalSettingsModal,
    onOpenGlobalSettings,
  } = useAppModals();

  const {
    sidebarOpen,
    setSidebarOpen,
    activeModal,
    setActiveModal,
    geographicJourneyMode,
    setGeographicJourneyMode,
    isPresentMode,
    setIsPresentMode,
    linkModal,
    setLinkModal,
    handleOpenLinkModal,
    handleOpenModal: rawHandleOpenModal,
  } = useModalAndSidebarLogic({
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  });

  const handleOpenModal = React.useCallback(
    (modalType: ModalType) => {
      if (modalType === 'globalSettings') {
        onOpenGlobalSettings();
      } else if (modalType === 'snapshotHistory') {
        onOpenSnapshotHistory();
      } else {
        rawHandleOpenModal(modalType);
      }
    },
    [
      onOpenGlobalSettings,
      onOpenSnapshotHistory,
      rawHandleOpenModal,
    ]
  );

  const modals: ModalStateAndActions = {
    activeModal,
    setActiveModal,
    geographicJourneyMode,
    setGeographicJourneyMode,
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
    onOpenGlobalSettings,
    onOpenDriveFileManager,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
  };
};
