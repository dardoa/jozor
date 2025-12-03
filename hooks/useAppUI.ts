import { useState, useCallback } from 'react';
import { Gender } from '../types';

interface UseAppUIProps {
  addParent: (gender: Gender) => void;
  addSpouse: (gender: Gender) => void;
  addChild: (gender: Gender) => void;
  linkPerson: (existingId: string, type: 'parent' | 'spouse' | 'child' | null) => void;
  setFocusId: (id: string) => void;
  canUndo: boolean;
  canRedo: boolean;
}

export const useAppUI = ({
  addParent, addSpouse, addChild, linkPerson, setFocusId,
  canUndo, canRedo
}: UseAppUIProps) => {
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

  const handleCreateNewRelative = useCallback(() => {
     if (!linkModal.type || !linkModal.gender) return;
     const actions = { parent: addParent, spouse: addSpouse, child: addChild };
     actions[linkModal.type](linkModal.gender);
     setLinkModal({ isOpen: false, type: null, gender: null });
  }, [linkModal, addParent, addSpouse, addChild]);

  const handleSelectExistingRelative = useCallback((id: string) => {
    linkPerson(id, linkModal.type);
    setLinkModal({ isOpen: false, type: null, gender: null });
  }, [linkModal, linkPerson]);

  const handleOpenModal = useCallback((modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => {
      setActiveModal(modalType);
  }, []);

  return {
    sidebarOpen, setSidebarOpen,
    activeModal, setActiveModal,
    isPresentMode, setIsPresentMode,
    linkModal, setLinkModal,
    handleOpenLinkModal,
    handleCreateNewRelative,
    handleSelectExistingRelative,
    handleOpenModal,
    canUndo,
    canRedo,
  };
};