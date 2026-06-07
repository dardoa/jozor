import { useAppStore } from '../../store/useAppStore';
import { useModalAndDetailsPanelLogic } from './useModalAndDetailsPanelLogic';
import type { ModalStateAndActions } from '../../types';

/**
 * Central orchestrator for all modal- and person details panel-related UI state.
 * Extracted from useAppOrchestration to improve maintainability.
 */
export const useModalOrchestrator = () => {
  // History/future drive some modal keyboard affordances (undo/redo availability)
  const past = useAppStore((state) => state.past);
  const future = useAppStore((state) => state.future);

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
    googleSyncChoiceDriveFileId,
    setGoogleSyncChoiceDriveFileId,
    sharedTreesPayload,
    setSharedTreesPayload,
    handleOpenLinkModal,
    handleOpenModal,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
    onOpenCleanTreeOptions,
    onOpenGlobalSettings,
    onOpenCloudBackups,
    onOpenTreeManager,
    setSharedTreePromptModal,
  } = useModalAndDetailsPanelLogic({
    canUndo: past.length > 0,
    canRedo: future.length > 0,
  });

  const modals: ModalStateAndActions = {
    activeModal,
    setActiveModal,
    geographicJourneyMode,
    setGeographicJourneyMode,
    linkModal,
    setLinkModal,
    googleSyncChoiceDriveFileId,
    setGoogleSyncChoiceDriveFileId,
    sharedTreesPayload,
    setSharedTreesPayload,
    handleOpenLinkModal,
    handleOpenModal,
    onOpenCleanTreeOptions,
    onOpenTreeManager,
    onOpenGlobalSettings,
    setSharedTreePromptModal,
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
    setSharedTreePromptModal,
  };
};
