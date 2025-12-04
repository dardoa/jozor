import { useState, useEffect, useRef, useCallback } from 'react';
import { Person, Language } from '../types';
import { INITIAL_ROOT_ID } from '../constants';

interface UseWelcomeScreenLogicProps {
  people: Record<string, Person>;
  startNewTree: () => void;
  stopSyncing: () => void;
  handleImport: (file: File) => Promise<boolean>;
  // Removed handleLogin: () => Promise<boolean>;
  // Removed handleLogout: () => Promise<void>;
  // Removed language: Language;
}

export const useWelcomeScreenLogic = ({
  people, startNewTree, stopSyncing, handleImport // Removed language
}: UseWelcomeScreenLogicProps) => {
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const hasData = Object.keys(people).length > 1 || people[INITIAL_ROOT_ID].firstName !== 'Me';
    if (hasData) setShowWelcome(false);
  }, [people]);

  const handleStartNewTree = useCallback(() => {
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

  // Removed handleLoginWrapper and handleLogoutWrapper from here

  return {
    showWelcome,
    setShowWelcome,
    fileInputRef,
    handleStartNewTree,
    onFileUpload,
    // Removed handleLoginWrapper,
    // Removed handleLogoutWrapper,
  };
};