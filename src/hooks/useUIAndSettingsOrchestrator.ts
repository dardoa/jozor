import React, { useCallback } from 'react';

import type {
  Person,
  WelcomeScreenLogicProps,
  ThemeLanguageProps,
  ViewSettingsProps,
} from '../types';
import { useTranslation } from '../context/TranslationContext';
import { useTreeSettings } from './useTreeSettings';
import { useWelcomeScreenLogic } from './useWelcomeScreenLogic';
import { useAppStore, loadFullState } from '../store/useAppStore';
import { validatePerson } from '../utils/familyLogic';
import { INITIAL_ROOT_ID } from '../constants';
import { showToast } from '../utils/showToast';

interface UseUIAndSettingsOrchestratorParams {
  people: Record<string, Person>;
  startNewTree: () => void;
  focusId: string;
  setFocusId: (id: string) => void;
  currentUserRole: 'owner' | 'editor' | 'viewer' | null;
  setIsPresentMode: (v: boolean) => void;
  onOpenSnapshotHistory: () => void;
}

export const useUIAndSettingsOrchestrator = (
  params: UseUIAndSettingsOrchestratorParams
): {
  welcomeScreen: WelcomeScreenLogicProps;
  themeLanguage: ThemeLanguageProps;
  viewSettings: ViewSettingsProps;
  setShowWelcome: (value: boolean) => void;
} => {
  const {
    people,
    startNewTree,
    setFocusId,
    currentUserRole,
    setIsPresentMode,
    onOpenSnapshotHistory,
  } = params;

  const { t, language, setLanguage } = useTranslation();
  const { treeSettings, setTreeSettings } = useTreeSettings();
  const darkMode = useAppStore(state => state.darkMode);
  const setDarkMode = useAppStore(state => state.setDarkMode);

  const isAdvancedBarOpen = useAppStore(state => state.isAdvancedBarOpen);
  const setAdvancedBarOpen = useAppStore(state => state.setAdvancedBarOpen);

  // Welcome screen logic + unified import handling
  const welcomeScreenLogic = useWelcomeScreenLogic({
    people,
    startNewTree,
    // stopSyncing is owned by the auth/sync orchestrator; here it's a no-op bridge.
    stopSyncing: useCallback(() => { }, []),
    handleImport: useCallback(async (file: File) => {
      try {
        let imported: Record<string, Person> = {};
        const name = file.name.toLowerCase();

        if (name.endsWith('.jozor') || name.endsWith('.zip')) {
          const { importFromJozorArchive } = await import('../utils/archiveLogic');
          imported = await importFromJozorArchive(file);
        } else {
          const text = await file.text();
          if (name.endsWith('.ged')) {
            const { importFromGEDCOM } = await import('../utils/gedcomLogic');
            imported = importFromGEDCOM(text);
          } else {
            imported = JSON.parse(text);
          }
        }

        if (Object.keys(imported).length === 0) throw new Error('Empty file');

        const validated: Record<string, Person> = {};
        Object.keys(imported).forEach((k) => {
          validated[k] = validatePerson(imported[k]);
        });

        if (Object.keys(validated).length === 0) throw new Error('No valid data after validation');

        const newFocusId = Object.keys(validated)[0] || INITIAL_ROOT_ID;

        // Use unified loader so all state (people, focusId, settings) go through the same path
        loadFullState({
          people: validated,
          focusId: newFocusId,
        });

        return true;
      } catch (e) {
        console.error(e);
        showToast.error('Import failed. Please check the file format.');
        return false;
      }
    }, []),
  });

  const { setShowWelcome } = welcomeScreenLogic;

  const onTriggerImportFile = useCallback(() => {
    welcomeScreenLogic.fileInputRef.current?.click();
  }, [welcomeScreenLogic.fileInputRef]);

  const welcomeScreen: WelcomeScreenLogicProps = {
    showWelcome: welcomeScreenLogic.showWelcome,
    setShowWelcome: welcomeScreenLogic.setShowWelcome,
    fileInputRef: welcomeScreenLogic.fileInputRef,
    handleStartNewTree: welcomeScreenLogic.handleStartNewTree,
    onFileUpload: welcomeScreenLogic.onFileUpload,
    onTriggerImportFile,
  };

  const themeLanguage: ThemeLanguageProps = { darkMode, setDarkMode, language, setLanguage, t: t as any };

  const viewSettings: ViewSettingsProps = {
    treeSettings,
    setTreeSettings,
    onPresent: () => setIsPresentMode(true),
    onOpenSnapshotHistory,
    currentUserRole,
    isAdvancedBarOpen,
    setAdvancedBarOpen,
  };

  return {
    welcomeScreen,
    themeLanguage,
    viewSettings,
    setShowWelcome,
  };
};
