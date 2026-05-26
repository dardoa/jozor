import { useState, useCallback } from 'react';
import type { Gender, GeographicJourneyMode, ModalRouteType, ModalType } from '../../types';

interface UseModalAndDetailsPanelLogicProps {
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Hook to manage the state of UI modals and the details panel.
 * Centralizes the logic for opening/closing various dialogs.
 */
export const useModalAndDetailsPanelLogic = ({ canUndo, canRedo }: UseModalAndDetailsPanelLogicProps) => {
  const [detailsPanelOpen, setDetailsPanelOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'none' | ModalType>('none');
  const [geographicJourneyMode, setGeographicJourneyMode] = useState<GeographicJourneyMode>('events');
  const [isPresentMode, setIsPresentMode] = useState(false);

  const [linkModal, setLinkModal] = useState<{
    isOpen: boolean;
    type: 'parent' | 'spouse' | 'child' | null;
    gender: Gender | null;
    initialMode?: 'create' | 'existing';
  }>({ isOpen: false, type: null, gender: null, initialMode: 'create' });

  const handleOpenLinkModal = useCallback((
    type: 'parent' | 'spouse' | 'child',
    gender: Gender,
    options?: { initialMode?: 'create' | 'existing' }
  ) => {
    setLinkModal({ isOpen: true, type, gender, initialMode: options?.initialMode ?? 'create' });
  }, []);

  const handleOpenModal = useCallback(
    (
      modalType: ModalRouteType
    ) => {
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

      setActiveModal(modalType);
    },
    []
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
    handleOpenLinkModal,
    handleOpenModal,
    canUndo,
    canRedo,
  };
};
