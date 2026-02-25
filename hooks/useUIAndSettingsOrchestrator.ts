import * as React from 'react';
import { useCallback } from 'react';

import type {
  Person,
  WelcomeScreenLogicProps,
  ThemeLanguageProps,
  ViewSettingsProps,
  SearchProps,
} from '../types';
import { useTranslation } from '../context/TranslationContext';
import { useTreeSettings } from './useTreeSettings';
import { useThemeSync } from './useThemeSync';
import { useWelcomeScreenLogic } from './useWelcomeScreenLogic';
import { useAppStore, loadFullState } from '../store/useAppStore';
import { importFromGEDCOM } from '../utils/gedcomLogic';
import { importFromJozorArchive } from '../utils/archiveLogic';
import { validatePerson } from '../utils/familyLogic';
import { INITIAL_ROOT_ID } from '../constants';
import { showError } from '../utils/toast';

interface UseUIAndSettingsOrchestratorParams {
  people: Record<string, Person>;
  startNewTree: () => void;
  focusId: string;
  setFocusId: (id: string) => void;
  currentUserRole: 'owner' | 'editor' | 'viewer' | null;
  setIsPresentMode: (v: boolean) => void;
  onOpenSnapshotHistory: () => void;
  onOpenAdminHub: () => void;
}

export const useUIAndSettingsOrchestrator = (
  params: UseUIAndSettingsOrchestratorParams
): {
  welcomeScreen: WelcomeScreenLogicProps;
  themeLanguage: ThemeLanguageProps;
  viewSettings: ViewSettingsProps;
  searchProps: SearchProps;
  setShowWelcome: (value: boolean) => void;
} => {
  const {
    people,
    startNewTree,
    focusId,
    setFocusId,
    currentUserRole,
    setIsPresentMode,
    onOpenSnapshotHistory,
    onOpenAdminHub,
  } = params;

  const { language, setLanguage } = useTranslation();
  const { treeSettings, setTreeSettings } = useTreeSettings();
  const { darkMode, setDarkMode } = useThemeSync();

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
          imported = await importFromJozorArchive(file);
        } else {
          const text = await file.text();
          imported = name.endsWith('.ged') ? importFromGEDCOM(text) : JSON.parse(text);
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
        showError('Import failed. Please check the file format.');
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

  const themeLanguage: ThemeLanguageProps = { darkMode, setDarkMode, language, setLanguage };

  const viewSettings: ViewSettingsProps = {
    treeSettings,
    setTreeSettings,
    onPresent: () => setIsPresentMode(true),
    onOpenSnapshotHistory,
    currentUserRole,
    onOpenAdminHub,
    isAdvancedBarOpen,
    setAdvancedBarOpen,
  };

  const searchProps: SearchProps = {
    people,
    onFocusPerson: setFocusId,
  };

  return {
    welcomeScreen,
    themeLanguage,
    viewSettings,
    searchProps,
    setShowWelcome,
  };
};
