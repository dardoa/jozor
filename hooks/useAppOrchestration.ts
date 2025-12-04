import { useState, useEffect, useRef, useCallback } from 'react';
import { Person, Gender, Language, TreeSettings, UserProfile, HistoryControlsProps, ThemeLanguageProps, AuthProps, ViewSettingsProps, ToolsActionsProps, ExportActionsProps, SearchProps, FamilyActionsProps } from '../types';
import { useFamilyTree } from './useFamilyTree';
import { useGoogleSync } from './useGoogleSync';
import { useThemeSync } from './useThemeSync';
import { useLanguageSync } from './useLanguageSync';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useModalAndSidebarLogic } from './useModalAndSidebarLogic';
import { useTreeSettings } from './useTreeSettings';
import { useWelcomeScreenLogic } from './useWelcomeScreenLogic';
import { exportToGEDCOM } from '../utils/gedcomLogic';
import { exportToJozorArchive } from '../utils/archiveLogic';
import { generateICS } from '../utils/calendarLogic';
import { downloadFile } from '../utils/fileUtils';

export const useAppOrchestration = () => {
  // --- Core Data & History ---
  const {
    people, focusId, setFocusId, history, future, undo, redo,
    updatePerson, deletePerson, addParent, addSpouse, addChild, removeRelationship, linkPerson,
    handleImport, startNewTree, loadCloudData
  } = useFamilyTree();

  // --- Sync & Auth ---
  const { user, isSyncing, isDemoMode, handleLogin, handleLogout, stopSyncing } = useGoogleSync(people, loadCloudData);

  // --- UI Preferences ---
  const { language, setLanguage } = useLanguageSync();
  const { treeSettings, setTreeSettings } = useTreeSettings();
  const { darkMode, setDarkMode } = useThemeSync(treeSettings.theme);

  const activePerson = people[focusId];

  // Calculate canUndo/canRedo
  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  // --- Welcome Screen Logic ---
  const {
    showWelcome, setShowWelcome, fileInputRef,
    handleStartNewTree, onFileUpload
  } = useWelcomeScreenLogic({
    people, startNewTree, stopSyncing, handleImport // Removed handleLogin, handleLogout
  });

  // --- Login/Logout Wrappers (now defined here) ---
  const handleLoginWrapper = async () => {
      const success = await handleLogin();
      if (success) setShowWelcome(false);
  };

  const handleLogoutWrapper = async () => {
      await handleLogout();
      setShowWelcome(true);
  };

  // --- Modal & Sidebar Logic ---
  const {
    sidebarOpen, setSidebarOpen,
    activeModal, setActiveModal,
    isPresentMode, setIsPresentMode,
    linkModal, setLinkModal,
    handleOpenLinkModal,
    handleOpenModal,
  } = useModalAndSidebarLogic({
    addParent, addSpouse, addChild, linkPerson, setFocusId,
    canUndo,
    canRedo,
  });

  // --- Keyboard Shortcuts ---
  useKeyboardShortcuts(canUndo, undo, canRedo, redo, showWelcome, isPresentMode, setIsPresentMode);

  // --- Consolidated Export Handler ---
  const handleExport = useCallback(async (type: 'jozor' | 'json' | 'gedcom' | 'ics' | 'print') => {
    try {
      if (type === 'jozor') {
        downloadFile(await exportToJozorArchive(people), "family.jozor", "application/octet-stream");
      } else if (type === 'json') {
        downloadFile(JSON.stringify(people, null, 2), "tree.json", "application/json");
      } else if (type === 'gedcom') {
        downloadFile(exportToGEDCOM(people), "tree.ged", "application/octet-stream");
      } else if (type === 'ics') {
        downloadFile(generateICS(people), "family_calendar.ics", "text/calendar");
      } else if (type === 'print') {
        window.print();
      }
    } catch (e) {
      console.error(`Export to ${type} failed`, e);
      alert(`Export to ${type} failed`);
    }
  }, [people]);

  // Grouped props for Header and other components
  const historyControls: HistoryControlsProps = { onUndo: undo, onRedo: redo, canUndo, canRedo };
  const themeLanguage: ThemeLanguageProps = { darkMode, setDarkMode, language, setLanguage };
  const auth: AuthProps = { user, isDemoMode, isSyncing, onLogin: handleLoginWrapper, onLogout: handleLogoutWrapper };
  const viewSettings: ViewSettingsProps = { treeSettings, setTreeSettings, onPresent: () => setIsPresentMode(true) };
  const toolsActions: ToolsActionsProps = { onOpenModal: handleOpenModal };
  const exportActions: ExportActionsProps = { handleExport };
  const searchProps: SearchProps = { people, onFocusPerson: setFocusId };
  const familyActions: FamilyActionsProps = {
    onAddParent: (g) => handleOpenLinkModal('parent', g),
    onAddSpouse: (g) => handleOpenLinkModal('spouse', g),
    onAddChild: (g) => handleOpenLinkModal('child', g),
    onRemoveRelationship: removeRelationship,
    onLinkPerson: linkPerson,
  };

  return {
    // Core Data
    people, focusId, setFocusId, updatePerson, deletePerson, activePerson,

    // Welcome Screen
    showWelcome, fileInputRef, handleStartNewTree, onFileUpload,

    // Modals & Sidebar
    sidebarOpen, setSidebarOpen, activeModal, setActiveModal, isPresentMode, setIsPresentMode,
    linkModal, setLinkModal, handleOpenModal,
    
    // Grouped Props
    historyControls,
    themeLanguage,
    auth,
    viewSettings,
    toolsActions,
    exportActions,
    searchProps,
    familyActions,
  };
};