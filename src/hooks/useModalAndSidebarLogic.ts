import { useState, useCallback } from 'react';
import { Gender, GeographicJourneyMode, ModalType } from '../types';

interface UseModalAndSidebarLogicProps {
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Hook to manage the state of UI modals and the sidebar.
 * Centralizes the logic for opening/closing various dialogs.
 */
export const useModalAndSidebarLogic = ({ canUndo, canRedo }: UseModalAndSidebarLogicProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
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
      modalType: ModalType
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
    handleOpenModal,
    canUndo,
    canRedo,
  };
};
