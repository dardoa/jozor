// ==========================================
// Domain Models (Core Data)
// ==========================================

export type Gender = 'male' | 'female';
export type RelationshipStatus = 'married' | 'divorced' | 'engaged' | 'separated';
export type Language = 'en' | 'ar';
export type ChartType = 'descendant' | 'fan' | 'pedigree' | 'force';
export type AppTheme = 'modern' | 'vintage' | 'blueprint' | 'dark';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  supabaseToken?: string;
  metadata?: {
    has_completed_tour?: boolean;
    [key: string]: any;
  };
}

export interface RelationshipInfo {
  type: RelationshipStatus;
  startDate: string;
  startPlace?: string;
  endDate?: string;
  endPlace?: string;
}

export interface TreeSettings {
  showPhotos: boolean;
  showFirstName: boolean;
  showDates: boolean;
  showBirthDate: boolean;
  showMarriageDate: boolean;
  showDeathDate: boolean;
  showBirthPlace: boolean;
  showMarriagePlace: boolean;
  showBurialPlace: boolean;
  showResidence: boolean;
  showMiddleName: boolean;
  showLastName: boolean;
  showNickname: boolean;
  showMinimap: boolean;
  layoutMode: 'vertical' | 'horizontal' | 'radial';
  isCompact: boolean;
  chartType: ChartType;
  theme: AppTheme;
  enableForcePhysics?: boolean;
  enableTimeOffset?: boolean;
  timeScaleFactor?: number;
  lineStyle?: 'curved' | 'straight' | 'step';
  lineThickness?: number;
  showDeceased: boolean;
  showGender?: boolean;
  showOccupation?: boolean;
  showSuffix?: boolean;
  showPrefix?: boolean;
  showMaidenName?: boolean;
  highlightBranch: boolean;
  highlightedBranchRootId?: string | null;
  // Layout Settings
  nodeSpacingX: number;
  nodeSpacingY: number;
  nodeWidth: number;
  textSize: number;
  themeColor: string;
  boxColorLogic: 'gender' | 'lineage' | 'none';
  generationLimit: number;
  dateFormat?: 'iso' | 'eu' | 'us' | 'long';
  isRtl?: boolean;
  isLowGraphicsMode?: boolean;
}

export interface Person {
  id: string;
  // Identity
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  birthName: string;
  nickName: string;
  suffix: string;
  gender: Gender;

  // Vital Stats
  birthDate: string;
  birthPlace: string;
  birthSource: string;
  marriageDate?: string;
  marriagePlace?: string;
  deathDate: string;
  deathPlace: string;
  deathSource: string;
  burialPlace: string;
  residence: string;
  isDeceased: boolean;

  // Biographical
  profession: string;
  company: string;
  interests: string;
  bio: string;
  photoUrl?: string;
  gallery: string[];
  voiceNotes: string[];
  sources: { id: string; title: string; url?: string; date?: string; type?: string }[];
  events: {
    id: string;
    title: string;
    date: string;
    place?: string;
    description?: string;
    type?: string;
  }[];

  // Contact
  email: string;
  website: string;
  blog: string;
  address: string;

  // Relationships (stored as IDs)
  parents: string[];
  spouses: string[];
  children: string[];

  // Metadata for relationships (Keyed by Spouse ID)
  partnerDetails?: Record<string, RelationshipInfo>;

  // Privacy & Access
  isPrivate?: boolean;
}

export interface FamilyData {
  people: Record<string, Person>;
  rootId: string;
}

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string; // ISO string
}

export interface TimelineEvent {
  year: number;
  dateStr: string;
  type: 'birth' | 'death' | 'marriage' | 'custom';
  personId: string;
  relatedId?: string; // For marriage events, the spouse's ID
  label: string;
  subLabel?: string;
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface Collaborator {
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'active' | 'pending';
  avatar?: string;
}

// ==========================================
// Visualization & Graph Models
// ==========================================

export interface TreeNode {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  data: Person;
  type: 'focus' | 'spouse' | 'parent' | 'child' | 'sibling' | 'ancestor' | 'descendant';
  startAngle?: number;
  endAngle?: number;
  depth?: number;
  staggerLevel?: number;
  gridRow?: number;
  gridCol?: number;
  familyPodId?: string;
  isReference?: boolean;
}

export interface TreeLink {
  source: string | TreeNode;
  target: string | TreeNode;
  type: 'parent-child' | 'marriage';
  customOrigin?: { x: number; y: number };
}

export interface FanArc {
  id: string;
  person: Person;
  startAngle: number;
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  depth: number;
  value: number;
  hasChildren: boolean;
}

// ==========================================
// Props Interfaces
// ==========================================

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

export type SyncState = 'synced' | 'saving' | 'error' | 'offline';

export interface SyncStatus {
  state: SyncState;
  lastSyncTime: Date | null;
  lastSyncSupabase: Date | null;
  lastSyncDrive: Date | null;
  supabaseStatus: 'idle' | 'syncing' | 'error';
  driveStatus: 'idle' | 'uploading' | 'error';
  errorMessage?: string;
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

export type ModalType =
  | 'calculator'
  | 'stats'
  | 'chat'
  | 'consistency'
  | 'timeline'
  | 'share'
  | 'story'
  | 'map'
  | 'layoutSettings'
  | 'login'
  | 'snapshotHistory'
  | 'adminHub'
  | 'globalSettings';

export interface FullState {
  version: number;
  people: Record<string, Person>;
  settings: {
    treeSettings?: TreeSettings;
    darkMode?: boolean;
    language?: 'en' | 'ar';
  };
  focusId?: string;
  metadata?: {
    lastModified: number;
    appName: string;
    lastModifiedBy?: string;
    device?: string;
  };
}

export interface ToolsActionsProps {
  onOpenModal: (modalType: ModalType) => void;
}

export type ExportType = 'jozor' | 'json' | 'gedcom' | 'ics' | 'print' | 'png' | 'pdf' | 'svg' | 'jpeg';

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

// Derived Props for Header Sections
export interface HeaderRightSectionProps {
  themeLanguage: ThemeLanguageProps;
  auth: AuthProps;
  viewSettings: ViewSettingsProps;
  toolsActions: ToolsActionsProps;
  exportActions: ExportActionsProps;
  searchProps: SearchProps;
}

export interface HeaderLeftSectionProps {
  themeLanguage: ThemeLanguageProps;
  toggleSidebar: () => void;
  historyControls: HistoryControlsProps;
}

export type SearchInputWithResultsProps = SearchProps;

export interface ToolsMenuProps {
  onClose?: () => void;
  onOpenModal: (modalType: ModalType) => void;
  onBack?: () => void;
}

export interface ViewSettingsMenuProps {
  settings: TreeSettings;
  onUpdate: (s: TreeSettings) => void;
  onClose?: () => void;
  onPresent: () => void;
  onOpenLayoutSettings?: () => void;
  onOpenSnapshotHistory?: () => void;
}

export interface UserMenuProps {
  user: UserProfile;
  isDemoMode: boolean;
  onLogout: () => void;
  onClose?: () => void;
  onOpenDriveFileManager: () => void;
  onOpenTreeManager: () => void;
  themeLanguage: ThemeLanguageProps;
  onOpenModal?: (modalType: ModalType) => void;
  onExport?: (type: ExportType) => void;
  onOpenActivityLog?: () => void;
}

export interface ExportMenuProps {
  onClose?: () => void;
  onExport: (type: ExportType) => void;
  onBack?: () => void;
}

export interface SearchResultsProps {
  results: Person[];
  onFocus: (id: string) => void;
  onClose: () => void;
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
  onOpenDriveManager?: () => void; // Optional: Open Drive File Manager to choose file
  driveFileId: string | null;
}

export interface DriveFileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: DriveFile[];
  currentActiveFileId: string | null;
  onLoadFile: (fileId: string) => Promise<void>;
  onSaveAsNewFile: (fileName: string) => Promise<void>;
  onOverwriteExistingFile: (fileId: string) => Promise<void>;
  onDeleteFile: (fileId: string) => Promise<void>;
  refreshDriveFiles: () => Promise<void>;
  isSaving: boolean;
  isDeleting: boolean;
  isListing: boolean;
  onImportLocalFile: (data: unknown) => Promise<void>;
}

export interface SidebarFooterProps {
  person: Person;
  isEditing: boolean;
  setIsEditing: (v: boolean) => void;
  onDelete: (id: string) => void;
  onOpenCleanTreeOptions: () => void;
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
  onClose: () => void;
}

export interface SelectExistingPersonSectionProps {
  people: Record<string, Person>;
  type: 'parent' | 'spouse' | 'child' | null;
  gender: Gender | null;
  currentPersonId: string;
  familyActions: FamilyActionsProps;
  onClose: () => void;
}

// ==========================================
// Application Logic & State (Hooks)
// ==========================================

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
}

export interface ModalStateAndActions {
  activeModal: 'none' | ModalType;
  setActiveModal: (m: 'none' | ModalType) => void;
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
  handleOpenLinkModal: (type: 'parent' | 'spouse' | 'child', gender: Gender) => void;
  handleOpenModal: (modalType: ModalType) => void;
  onOpenCleanTreeOptions: () => void;
  onOpenTreeManager: () => void;
  sharedTreePromptModal: { isOpen: boolean; sharedTrees: any[] };
  setSharedTreePromptModal: (val: { isOpen: boolean; sharedTrees: any[] }) => void;
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

export interface GoogleSyncStateAndActions {
  user: UserProfile | null;
  isSyncing: boolean;
  isDemoMode: boolean;
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
  onLoadCloudData: (fileId: string) => Promise<void>;
  onSaveNewCloudFile: () => Promise<void>;
  onOpenDriveFileManager: () => void;
  driveFiles: DriveFile[];
  currentActiveDriveFileId: string | null;
  refreshDriveFiles: () => Promise<void>;
  handleLoadDriveFile: (fileId: string) => Promise<void>;
  handleSaveAsNewDriveFile: (fileName: string) => Promise<void>;
  handleOverwriteExistingDriveFile: (fileId: string) => Promise<void>;
  handleDeleteDriveFile: (fileId: string) => Promise<void>;
  isSaving: boolean; // Renamed for consistency if needed, but matched orchestration
  isDeleting: boolean;
  isListing: boolean;
  setShowWelcome: (show: boolean) => void;
  handleCreateSnapshot: (label: string) => Promise<void>;
  handleRestoreSnapshot: (snapshot: DriveFile) => Promise<void>;
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
}
