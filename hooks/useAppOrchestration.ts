import { useState, useEffect, useRef, useCallback } from 'react';
import { Person, Gender, Language, TreeSettings, UserProfile } from '../types';
import { useFamilyTree } from './useFamilyTree';
import { useGoogleSync } from './useGoogleSync';
import { useThemeSync } from './useThemeSync';
import { useLanguageSync } from './useLanguageSync';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useModalAndSidebarLogic } from './useModalAndSidebarLogic'; // Renamed import
import { useTreeSettings } from './useTreeSettings';
import { useWelcomeScreenLogic } from './useWelcomeScreenLogic';
import { getTranslation } from '../utils/translations';
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

  const t = getTranslation(language);
  const activePerson = people[focusId];

  // Calculate canUndo/canRedo
  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  // --- Welcome Screen Logic ---
  const {
    showWelcome, fileInputRef,
    handleStartNewTree, onFileUpload, handleLoginWrapper, handleLogoutWrapper
  } = useWelcomeScreenLogic({
    people, t, startNewTree, stopSyncing, handleImport, handleLogin, handleLogout
  });

  // --- Modal & Sidebar Logic ---
  const {
    sidebarOpen, setSidebarOpen,
    activeModal, setActiveModal,
    isPresentMode, setIsPresentMode,
    linkModal, setLinkModal,
    handleOpenLinkModal,
    handleCreateNewRelative,
    handleSelectExistingRelative,
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

  return {
    // Core Data
    people, focusId, setFocusId, updatePerson, deletePerson, removeRelationship, activePerson,

    // History
    undo, redo, canUndo, canRedo,

    // Sync & Auth
    user, isSyncing, isDemoMode, handleLoginWrapper, handleLogoutWrapper,

    // UI Preferences
    language, setLanguage, treeSettings, setTreeSettings, darkMode, setDarkMode, t,

    // Welcome Screen
    showWelcome, fileInputRef, handleStartNewTree, onFileUpload,

    // Modals & Sidebar
    sidebarOpen, setSidebarOpen, activeModal, setActiveModal, isPresentMode, setIsPresentMode,
    linkModal, setLinkModal, handleOpenLinkModal, handleCreateNewRelative, handleSelectExistingRelative,
    handleOpenModal,

    // Actions
    handleExport,
  };
};