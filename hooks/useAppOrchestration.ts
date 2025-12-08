import { useState, useCallback } from 'react';
import { Person, Gender, HistoryControlsProps, ThemeLanguageProps, AuthProps, ViewSettingsProps, ToolsActionsProps, ExportActionsProps, SearchProps, FamilyActionsProps } from '../types';
import { useFamilyTree } from './useFamilyTree';
import { useGoogleSync } from './useGoogleSync';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useModalAndSidebarLogic } from './useModalAndSidebarLogic';
import { useTreeSettings } from './useTreeSettings';
import { useWelcomeScreenLogic } from './useWelcomeScreenLogic';
import { useThemeSync } from './useThemeSync'; // Added this import
import { exportToGEDCOM } from '../utils/gedcomLogic';
import { exportToJozorArchive } from '../utils/archiveLogic';
import { generateICS } from '../utils/calendarLogic';
import { downloadFile } from '../utils/fileUtils';
import { useTranslation } from '../context/TranslationContext';
import { showError } from '../utils/toast';

export const useAppOrchestration = () => {
  // --- Core Data & History ---
  const {
    people, focusId, setFocusId, history, future, undo, redo,
    updatePerson, deletePerson, addParent, addSpouse, addChild, removeRelationship, linkPerson,
    handleImport, startNewTree, loadCloudData
  } = useFamilyTree();

  // --- Modal & Sidebar Logic ---
  const {
    sidebarOpen, setSidebarOpen,
    activeModal, setActiveModal,
    isPresentMode, setIsPresentMode,
    linkModal, setLinkModal,
    handleOpenLinkModal,
    handleOpenModal,
  } = useModalAndSidebarLogic({
    canUndo: history.length > 0,
    canRedo: future.length > 0,
  });

  // New state for CleanTreeOptionsModal
  const [cleanTreeOptionsModal, setCleanTreeOptionsModal] = useState<{ isOpen: boolean }>({ isOpen: false });
  const onOpenCleanTreeOptions = useCallback(() => {
    setCleanTreeOptionsModal({ isOpen: true });
  }, []);

  // New state for GoogleSyncChoiceModal
  const [googleSyncChoiceModal, setGoogleSyncChoiceModal] = useState<{ isOpen: boolean; driveFileId: string | null; }>({ isOpen: false, driveFileId: null });
  const onOpenGoogleSyncChoice = useCallback((fileId: string) => {
    setGoogleSyncChoiceModal({ isOpen: true, driveFileId: fileId });
  }, []);
  const onCloseGoogleSyncChoice = useCallback(() => {
    setGoogleSyncChoiceModal({ isOpen: false, driveFileId: null });
  }, []);

  // New state for DriveFileManagerModal
  const [driveFileManagerModal, setDriveFileManagerModal] = useState<{ isOpen: boolean }>({ isOpen: false });
  const onOpenDriveFileManager = useCallback(() => {
    console.log("onOpenDriveFileManager called, setting driveFileManagerModal.isOpen to true"); // Added log
    setDriveFileManagerModal({ isOpen: true });
  }, []);

  // --- Sync & Auth ---
  const { 
    user, isSyncing, isDemoMode, handleLogin, handleLogout, stopSyncing, 
    onLoadCloudData, onSaveNewCloudFile,
    driveFiles, currentActiveDriveFileId, refreshDriveFiles,
    handleLoadDriveFile, handleSaveAsNewDriveFile, handleOverwriteExistingDriveFile, handleDeleteDriveFile,
    isSavingDriveFile, isDeletingDriveFile, isListingDriveFiles,
  } = useGoogleSync(
    people, 
    loadCloudData,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice
  );

  // --- UI Preferences ---
  const { language, setLanguage } = useTranslation();
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
    people, startNewTree, stopSyncing, handleImport
  });

  // --- Login/Logout Handlers (now directly from useGoogleSync) ---
  const onLogin = useCallback(async () => {
      const success = await handleLogin();
      if (success) setShowWelcome(false);
  }, [handleLogin, setShowWelcome]);

  const onLogout = useCallback(async () => {
      await handleLogout();
      setShowWelcome(true);
  }, [handleLogout, setShowWelcome]);

  // Adjusted onTriggerImportFile to directly trigger file input
  const onTriggerImportFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
      showError(`Export to ${type} failed`);
    }
  }, [people]);

  // Grouped props for Header and other components
  const historyControls: HistoryControlsProps = { onUndo: undo, onRedo: redo, canUndo, canRedo };
  const themeLanguage: ThemeLanguageProps = { darkMode, setDarkMode, language, setLanguage };
  const auth: AuthProps = { user, isDemoMode, isSyncing, onLogin, onLogout, onOpenDriveFileManager };
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
    linkModal, setLinkModal, cleanTreeOptionsModal, setCleanTreeOptionsModal,
    googleSyncChoiceModal, setGoogleSyncChoiceModal,
    driveFileManagerModal, setDriveFileManagerModal,
    handleOpenLinkModal, handleOpenModal, onOpenCleanTreeOptions,
    
    // Grouped Props
    historyControls,
    themeLanguage,
    auth,
    viewSettings,
    toolsActions,
    exportActions,
    searchProps,
    familyActions,
    startNewTree,
    onTriggerImportFile,
    onLoadCloudData,
    onSaveNewCloudFile,
    // New Drive file management props
    driveFiles,
    currentActiveDriveFileId,
    refreshDriveFiles,
    handleLoadDriveFile,
    handleSaveAsNewDriveFile,
    handleOverwriteExistingDriveFile,
    handleDeleteDriveFile,
    isSavingDriveFile,
    isDeletingDriveFile,
    isListingDriveFiles,
  };
};