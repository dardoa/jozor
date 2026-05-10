import type { DriveFile, Person } from '../../types';

export type TreeControlTab =
  | 'overview'
  | 'access'
  | 'activity'
  | 'versions'
  | 'settings'
  | 'diagnostics'
  | 'maintenance'
  | 'danger';

export type TreeControlText = {
  title: string;
  subtitle: string;
  closeAria: string;
  navigationAria: string;
  tabs: Record<TreeControlTab, string>;
  overviewCards: {
    role: string;
    people: string;
    currentRoot: string;
    notSet: string;
    syncState: string;
    syncNeedsAttention: string;
    syncHealthy: string;
  };
  quickActions: {
    title: string;
    description: string;
    shareTree: string;
    openDiagnostics: string;
  };
  migration: {
    title: string;
    description: string;
    treeIdLabel: string;
  };
  sections: {
    accessTitle: string;
    accessDesc: string;
    activityTitle: string;
    activityDesc: string;
    versionsTitle: string;
    versionsDesc: string;
    settingsTitle: string;
    settingsDesc: string;
    diagnosticsTitle: string;
    diagnosticsDesc: string;
    maintenanceTitle: string;
    maintenanceDesc: string;
    dangerTitle: string;
    dangerDesc: string;
  };
  placeholders: {
    accessTitle: string;
    accessBody: string;
    activityTitle: string;
    activityBody: string;
    versionsTitle: string;
    versionsBody: string;
    settingsTitle: string;
    settingsBody: string;
    dangerTitle: string;
    dangerBody: string;
  };
};

export interface TreeControlCenterProps {
  isOpen: boolean;
  onClose: () => void;
  treeName: string;
  treeId?: string | null;
  ownerId?: string | null;
  ownerEmail?: string | null;
  language: 'ar' | 'en';
  roleLabel: string;
  peopleCount: number;
  people?: Person[];
  currentRootName?: string | null;
  currentRootId?: string | null;
  hasPendingSync: boolean;
  googleSync: {
    handleCreateSnapshot: (label: string) => Promise<void>;
    handleRestoreSnapshot: (snapshot: DriveFile) => Promise<void>;
  };
  onRootChanged?: (newRootId: string) => void;
  onTreeRenamed?: (newName: string) => void;
  onOpenShare: () => void;
  onOpenDiagnostics: () => void;
}

export type TreeControlContentProps = Omit<TreeControlCenterProps, 'isOpen' | 'onClose'> & {
  activeTab: TreeControlTab;
  text: TreeControlText;
  people: Person[];
};
