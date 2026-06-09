import type { TranslationSchema } from '../../../../utils/translationLoader';
import type { Person } from '../../../../types';

export interface TreeSettingsTabProps {
  treeId: string;
  treeName?: string;
  ownerId: string;
  ownerEmail: string;
  people?: Person[];
  currentRootId?: string;
  canManageTreeSettings?: boolean;
  onTreeDeleted?: () => void;
  onTreeRenamed?: (newName: string) => void;
  onRootChanged?: (newRootId: string) => void;
}

export interface TreeDangerZoneProps {
  treeId: string;
  ownerId: string;
  ownerEmail: string;
  peopleCount: number;
  canManageTreeSettings?: boolean;
  onTreeDeleted?: () => void;
}

export type TreeSettingsText = TranslationSchema['adminHub']['treeSettings'];

export const treeSettingsCardClassName =
  'rounded-[var(--radius-xl)] border border-[var(--border-soft)] bg-[var(--surface-panel)] p-4 shadow-[var(--shadow-xs)]';
