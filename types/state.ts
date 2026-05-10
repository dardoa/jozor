import type React from 'react';
import type { SharedTreeSummary } from '../services/supabaseTreeService';
import type { Gender, GeographicJourneyMode, Language, ModalType, UserProfile } from './common';
import type { Person } from './person';
import type { LocationData, LocationStatus, TreeSettings } from './tree';
import type {
    AuthProps,
    ExportActionsProps,
    FamilyActionsProps,
    HistoryControlsProps,
    MutationActionResult,
    SearchProps,
    ThemeLanguageProps,
    ToolsActionsProps,
    ViewSettingsProps,
} from './ui';

export interface FullState {
    version: number;
    people: Record<string, Person>;
    locations?: Record<string, LocationData>;
    settings: {
        treeSettings?: TreeSettings;
        darkMode?: boolean;
        language?: Language;
    };
    focusId?: string;
    metadata?: {
        lastModified: number;
        appName: string;
        lastModifiedBy?: string;
        device?: string;
    };
}

export interface AppStateAndActions {
    people: Record<string, Person>;
    locations: Record<string, LocationData>;
    addLocation: (placeName: string, data: LocationData) => void;
    updateLocationStatus: (placeName: string, status: LocationStatus) => void;
    focusId: string;
    setFocusId: (id: string) => void;
    updatePerson: (id: string, updates: Partial<Person>) => MutationActionResult | Promise<MutationActionResult>;
    deletePerson: (id: string) => Promise<MutationActionResult>;
    currentTreeId: string | null;
    setCurrentTreeId: (id: string) => void;
    activePerson?: Person;
}

export interface WelcomeScreenLogicProps {
    showWelcome: boolean;
    setShowWelcome: (show: boolean) => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    handleStartNewTree: () => void;
    onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
    onTriggerImportFile: () => void;
}

export interface TreeManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    ownerId: string;
    activeTreeId: string | null;
    onTreeSelected: (treeId: string) => void;
}

export interface LinkModalState {
    isOpen: boolean;
    type: 'parent' | 'spouse' | 'child' | null;
    gender: Gender | null;
    initialMode?: 'create' | 'existing';
}

export interface ModalStateAndActions {
    activeModal: 'none' | ModalType;
    setActiveModal: (m: 'none' | ModalType) => void;
    geographicJourneyMode: GeographicJourneyMode;
    setGeographicJourneyMode: (mode: GeographicJourneyMode) => void;
    linkModal: LinkModalState;
    setLinkModal: (val: LinkModalState) => void;
    cleanTreeOptionsModal: { isOpen: boolean };
    setCleanTreeOptionsModal: (val: { isOpen: boolean }) => void;
    googleSyncChoiceModal: { isOpen: boolean; driveFileId: string | null };
    setGoogleSyncChoiceModal: (val: { isOpen: boolean; driveFileId: string | null }) => void;
    driveFileManagerModal: { isOpen: boolean };
    setDriveFileManagerModal: (val: { isOpen: boolean }) => void;
    treeManagerModal: { isOpen: boolean };
    setTreeManagerModal: (val: { isOpen: boolean }) => void;
    handleOpenLinkModal: (
        type: 'parent' | 'spouse' | 'child',
        gender: Gender,
        options?: { initialMode?: 'create' | 'existing' }
    ) => void;
    handleOpenModal: (modalType: ModalType) => void;
    onOpenCleanTreeOptions: () => void;
    onOpenTreeManager: () => void;
    sharedTreePromptModal: { isOpen: boolean; sharedTrees: SharedTreeSummary[] };
    setSharedTreePromptModal: (val: { isOpen: boolean; sharedTrees: SharedTreeSummary[] }) => void;
    snapshotHistoryModal: { isOpen: boolean };
    setSnapshotHistoryModal: (val: { isOpen: boolean }) => void;
    onOpenSnapshotHistory: () => void;
    globalSettingsModal: { isOpen: boolean };
    setGlobalSettingsModal: (val: { isOpen: boolean }) => void;
    onOpenGlobalSettings: () => void;
}

export interface GoogleSyncStateAndActions {
    user: UserProfile | null;
    isDemoMode: boolean;
    onLogin: () => Promise<void>;
    onLogout: () => Promise<void>;
    onLoadCloudData: (fileId: string) => Promise<void>;
    onSaveNewCloudFile: () => Promise<void>;
    onOpenDriveFileManager: () => void;
    driveFiles: import('./tree').DriveFile[];
    currentActiveDriveFileId: string | null;
    refreshDriveFiles: () => Promise<void>;
    handleLoadDriveFile: (fileId: string) => Promise<void>;
    handleSaveAsNewDriveFile: (fileName: string) => Promise<void>;
    handleOverwriteExistingDriveFile: (fileId: string) => Promise<void>;
    handleDeleteDriveFile: (fileId: string) => Promise<void>;
    isSaving: boolean;
    isDeleting: boolean;
    isListing: boolean;
    hasSessionError: boolean;
    isAuthorized: boolean;
    setShowWelcome: (show: boolean) => void;
    handleCreateSnapshot: (label: string) => Promise<void>;
    handleRestoreSnapshot: (snapshot: import('./tree').DriveFile) => Promise<void>;
    onSaveToGoogleDrive?: () => Promise<void>;
    stopSyncing: () => void;
}

export interface AppOrchestrationReturn {
    appState: AppStateAndActions;
    welcomeScreen: WelcomeScreenLogicProps;
    modals: ModalStateAndActions;
    googleSync: GoogleSyncStateAndActions;
    historyControls: HistoryControlsProps;
    themeLanguage: ThemeLanguageProps;
    viewSettings: ViewSettingsProps;
    toolsActions: ToolsActionsProps;
    exportActions: ExportActionsProps;
    searchProps: SearchProps;
    sidebarFamilyActions: FamilyActionsProps;
    isPresentMode: boolean;
    setIsPresentMode: (v: boolean) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (v: boolean) => void;
    isActivityLogOpen: boolean;
    setActivityLogOpen: (v: boolean) => void;
    auth: AuthProps;
    coreFamilyActions: FamilyActionsProps;
    svgRef: React.RefObject<SVGSVGElement | null>;
    isSettingsDrawerOpen: boolean;
    setSettingsDrawerOpen: (v: boolean) => void;
    onAddPerson: () => void;
}
