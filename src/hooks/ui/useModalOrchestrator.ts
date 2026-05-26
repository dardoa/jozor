import * as React from 'react';

import { useAppStore } from '../../store/useAppStore';
import { useModalAndDetailsPanelLogic } from './useModalAndDetailsPanelLogic';
import { useAppModals } from './useAppModals';
import type { ModalRouteType, ModalStateAndActions } from '../../types';

/**
 * Central orchestrator for all modal- and person details panel-related UI state.
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
    onOpenCloudBackups,
    cleanTreeOptionsModal,
    setCleanTreeOptionsModal,
    onOpenCleanTreeOptions,
    onOpenTreeManager,
    sharedTreePromptModal,
    setSharedTreePromptModal,
    globalSettingsModal,
    setGlobalSettingsModal,
    onOpenGlobalSettings,
  } = useAppModals();

  const {
    detailsPanelOpen,
    setDetailsPanelOpen,
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
  } = useModalAndDetailsPanelLogic({
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  });

  const handleOpenModal = React.useCallback(
    (modalType: ModalRouteType) => {
      if (modalType === 'globalSettings') {
        onOpenGlobalSettings();
      } else {
        rawHandleOpenModal(modalType);
      }
    },
    [
      onOpenGlobalSettings,
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
    handleOpenLinkModal,
    handleOpenModal,
    onOpenCleanTreeOptions,
    onOpenTreeManager,
    sharedTreePromptModal,
    setSharedTreePromptModal,
    globalSettingsModal,
    setGlobalSettingsModal,
    onOpenGlobalSettings,
  };

  return {
    detailsPanelOpen,
    setDetailsPanelOpen,
    isPresentMode,
    setIsPresentMode,
    modals,
    handleOpenModal,
    handleOpenLinkModal,
    onOpenTreeManager,
    onOpenGlobalSettings,
    onOpenCloudBackups,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
  };
};
