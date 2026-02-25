import { useState, useEffect, useRef, useCallback } from 'react';
import { Person } from '../types';
import { INITIAL_ROOT_ID } from '../constants';

interface UseWelcomeScreenLogicProps {
  people: Record<string, Person>;
  startNewTree: () => void;
  stopSyncing: () => void;
  handleImport: (file: File) => Promise<boolean>;
}

/**
 * Hook to manage the Welcome Screen state and logic.
 * Detects if existing data exists to auto-dismiss the screen.
 */
export const useWelcomeScreenLogic = ({
  people,
  startNewTree,
  stopSyncing,
  handleImport,
}: UseWelcomeScreenLogicProps) => {
  const [showWelcome, setShowWelcome] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showWelcome) return;
    // Check if we have meaningful data (more than just the initial person)
    const hasData =
      Object.keys(people).length > 1 ||
      (people[INITIAL_ROOT_ID] && people[INITIAL_ROOT_ID].firstName !== 'Me');
    if (hasData) setTimeout(() => setShowWelcome(false), 0);
  }, [people, showWelcome]);

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

  return {
    showWelcome,
    setShowWelcome,
    fileInputRef,
    handleStartNewTree,
    onFileUpload,
  };
};
