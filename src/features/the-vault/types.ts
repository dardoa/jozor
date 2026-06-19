import type {
  AuthProps,
  ExportActionsProps,
  GoogleSyncStateAndActions,
  ToolsActionsProps,
  TreeSettings,
  UserProfile,
} from '../../types';
import type { TreeSummary, SharedTreeSummary } from '../../services/supabaseTreeTypes';
import type { TranslationSchema } from '../../utils/translationLoader';
import type { VaultTreesPanelLabels } from './components/VaultTreesPanel';
import type { TreeRow } from './components/TreeListItem';

export type VaultTab = 'cloud' | 'security' | 'trees' | 'members' | 'stats';
export type MobileVaultHub = 'management' | 'insights' | 'tools';
export type MobileManagementSection = 'trees' | 'members';

export interface VaultStats {
  total: number;
  male: number;
  female: number;
  unknown: number;
  malePercent: number;
  femalePercent: number;
}

export interface VaultRenderContext {
  auth: AuthProps;
  googleSync: GoogleSyncStateAndActions;
  exportActions: ExportActionsProps;
  toolsActions: ToolsActionsProps;
  onOpenDiagnostics: () => void;
  onOpenActivityLog: () => void;
  onOpenCleanTree: () => void;
  t: TranslationSchema;
  canManageMembers: boolean;
  canManageCloud: boolean;
  canManageSecurity: boolean;
  currentUser: UserProfile | null;
  currentTreeId: string | null;
  treeName: string;
  treeSettings: TreeSettings;
  treeIsPrivate: boolean;
  healthScore: number;
  stats: VaultStats | null;
  roleLabel: string;
  ownedTrees: TreeSummary[];
  sharedTrees: SharedTreeSummary[];
  busyTreeId: string | null;
  isTreeLoading: boolean;
  editingTreeId: string | null;
  editTreeName: string;
  treePanelLabels: VaultTreesPanelLabels;
  onCloseVault: () => void;
  onOpenTool: (modalType: Parameters<ToolsActionsProps['onOpenModal']>[0]) => void;
  onUpdateVisibilitySetting: (key: keyof TreeSettings, value: boolean | string | number | null) => void;
  onCreateTree: () => void;
  onImportTree: () => void;
  onRefreshTrees: () => void;
  onOpenTree: (treeId: string, treeRole?: 'owner' | 'editor' | 'viewer') => void;
  onStartRename: (tree: TreeRow) => void;
  onConfirmRename: (treeId: string) => void;
  onCancelRename: () => void;
  onEditTreeNameChange: (name: string) => void;
  onDeleteTree: (treeId: string) => void;
}
