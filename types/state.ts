import { Person } from './person';
import { SharedTreeSummary } from '../services/supabaseTreeService';
import { TreeSettings, DriveFile } from './tree';
import { UserProfile, Language, ModalType, Gender, SyncStatus } from './common';
import { HeaderProps, HistoryControlsProps, ThemeLanguageProps, ViewSettingsProps, ToolsActionsProps, ExportActionsProps, SearchProps, FamilyActionsProps, AuthProps } from './props';

export interface FullState {
    version: number;
    people: Record<string, Person>;
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
    focusId: string;
    setFocusId: (id: string) => void;
    updatePerson: (id: string, updates: Partial<Person>) => void;
    deletePerson: (id: string) => void;
    currentTreeId: string | null;
    setCurrentTreeId: (id: string) => void;
    activePerson?: Person;
}

export interface ModalStateAndActions {
    activeModal: 'none' | ModalType;
    setActiveModal: (m: 'none' | ModalType) => void;
    linkModal: {
        isOpen: boolean;
        type: 'parent' | 'spouse' | 'child' | null;
        gender: Gender | null;
    };
    setLinkModal: (val: { isOpen: boolean; type: 'parent' | 'spouse' | 'child' | null; gender: Gender | null }) => void;
    cleanTreeOptionsModal: { isOpen: boolean };
    setCleanTreeOptionsModal: (val: { isOpen: boolean }) => void;
    googleSyncChoiceModal: { isOpen: boolean; driveFileId: string | null };
    setGoogleSyncChoiceModal: (val: { isOpen: boolean; driveFileId: string | null }) => void;
    driveFileManagerModal: { isOpen: boolean };
    setDriveFileManagerModal: (val: { isOpen: boolean }) => void;
    treeManagerModal: { isOpen: boolean };
    setTreeManagerModal: (val: { isOpen: boolean }) => void;
    handleOpenLinkModal: (type: 'parent' | 'spouse' | 'child', gender: Gender) => void;
    handleOpenModal: (modalType: ModalType) => void;
    onOpenCleanTreeOptions: () => void;
    onOpenTreeManager: () => void;
    sharedTreePromptModal: { isOpen: boolean; sharedTrees: SharedTreeSummary[] };
    setSharedTreePromptModal: (val: { isOpen: boolean; sharedTrees: SharedTreeSummary[] }) => void;
    snapshotHistoryModal: { isOpen: boolean };
    setSnapshotHistoryModal: (val: { isOpen: boolean }) => void;
    onOpenSnapshotHistory: () => void;
    adminHubModal: { isOpen: boolean };
    setAdminHubModal: (val: { isOpen: boolean }) => void;
    onOpenAdminHub: () => void;
    globalSettingsModal: { isOpen: boolean };
    setGlobalSettingsModal: (val: { isOpen: boolean }) => void;
    onOpenGlobalSettings: () => void;
}

export interface AppOrchestrationReturn {
    appState: AppStateAndActions;
    welcomeScreen: any;
    modals: ModalStateAndActions;
    googleSync: any;
    historyControls: HistoryControlsProps;
    themeLanguage: ThemeLanguageProps;
    viewSettings: ViewSettingsProps;
    toolsActions: ToolsActionsProps;
    exportActions: ExportActionsProps;
    searchProps: SearchProps;
    familyActions: FamilyActionsProps;
    isPresentMode: boolean;
    setIsPresentMode: (v: boolean) => void;
    sidebarOpen: boolean;
    setSidebarOpen: (v: boolean) => void;
    isActivityLogOpen: boolean;
    setActivityLogOpen: (v: boolean) => void;
    auth: AuthProps;
    coreFamilyActions: FamilyActionsProps;
    svgRef: React.RefObject<SVGSVGElement | null>;
}
