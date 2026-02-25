import { Gender, Language, SyncStatus, ModalType, ExportType, UserProfile } from './common';
import { TreeSettings, DriveFile } from './tree';
import { Person } from './person';
import { TreeNode, TreeLink } from './visualization';

export interface HistoryControlsProps {
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

export interface ThemeLanguageProps {
    darkMode: boolean;
    setDarkMode: (v: boolean) => void;
    language: Language;
    setLanguage: (l: Language) => void;
}

export interface AuthProps {
    user: UserProfile | null;
    isDemoMode: boolean;
    isSyncing: boolean;
    onLogin: () => Promise<void>;
    onLogout: () => Promise<void>;
    stopSyncing: () => void;
    onLoadCloudData: (fileId: string) => Promise<void>;
    onSaveNewCloudFile: () => Promise<void>;
    driveFiles: DriveFile[];
    currentActiveDriveFileId: string | null;
    fileOwnerUid: string | null;
    refreshDriveFiles: () => Promise<void>;
    handleLoadDriveFile: (fileId: string, ownerUid?: string) => Promise<void>;
    handleSaveAsNewDriveFile: (fileName: string) => Promise<void>;
    handleOverwriteExistingDriveFile: (fileId: string, silent?: boolean) => Promise<void>;
    handleDeleteDriveFile: (fileId: string) => Promise<void>;
    isSavingDriveFile: boolean;
    isDeletingDriveFile: boolean;
    isListingDriveFiles: boolean;
    handleCreateSnapshot: (label: string) => Promise<void>;
    handleRestoreSnapshot: (snapshot: DriveFile) => Promise<void>;
    onOpenDriveFileManager: () => void;
    onOpenTreeManager: () => void;
    onOpenLoginModal: () => Promise<void>;
    syncStatus: SyncStatus;
    onExport?: (type: ExportType) => void;
    onSaveToGoogleDrive?: () => Promise<void>;
    onOpenActivityLog?: () => void;
}

export interface ViewSettingsProps {
    treeSettings: TreeSettings;
    setTreeSettings: (s: TreeSettings) => void;
    onPresent: () => void;
    onOpenSnapshotHistory?: () => void;
    currentUserRole: 'owner' | 'editor' | 'viewer' | null;
    onOpenAdminHub?: () => void;
    isAdvancedBarOpen: boolean;
    setAdvancedBarOpen: (v: boolean) => void;
}

export interface ToolsActionsProps {
    onOpenModal: (modalType: ModalType) => void;
}

export interface ExportActionsProps {
    handleExport: (type: ExportType) => Promise<void>;
}

export interface SearchProps {
    people: Record<string, Person>;
    onFocusPerson: (id: string) => void;
}

export interface FamilyActionsProps {
    onAddParent: (gender: Gender) => void;
    onAddSpouse: (gender: Gender) => void;
    onAddChild: (gender: Gender) => void;
    onRemoveRelationship?: (
        targetId: string,
        relativeId: string,
        type: 'parent' | 'spouse' | 'child'
    ) => void;
    onLinkPerson: (existingId: string, type: 'parent' | 'spouse' | 'child' | null) => void;
}

export interface HeaderProps {
    toggleSidebar: () => void;
    historyControls: HistoryControlsProps;
    themeLanguage: ThemeLanguageProps;
    auth: AuthProps;
    viewSettings: ViewSettingsProps;
    toolsActions: ToolsActionsProps;
    exportActions: ExportActionsProps;
    searchProps: SearchProps;
}
