import { useState } from 'react';
import type { Person, ExportActionsProps } from '../../../types';
import { useAppModalBindings } from '../useAppModalBindings';
import { useUIAndSettingsOrchestrator } from '../useUIAndSettingsOrchestrator';
import { useAppUiBindings } from '../useAppUiBindings';
import { useAppStore } from '../../../store/useAppStore';

interface UseUIOverlayCoordinatorParams {
  people: Record<string, Person>;
  startNewTree: () => void;
  focusId: string;
  setFocusId: (id: string) => void;
  currentUserRole: 'owner' | 'editor' | 'viewer' | null;
  handleExport: ExportActionsProps['handleExport'];
  handlePublishingExport?: ExportActionsProps['handlePublishingExport'];
}

export const useUIOverlayCoordinator = ({
  people,
  startNewTree,
  focusId,
  setFocusId,
  currentUserRole,
  handleExport,
  handlePublishingExport,
}: UseUIOverlayCoordinatorParams) => {
  const [isPresentMode, setIsPresentMode] = useState(false);
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(() => (
    typeof window === 'undefined' ||
    typeof window.matchMedia !== 'function' ||
    !window.matchMedia('(max-width: 639px)').matches
  ));

  const isSettingsDrawerOpen = useAppStore((state) => state.isSettingsDrawerOpen);
  const setSettingsDrawerOpen = useAppStore((state) => state.setSettingsDrawerOpen);
  const isActivityLogOpen = useAppStore((state) => state.isActivityLogOpen);
  const setActivityLogOpen = useAppStore((state) => state.setActivityLogOpen);

  const {
    modals,
    handleOpenModal,
    handleOpenLinkModal,
    onOpenTreeManager,
    onOpenCloudBackups,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
  } = useAppModalBindings();

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
  });

  const { modalsReturn, toolsActions, exportActions } = useAppUiBindings({
    modals,
    handleOpenModal,
    handleExport,
    handlePublishingExport,
  });

  return {
    welcomeScreen,
    modals: modalsReturn,
    themeLanguage,
    viewSettings,
    toolsActions,
    exportActions,
    setShowWelcome,
    isPresentMode,
    setIsPresentMode,
    detailsPanelOpen,
    setDetailsPanelOpen,
    isSettingsDrawerOpen,
    setSettingsDrawerOpen,
    isActivityLogOpen,
    setActivityLogOpen,
    handleOpenModal,
    handleOpenLinkModal,
    onOpenTreeManager,
    onOpenCloudBackups,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
  };
};
