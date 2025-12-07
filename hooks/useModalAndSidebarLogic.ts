import { useState, useCallback } from 'react';
import { Gender } from '../types';

interface UseModalAndSidebarLogicProps {
  addParent: (gender: Gender) => void;
  addSpouse: (gender: Gender) => void;
  addChild: (gender: Gender) => void;
  linkPerson: (existingId: string, type: 'parent' | 'spouse' | 'child' | null) => void;
  setFocusId: (id: string) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const useModalAndSidebarLogic = ({
  addParent, addSpouse, addChild, linkPerson, setFocusId,
  canUndo, canRedo
}: UseModalAndSidebarLogicProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'none' | 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map'>('none');
  const [isPresentMode, setIsPresentMode] = useState(false);
  
  const [linkModal, setLinkModal] = useState<{
    isOpen: boolean;
    type: 'parent' | 'spouse' | 'child' | null;
    gender: Gender | null;
  }>({ isOpen: false, type: null, gender: null });

  const handleOpenLinkModal = useCallback((type: 'parent' | 'spouse' | 'child', gender: Gender) => {
    setLinkModal({ isOpen: true, type, gender });
  }, []);

  // Removed handleCreateNewRelative and handleSelectExistingRelative as their logic is now handled by familyActions
  // and the LinkPersonModal directly uses familyActions.

  const handleOpenModal = useCallback((modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => {
      setActiveModal(modalType);
  }, []);

  return {
    sidebarOpen, setSidebarOpen,
    activeModal, setActiveModal,
    isPresentMode, setIsPresentMode,
    linkModal, setLinkModal,
    handleOpenLinkModal,
    // Removed handleCreateNewRelative,
    // Removed handleSelectExistingRelative,
    handleOpenModal,
    canUndo,
    canRedo,
  };
};