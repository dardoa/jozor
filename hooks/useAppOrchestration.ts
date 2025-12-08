import { useState, useCallback } from 'react';
import { 
  HistoryControlsProps, ThemeLanguageProps, 
  ViewSettingsProps, ToolsActionsProps, ExportActionsProps, SearchProps, 
  FamilyActionsProps, AppStateAndActions, WelcomeScreenLogicProps, 
  ModalStateAndActions, GoogleSyncStateAndActions, AppOrchestrationReturn, Gender
} from '../types';
import { useFamilyTree } from './useFamilyTree';
import { useGoogleSync } from './useGoogleSync';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { useModalAndSidebarLogic } from './useModalAndSidebarLogic';
import { useTreeSettings } from './useTreeSettings';
import { useWelcomeScreenLogic } from './useWelcomeScreenLogic';
import { useThemeSync } from './useThemeSync';
import { exportToGEDCOM } from '../utils/gedcomLogic';
import { exportToJozorArchive } from '../utils/archiveLogic';
import { generateICS } from '../utils/calendarLogic';
import { downloadFile } from '../utils/fileUtils';
import { useTranslation } from '../context/TranslationContext';
import { showError } from '../utils/toast';

export const useAppOrchestration = (): AppOrchestrationReturn => {
  // --- Core Data & History ---
  const {
    people, focusId, setFocusId, history, future, undo, redo,
    updatePerson, deletePerson,
    removeRelationship, linkPerson,
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
    console.log("onOpenDriveFileManager called, setting driveFileManagerModal.isOpen to true");
    setDriveFileManagerModal({ isOpen: true });
  }, []);

  // --- Sync & Auth ---
  const googleSync = useGoogleSync( // Renamed from `const { ... } = useGoogleSync(...)` to `const googleSync = ...`
    people, 
    loadCloudData,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice
  );

  // --- UI Preferences ---
  const { language, setLanguage } = useTranslation();
  const { treeSettings, setTreeSettings } = useTreeSettings();
  const { darkMode, setDarkMode } = useThemeSync();

  const activePerson = people[focusId];

  // Calculate canUndo/canRedo
  const canUndo = history.length > 0;
  const canRedo = future.length > 0;

  // --- Welcome Screen Logic ---
  const {
    showWelcome, setShowWelcome, fileInputRef,
    handleStartNewTree, onFileUpload
  } = useWelcomeScreenLogic({
    people, startNewTree, stopSyncing: googleSync.stopSyncing, handleImport // Use googleSync.stopSyncing
  });

  // --- Login/Logout Handlers (now directly from useGoogleSync) ---
  const onLogin = useCallback(async () => {
      const success = await googleSync.handleLogin(); // Use googleSync.handleLogin
      if (success) setShowWelcome(false);
  }, [googleSync.handleLogin, setShowWelcome]);

  const onLogout = useCallback(async () => {
      await googleSync.handleLogout(); // Use googleSync.handleLogout
      setShowWelcome(true);
  }, [googleSync.handleLogout, setShowWelcome]);

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
  // const auth: AuthProps = { user, isDemoMode, isSyncing, onLogin, onLogout, onOpenDriveFileManager }; // Removed as googleSync is passed directly
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

  // New grouped objects for return
  const appState: AppStateAndActions = {
    people, focusId, setFocusId, updatePerson, deletePerson, activePerson
  };

  const welcomeScreenReturn: WelcomeScreenLogicProps = { // Renamed to avoid conflict with hook return
    showWelcome, fileInputRef, handleStartNewTree, onFileUpload, onTriggerImportFile
  };

  const modalsReturn: ModalStateAndActions = { // Renamed to avoid conflict with hook return
    activeModal, setActiveModal, linkModal, setLinkModal,
    cleanTreeOptionsModal, setCleanTreeOptionsModal,
    googleSyncChoiceModal, setGoogleSyncChoiceModal,
    driveFileManagerModal, setDriveFileManagerModal,
    handleOpenLinkModal, handleOpenModal, onOpenCleanTreeOptions
  };

  return {
    appState,
    welcomeScreen: welcomeScreenReturn, // Use renamed object
    modals: modalsReturn, // Use renamed object
    googleSync,
    historyControls,
    themeLanguage,
    viewSettings,
    toolsActions,
    exportActions,
    searchProps,
    familyActions,
    isPresentMode,
    setIsPresentMode,
    sidebarOpen,
    setSidebarOpen,
  };
};