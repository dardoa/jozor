export type Gender = 'male' | 'female';

export type RelationshipStatus = 'married' | 'divorced' | 'engaged' | 'separated';

export type Language = 'en' | 'ar';

export type ChartType = 'descendant' | 'fan' | 'pedigree' | 'force';

export type AppTheme = 'modern' | 'vintage' | 'blueprint';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
}

export interface RelationshipInfo {
  type: RelationshipStatus;
  startDate: string;
  startPlace?: string; // Location of marriage/engagement
  endDate?: string;
  endPlace?: string; // Location of divorce/separation
}

export interface TreeSettings {
  showPhotos: boolean;
  showDates: boolean;
  showMiddleName: boolean;
  showLastName: boolean;
  showMinimap: boolean; // New
  layoutMode: 'vertical' | 'horizontal' | 'radial';
  isCompact: boolean;
  chartType: ChartType;
  theme: AppTheme;
  enableForcePhysics?: boolean; // New: Toggle physics simulation
  enableTimeOffset?: boolean; // New: Enable vertical offset based on birth year
  timeScaleFactor?: number; // New: Factor to scale time offset
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
  deathDate: string;
  deathPlace: string;
  deathSource: string;
  isDeceased: boolean;
  
  // biographical
  profession: string;
  company: string;
  interests: string;
  bio: string;
  photoUrl?: string;
  gallery: string[];
  voiceNotes: string[];

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
}

export interface Message {
  role: 'user' | 'model';
  text: string;
}

export interface FamilyData {
  people: Record<string, Person>;
  rootId: string;
}

export interface TreeNode {
  id: string;
  x: number;
  y: number;
  vx?: number; // Added for D3 force simulation compatibility
  vy?: number; // Added for D3 force simulation compatibility
  data: Person;
  type: 'focus' | 'spouse' | 'parent' | 'child' | 'sibling' | 'ancestor' | 'descendant';
  // Props for Fan Chart
  startAngle?: number;
  endAngle?: number;
  depth?: number;
}

export interface TreeLink {
  source: any; // Allow object reference for D3 Force
  target: any;
  type: 'parent-child' | 'marriage';
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

// New interface for timeline events
export interface TimelineEvent {
  year: number;
  dateStr: string;
  type: 'birth' | 'death' | 'marriage';
  personId: string;
  relatedId?: string; // For marriage events, the spouse's ID
  label: string;
  subLabel?: string;
}

// New interfaces for grouped props
export interface HistoryControlsProps {
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

export interface ThemeLanguageProps {
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  language: Language; // Added language
  setLanguage: (l: Language) => void; // Added setLanguage
}

export interface AuthProps {
  user: UserProfile | null;
  isDemoMode: boolean;
  isSyncing: boolean; // Added isSyncing
  onLogin: () => Promise<void>;
  onLogout: () => Promise<void>;
}

export interface ViewSettingsProps {
  treeSettings: TreeSettings;
  setTreeSettings: (s: TreeSettings) => void;
  onPresent: () => void;
}

export interface ToolsActionsProps {
  onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
}

export interface ExportActionsProps {
  handleExport: (type: 'jozor' | 'json' | 'gedcom' | 'ics' | 'print') => Promise<void>;
}

export interface SearchProps {
  people: Record<string, Person>;
  onFocusPerson: (id: string) => void;
}

export interface FamilyActionsProps { // New interface
  onAddParent: (gender: Gender) => void;
  onAddSpouse: (gender: Gender) => void;
  onAddChild: (gender: Gender) => void;
  onRemoveRelationship?: (targetId: string, relativeId: string, type: 'parent' | 'spouse' | 'child') => void;
  onLinkPerson: (existingId: string, type: 'parent' | 'spouse' | 'child' | null) => void; // Added for LinkPersonModal
}

export interface HeaderRightSectionProps {
  themeLanguage: ThemeLanguageProps;
  auth: AuthProps;
  viewSettings: ViewSettingsProps;
  toolsActions: ToolsActionsProps;
  exportActions: ExportActionsProps;
  searchProps: SearchProps; // Grouped search props
}

// New interface for HeaderLeftSectionProps
export interface HeaderLeftSectionProps {
  themeLanguage: ThemeLanguageProps;
  toggleSidebar: () => void;
  historyControls: HistoryControlsProps;
}

export interface SearchInputWithResultsProps extends SearchProps { // Extend SearchProps
}

export interface ToolsMenuProps {
    onClose?: () => void; // This onClose will be passed from Dropdown
    onOpenModal: (modalType: 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map') => void;
}

export interface ViewSettingsMenuProps {
    settings: TreeSettings;
    onUpdate: (s: TreeSettings) => void;
    onClose?: () => void; // This onClose will be passed from Dropdown
    onPresent: () => void;
}

export interface UserMenuProps {
    user: UserProfile;
    isDemoMode: boolean;
    onLogout: () => void;
    onClose?: () => void; // This onClose will be passed from Dropdown
}

export interface ExportMenuProps {
    onClose?: () => void; // This onClose will be passed from Dropdown
    onExport: (type: 'jozor' | 'json' | 'gedcom' | 'ics' | 'print') => void;
}

export interface SearchResultsProps {
    results: Person[], 
    onFocus: (id: string) => void, 
    onClose: () => void
}

export interface ModalManagerProps { // Updated ModalManagerProps
    activeModal: 'none' | 'calculator' | 'stats' | 'chat' | 'consistency' | 'timeline' | 'share' | 'story' | 'map';
    setActiveModal: (m: any) => void;
    linkModal: { isOpen: boolean; type: 'parent' | 'spouse' | 'child' | null; gender: Gender | null; };
    setLinkModal: (val: any) => void;
    people: Record<string, Person>;
    language: Language;
    focusId: string;
    setFocusId: (id: string) => void;
    activePerson?: Person;
    user: UserProfile | null;
    familyActions: FamilyActionsProps;
}

// Define HeaderProps directly here
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

export interface QuickAddAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  colorClasses: string; // Tailwind classes for background/text color
  buttonClassName?: string; // Optional: for styling the main trigger button
}

// New interface for collaborators in ShareModal
export interface Collaborator {
  email: string;
  role: 'owner' | 'editor' | 'viewer';
  status: 'active' | 'pending';
  avatar?: string;
}

export interface SidebarFooterProps { // Updated SidebarFooterProps
    person: Person;
    isEditing: boolean;
    setIsEditing: (v: boolean) => void;
    onDelete: (id: string) => void;
    onStartNewTree: () => void; // New prop for starting a new tree
}