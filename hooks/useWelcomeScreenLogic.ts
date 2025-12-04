import { useState, useEffect, useRef, useCallback } from 'react';
import { Person, Language } from '../types';
import { INITIAL_ROOT_ID } from '../constants';

interface UseWelcomeScreenLogicProps {
  people: Record<string, Person>;
  t: any; // Translations object
  startNewTree: () => void;
  stopSyncing: () => void;
  handleImport: (file: File) => Promise<boolean>;
  handleLogin: () => Promise<boolean>;
  handleLogout: () => Promise<void>;
  language: Language; // Added language property
}

export const useWelcomeScreenLogic = ({
  people, t, startNewTree, stopSyncing, handleImport, handleLogin, handleLogout, language
}: UseWelcomeScreenLogicProps) => {
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasData = Object.keys(people).length > 1 || people[INITIAL_ROOT_ID].firstName !== 'Me';
    if (hasData) setShowWelcome(false);
  }, [people]);

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

  return {
    showWelcome,
    setShowWelcome,
    fileInputRef,
    handleStartNewTree,
    onFileUpload,
    handleLoginWrapper,
    handleLogoutWrapper,
  };
};