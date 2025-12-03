import { useState, useRef, useCallback, useEffect } from 'react';
import { Person, Gender, Language, TreeSettings, UserProfile } from '../types';
import { INITIAL_ROOT_ID } from '../constants';

interface UseAppUIProps {
  people: Record<string, Person>;
  t: any; // Translations object
  startNewTree: () => void;
  stopSyncing: () => void;
  handleImport: (file: File) => Promise<boolean>;
  handleLogin: () => Promise<boolean>; // Changed return type from Promise<void> to Promise<boolean>
  handleLogout: () => Promise<void>; // Changed return type from Promise<boolean> to Promise<void>
  addParent: (gender: Gender) => void;
  addSpouse: (gender: Gender) => void;
  addChild: (gender: Gender) => void;
  linkPerson: (existingId: string, type: 'parent' | 'spouse' | 'child' | null) => void;
  setFocusId: (id: string) => void;
}

export const useAppUI = ({
  people, t, startNewTree, stopSyncing, handleImport, handleLogin, handleLogout,
  addParent, addSpouse, addChild, linkPerson, setFocusId
}: UseAppUIProps) => {
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'none' | 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map'>('none');
  const [isPresentMode, setIsPresentMode] = useState(false);
  
  const [linkModal, setLinkModal] = useState<{
    isOpen: boolean;
    type: 'parent' | 'spouse' | 'child' | null;
    gender: Gender | null;
  }>({ isOpen: false, type: null, gender: null });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasData = Object.keys(people).length > 1 || people[INITIAL_ROOT_ID].firstName !== 'Me';
    if (hasData) setShowWelcome(false);
  }, [people]);

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

  const handleStartNewTree = useCallback(() => {
    if (Object.keys(people).length > 2 && !confirm(t.newTreeConfirm)) return;
    startNewTree();
    stopSyncing();
    setShowWelcome(false);
  }, [people, t, startNewTree, stopSyncing]);

  const onFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (await handleImport(file)) setShowWelcome(false);
    e.target.value = '';
  };

  const handleLoginWrapper = async () => {
      const success = await handleLogin();
      if (success) setShowWelcome(false);
  };

  const handleLogoutWrapper = async () => {
      await handleLogout();
      setShowWelcome(true);
  };

  const handleOpenModal = useCallback((modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => {
      setActiveModal(modalType);
  }, []);

  return {
    showWelcome, setShowWelcome,
    sidebarOpen, setSidebarOpen,
    activeModal, setActiveModal,
    isPresentMode, setIsPresentMode,
    linkModal, setLinkModal,
    fileInputRef,
    handleOpenLinkModal,
    handleCreateNewRelative,
    handleSelectExistingRelative,
    handleStartNewTree,
    onFileUpload,
    handleLoginWrapper,
    handleLogoutWrapper,
    handleOpenModal,
  };
};