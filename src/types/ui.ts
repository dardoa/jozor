import type React from 'react';
import type {
    ExportType,
    Gender,
    Language,
    ModalOpenContext,
    ModalRouteType,
    SmartPersonaFieldId,
    SmartPersonaTabId,
    SmartPersonaSectionId,
    SyncStatus,
    UserProfile,
} from './common';
import type { Person } from './person';
import type { ManuscriptOrderingStrategy } from './publishing';
import type { DriveFile, TreeSettings } from './tree';

export interface HelpTranslations {
    title: string;
    description: string;
    searchPlaceholder: string;
    allCategories: string;
    topicCount: (count: number) => string;
    noResultsTitle: string;
    noResultsDescription: string;
    clearSearch: string;
    openTopic: string;
    closeTopic: string;
    audienceLabel: string;
    ownerRole: string;
    editorRole: string;
    viewerRole: string;
    requiresTree: string;
    unavailableForRole: string;
    askKindi: string;
    contactSupport: string;
    supportEmail: string;
    goHome: string;
    restartTour: string;
    zoomIn: string;
    zoomOut: string;
    resetZoom: string;
    fitToScreen: string;
    advancedSettings: string;
}

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
    t?: (key: string, fallback?: string) => string;
}

export interface AuthProps {
    user: UserProfile | null;
    isDemoMode: boolean;
    isSyncing: boolean;
    onLogin: (returnTo?: string) => Promise<void>;
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
    hasSessionError: boolean;
    isAuthorized: boolean;
    handleCreateSnapshot: (label: string) => Promise<void>;
    handleRestoreSnapshot: (snapshot: DriveFile) => Promise<void>;
    onOpenCloudBackups: () => void;
    onOpenTreeManager: () => void;
    onOpenLoginModal: (returnTo?: string) => Promise<void>;
    syncStatus: SyncStatus;
    onExport?: (type: ExportType) => void;
    onSaveToGoogleDrive?: () => Promise<void>;
    onOpenActivityLog?: () => void;
}

export interface ViewSettingsProps {
    treeSettings: TreeSettings;
    setTreeSettings: (s: TreeSettings) => void;
    onPresent: () => void;
    currentUserRole: 'owner' | 'editor' | 'viewer' | null;
    isAdvancedBarOpen: boolean;
    setAdvancedBarOpen: (v: boolean) => void;
}

export interface ToolsActionsProps {
    onOpenModal: (modalType: ModalRouteType, context?: ModalOpenContext) => void;
}

export interface HeaderGlobalActionsProps {
    onOpenTreeControlCenter: () => void;
    onOpenGlobalSettings: () => void;
    onOpenDiagnostics: () => void;
    onOpenShare: () => void;
    onOpenCleanTree: () => void;
    onOpenTreeManager: () => void;
    onOpenCloudBackups: () => void;
    onOpenActivityLog: () => void;
}

export const PUBLISHING_EXPORT_RENDERERS = {
    graphic: 'vector-pdf',
    manuscript: 'html-print',
} as const;

export type PublishingExportRenderer =
    typeof PUBLISHING_EXPORT_RENDERERS[keyof typeof PUBLISHING_EXPORT_RENDERERS];

export interface PublishingExportOptions {
    templateId: string;
    format: 'png' | 'pdf';
    renderer?: PublishingExportRenderer;
    manuscriptOptions?: {
        rootPersonId?: string;
        generationsDepth?: number | 'all';
        orderingStrategy?: ManuscriptOrderingStrategy;
        customPersonOrder?: readonly string[];
        includeImages?: boolean;
        includeNarrative?: boolean;
        includeTimeline?: boolean;
        includeEvidence?: boolean;
    };
}

export interface PublishingPreviewResult {
    title: string;
    html: string;
    pageEstimate?: number;
    citationCoverage?: number;
}

export interface ExportActionsProps {
    handleExport: (type: ExportType) => Promise<void>;
    handlePublishingExport?: (options: PublishingExportOptions) => Promise<void>;
    handlePublishingPreview?: (options: Pick<PublishingExportOptions, 'templateId' | 'renderer' | 'manuscriptOptions'>) => Promise<PublishingPreviewResult>;
}

export interface SearchProps {
    people: Record<string, Person>;
    onFocusPerson: (id: string) => void;
    onOpenPersonRecord?: (
        id: string,
        targetTab?: SmartPersonaTabId,
        targetSection?: SmartPersonaSectionId,
        targetField?: SmartPersonaFieldId
    ) => void;
}

export interface MutationActionResult {
    success: boolean;
    error?: string;
}

export type PersonUpdateHandler = (
    id: string,
    updates: Partial<Person>
) => MutationActionResult | Promise<MutationActionResult>;

export interface FamilyActionsProps {
    onAddParent: (
        gender: Gender,
        relatedPersonId?: string
    ) => MutationActionResult | Promise<MutationActionResult>;
    onAddSpouse: (gender: Gender) => MutationActionResult | Promise<MutationActionResult>;
    onAddChild: (
        gender: Gender,
        relatedPersonId?: string
    ) => MutationActionResult | Promise<MutationActionResult>;
    onAddFirstPerson: (gender: Gender) => MutationActionResult | Promise<MutationActionResult>;
    onRemoveRelationship?: (
        targetId: string,
        relativeId: string,
        type: 'parent' | 'spouse' | 'child'
    ) => MutationActionResult | Promise<MutationActionResult>;
    onLinkPerson: (
        existingId: string,
        type: 'parent' | 'spouse' | 'child' | null,
        relatedPersonId?: string
    ) => MutationActionResult | Promise<MutationActionResult>;
}

export interface HeaderProps {
    toggleDetailsPanel: () => void;
    detailsPanelOpen: boolean;
    hasActivePerson: boolean;
    historyControls: HistoryControlsProps;
    themeLanguage: ThemeLanguageProps;
    auth: AuthProps;
    viewSettings: ViewSettingsProps;
    toolsActions: ToolsActionsProps;
    exportActions: ExportActionsProps;
    searchProps: SearchProps;
    globalActions: HeaderGlobalActionsProps;
}

export interface HeaderRightSectionProps {
    themeLanguage: ThemeLanguageProps;
    auth: AuthProps;
    viewSettings: ViewSettingsProps;
    searchProps: SearchProps;
    globalActions: HeaderGlobalActionsProps;
}

export interface HeaderLeftSectionProps {
    themeLanguage: ThemeLanguageProps;
    toggleDetailsPanel: () => void;
    detailsPanelOpen: boolean;
    hasActivePerson: boolean;
    historyControls: HistoryControlsProps;
}

export type SearchInputWithResultsProps = SearchProps;

export interface ViewSettingsMenuProps {
    settings: TreeSettings;
    onUpdate: (s: TreeSettings) => void;
    onClose?: () => void;
    onPresent: () => void;
    onOpenLayoutSettings?: () => void;
}

export interface SearchResultsProps {
    results: Person[];
    query?: string;
    activeResultId?: string | null;
    onFocus: (id: string) => void;
    onClose: () => void;
    onHighlight?: (id: string | null) => void;
}

export interface CleanTreeOptionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onStartNewTree: () => void;
    onTriggerImportFile: () => void;
    language: Language;
}

export interface GoogleSyncChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onLoadCloud: (fileId: string) => Promise<void>;
    onSaveNewCloud: () => Promise<void>;
    onOpenDriveManager?: () => void;
    driveFileId: string | null;
}

export interface PersonaFooterProps {
    person: Person;
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    onDelete: (id: string) => void;
    canEdit?: boolean;
    isOwner?: boolean;
}

export interface QuickAddAction {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    colorClasses: string;
    buttonClassName?: string;
}

export interface CreateNewPersonSectionProps {
    type: 'parent' | 'spouse' | 'child' | null;
    gender: Gender | null;
    familyActions: FamilyActionsProps;
    relatedPersonId?: string;
    requiresRelatedPerson?: boolean;
    onClose: () => void;
}

export interface SelectExistingPersonSectionProps {
    people: Record<string, Person>;
    type: 'parent' | 'spouse' | 'child' | null;
    gender: Gender | null;
    currentPersonId: string;
    familyActions: FamilyActionsProps;
    relatedPersonId?: string;
    requiresRelatedPerson?: boolean;
    autoFocusSearch?: boolean;
    onClose: () => void;
}
