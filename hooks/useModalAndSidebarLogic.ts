import { useState, useCallback } from 'react';
import { Gender, ModalType } from '../types';

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
  const [isPresentMode, setIsPresentMode] = useState(false);

  const [linkModal, setLinkModal] = useState<{
    isOpen: boolean;
    type: 'parent' | 'spouse' | 'child' | null;
    gender: Gender | null;
  }>({ isOpen: false, type: null, gender: null });

  const handleOpenLinkModal = useCallback((type: 'parent' | 'spouse' | 'child', gender: Gender) => {
    setLinkModal({ isOpen: true, type, gender });
  }, []);

  const handleOpenModal = useCallback(
    (
      modalType: ModalType
    ) => {
      setActiveModal(modalType);
    },
    []
  );

  return {
    sidebarOpen,
    setSidebarOpen,
    activeModal,
    setActiveModal,
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
