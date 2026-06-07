import { useState, useCallback } from 'react';
import type { Gender, GeographicJourneyMode, ModalRouteType, ModalType } from '../../types';
import type { SharedTreeSummary } from '../../services/supabaseTreeTypes';
import { useAppStore } from '../../store/useAppStore';

interface UseModalAndDetailsPanelLogicProps {
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Hook to manage the state of UI modals and the details panel.
 * Centralizes all modal actions under activeModal to ensure exclusivity.
 */
export const useModalAndDetailsPanelLogic = ({ canUndo, canRedo }: UseModalAndDetailsPanelLogicProps) => {
  const setVaultOpen = useAppStore((state) => state.setVaultOpen);
  const setVaultTab = useAppStore((state) => state.setVaultTab);

  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'none' | ModalType>('none');
  const [geographicJourneyMode, setGeographicJourneyMode] = useState<GeographicJourneyMode>('events');
  const [isPresentMode, setIsPresentMode] = useState(false);

  const [linkModal, setLinkModal] = useState<{
    type: 'parent' | 'spouse' | 'child' | null;
    gender: Gender | null;
    initialMode?: 'create' | 'existing';
  }>({ type: null, gender: null, initialMode: 'create' });

  const [googleSyncChoiceDriveFileId, setGoogleSyncChoiceDriveFileId] = useState<string | null>(null);
  const [sharedTreesPayload, setSharedTreesPayload] = useState<SharedTreeSummary[]>([]);

  const handleOpenLinkModal = useCallback((
    type: 'parent' | 'spouse' | 'child',
    gender: Gender,
    options?: { initialMode?: 'create' | 'existing' }
  ) => {
    setLinkModal({ type, gender, initialMode: options?.initialMode ?? 'create' });
    setActiveModal('link');
  }, []);

  const onOpenGoogleSyncChoice = useCallback((fileId: string) => {
    setGoogleSyncChoiceDriveFileId(fileId);
    setActiveModal('googleSyncChoice');
  }, []);

  const onCloseGoogleSyncChoice = useCallback(() => {
    setActiveModal('none');
  }, []);

  const onOpenCleanTreeOptions = useCallback(() => {
    setActiveModal('cleanTreeOptions');
  }, []);

  const onOpenGlobalSettings = useCallback(() => {
    setActiveModal('globalSettings');
  }, []);

  const onOpenCloudBackups = useCallback(() => {
    setVaultTab('cloud');
    setVaultOpen(true);
  }, [setVaultOpen, setVaultTab]);

  const onOpenTreeManager = useCallback(() => {
    setVaultTab('trees');
    setVaultOpen(true);
  }, [setVaultOpen, setVaultTab]);

  const setSharedTreePromptModal = useCallback((val: { isOpen: boolean; sharedTrees: SharedTreeSummary[] }) => {
    if (val.isOpen) {
      setSharedTreesPayload(val.sharedTrees);
    }
    setActiveModal(val.isOpen ? 'sharedTreePrompt' : 'none');
  }, []);

  const handleOpenModal = useCallback(
    (modalType: ModalRouteType) => {
      if (modalType === 'map') {
        setGeographicJourneyMode('events');
        setActiveModal('geographicJourney');
        return;
      }

      if (modalType === 'migrationMap') {
        setGeographicJourneyMode('migration');
        setActiveModal('geographicJourney');
        return;
      }

      if (modalType === 'globalSettings') {
        onOpenGlobalSettings();
        return;
      }

      setActiveModal(modalType);
    },
    [onOpenGlobalSettings]
  );

  return {
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
    canUndo,
    canRedo,
  };
};
