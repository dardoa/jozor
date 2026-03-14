import * as React from 'react';
import { useRef, useCallback, useEffect } from 'react';
import {
  HistoryControlsProps,
  ThemeLanguageProps,
  ViewSettingsProps,
  ToolsActionsProps,
  ExportActionsProps,
  SearchProps,
  FamilyActionsProps,
  AppStateAndActions,
  WelcomeScreenLogicProps,
  ModalStateAndActions,
  AppOrchestrationReturn,
  AuthProps,
  Gender,
  Person,
  ExportType,
} from '../types';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts, ShortcutMap } from './useKeyboardShortcuts';
import { useUIAndSettingsOrchestrator } from './useUIAndSettingsOrchestrator';
import { useExport } from './useExport';
import { useModalOrchestrator } from './useModalOrchestrator';
import { useAuthAndSyncOrchestrator } from './useAuthAndSyncOrchestrator';
import { performAddChild, performAddParent, performAddSpouse, performLinkPerson } from '../utils/treeOperations';
import { useTreeActions } from './useTreeActions';
import {
  savePerson,
  deletePerson as deletePersonFromSupabase,
  saveRelationship,
  deleteRelationship,
  createPersonAndRelationshipAtomic,
} from '../services/supabaseTreeService';

export const useAppOrchestration = (isSharedMode: boolean = false): AppOrchestrationReturn => {
  // Core state from Zustand store (single source of truth)
  const people = useAppStore((state) => state.people);
  const focusId = useAppStore((state) => state.focusId);
  const setFocusId = useAppStore((state) => state.setFocusId);


  const treeActions = useTreeActions();
  const history = useAppStore((state) => state.history);
  const future = useAppStore((state) => state.future);
  const undo = useAppStore((state) => state.undo);
  const redo = useAppStore((state) => state.redo);
  const removeRelationship = treeActions.removeRelationship;
  const linkPerson = treeActions.linkPerson;
  const startNewTree = useAppStore((state) => state.startNewTree);

  // Ref for Exporting Visuals
  const svgRef = useRef<SVGSVGElement>(null);

  // Auth state from Zustand (Firebase-based)
  const user = useAppStore((state) => state.user);
  const currentTreeId = useAppStore((state) => state.currentTreeId);
  const setCurrentTreeId = useAppStore((state) => state.setCurrentTreeId);
  const currentUserRole = useAppStore((state) => state.currentUserRole);
  const {
    sidebarOpen,
    setSidebarOpen,
    isPresentMode,
    setIsPresentMode,
    modals,
    handleOpenModal,
    handleOpenLinkModal,
    onOpenSnapshotHistory,
    onOpenTreeManager,
    onOpenAdminHub,
    onOpenGlobalSettings,
    onOpenDriveFileManager,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
  } = useModalOrchestrator();

  const { handleExport: rawHandleExport } = useExport(people, svgRef);

  // Wrap with debug logging
  const handleExport = useCallback(async (type: any) => {
    console.log('🎯 Export triggered:', type);
    console.log('📊 People count:', Object.keys(people).length);
    console.log('🖼️ SVG Ref:', svgRef.current ? 'Available' : 'Missing');
    try {
      await rawHandleExport(type);
      console.log('✅ Export completed');
    } catch (error) {
      console.error('❌ Export failed:', error);
    }
  }, [rawHandleExport, people]);

  const {
    welcomeScreen,
    themeLanguage,
    viewSettings,
    searchProps,
    setShowWelcome,
  } = useUIAndSettingsOrchestrator({
    people,
    startNewTree,
    focusId,
    setFocusId,
    currentUserRole,
    setIsPresentMode,
    onOpenSnapshotHistory,
    onOpenAdminHub,
  });

  // UI Helpers
  const activePerson = people[focusId];
  const canUndo = history.length > 0;
  const canRedo = future.length > 0;
  const navigate = useNavigate();

  const shortcuts: ShortcutMap = {
    'ctrl+z': () => canUndo && undo(),
    'ctrl+y': () => canRedo && redo(),
    'ctrl+shift+z': () => canRedo && redo(),
    'escape': () => isPresentMode && setIsPresentMode(false),
    '?': () => navigate('/help'),
    '/': () => navigate('/help'), // Alternative help shortcut
  };

  useKeyboardShortcuts(shortcuts, !welcomeScreen.showWelcome);

  // Auto-open sidebar ONLY when a new person is selected
  const lastFocusIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (focusId && focusId !== lastFocusIdRef.current && !isPresentMode) {
      setSidebarOpen(true);
    }
    lastFocusIdRef.current = focusId;
  }, [focusId, isPresentMode, setSidebarOpen]);

  const {
    auth,
    googleSync,
    syncStatus,
    isActivityLogOpen,
    setActivityLogOpen,
  } = useAuthAndSyncOrchestrator({
    isSharedMode,
    people,
    setShowWelcome,
    onOpenGoogleSyncChoice,
    onCloseGoogleSyncChoice,
    onOpenDriveFileManager,
    onOpenTreeManager,
    setSharedTreePromptModal: modals.setSharedTreePromptModal,
    onOpenLoginModal: async () => handleOpenModal('login'),
    onExport: handleExport,
  });

  // Prop Grouping
  const historyControls: HistoryControlsProps = { onUndo: undo, onRedo: redo, canUndo, canRedo };

  const toolsActions: ToolsActionsProps = { onOpenModal: handleOpenModal };
  const exportActions: ExportActionsProps = { handleExport };
  const sidebarFamilyActions: FamilyActionsProps = {
    onAddParent: (g) => handleOpenLinkModal('parent', g),
    onAddSpouse: (g) => handleOpenLinkModal('spouse', g),
    onAddChild: (g) => handleOpenLinkModal('child', g),
    onAddFirstPerson: (g) => treeActions.addFirstPerson(g),
    onRemoveRelationship: (targetId, relativeId, type) => treeActions.removeRelationship(targetId, relativeId, type),
    onLinkPerson: (existingId, type) => type && treeActions.linkPerson(existingId, type),
  };

  const coreFamilyActions: FamilyActionsProps = {
    onAddParent: (g) => treeActions.addParent(g),
    onAddSpouse: (g) => treeActions.addSpouse(g),
    onAddChild: (g) => treeActions.addChild(g),
    onAddFirstPerson: (g) => treeActions.addFirstPerson(g),
    onRemoveRelationship: (targetId, relativeId, type) => treeActions.removeRelationship(targetId, relativeId, type),
    onLinkPerson: (existingId, type) => type && treeActions.linkPerson(existingId, type),
  };

  const appState: AppStateAndActions = {
    people,
    focusId,
    setFocusId,
    updatePerson: (id, updates) => treeActions.updatePerson(id, updates),
    deletePerson: (id) => treeActions.deletePerson(id),
    currentTreeId,
    setCurrentTreeId,
    activePerson,
  };

  const modalsReturn: ModalStateAndActions = modals;

  return {
    appState,
    welcomeScreen,
    modals: modalsReturn,
    googleSync,
    historyControls,
    themeLanguage,
    viewSettings,
    toolsActions,
    exportActions,
    searchProps,
    sidebarFamilyActions,
    coreFamilyActions,
    svgRef,
    isPresentMode,
    setIsPresentMode,
    sidebarOpen,
    setSidebarOpen,
    isActivityLogOpen,
    setActivityLogOpen,
    auth,
  };
};
