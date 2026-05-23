import { useState, useEffect, useRef, useCallback } from 'react';
import { Person } from '../../types';

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
    // Check if we have meaningful data (more than just the initial person named 'Me')
    const keys = Object.keys(people);
    const hasData =
      keys.length > 1 ||
      (keys.length === 1 && people[keys[0]] && people[keys[0]].firstName !== 'Me');
    if (hasData) {
      const timer = setTimeout(() => setShowWelcome(false), 0);
      return () => clearTimeout(timer);
    }
  }, [people, showWelcome]);

  const handleStartNewTree = useCallback(() => {
    startNewTree();
    stopSyncing();
    setShowWelcome(false);
  }, [startNewTree, stopSyncing]);

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
