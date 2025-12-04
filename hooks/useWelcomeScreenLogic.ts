import { useState, useEffect, useRef, useCallback } from 'react';
import { Person, Language } from '../types';
import { INITIAL_ROOT_ID } from '../constants';

interface UseWelcomeScreenLogicProps {
  people: Record<string, Person>;
  startNewTree: () => void;
  stopSyncing: () => void;
  handleImport: (file: File) => Promise<boolean>;
  handleLogin: () => Promise<boolean>;
  handleLogout: () => Promise<void>;
  language: Language;
}

export const useWelcomeScreenLogic = ({
  people, startNewTree, stopSyncing, handleImport, handleLogin, handleLogout, language
}: UseWelcomeScreenLogicProps) => {
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasData = Object.keys(people).length > 1 || people[INITIAL_ROOT_ID].firstName !== 'Me';
    if (hasData) setShowWelcome(false);
  }, [people]);

  const handleStartNewTree = useCallback(() => {
    // Note: 't' is not available here directly, but WelcomeScreen itself uses it.
    // If a confirmation message is needed here, 't' would need to be passed or imported.
    // For now, assuming WelcomeScreen handles the confirmation message.
    startNewTree();
    stopSyncing();
    setShowWelcome(false);
  }, [people, startNewTree, stopSyncing]);

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