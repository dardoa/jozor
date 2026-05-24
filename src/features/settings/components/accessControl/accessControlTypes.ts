import type { Collaborator } from '../../../../services/supabaseTreeTypes';
import type { TreeInvitation } from '../../../../features/sharing';
import type { TranslationSchema } from '../../../../utils/translationLoader';

export interface AccessControlTabProps {
  treeId: string;
  ownerId: string;
  ownerEmail: string;
  language?: 'ar' | 'en';
}

export type AccessRole = 'editor' | 'viewer';
export type AccessText = TranslationSchema;
export type AccessSectionText = TranslationSchema['adminHub']['accessSections'];
export type CollaboratorRow = Collaborator | {
  id: string;
  email: string;
  role: 'owner';
  invited_at: string;
};

export interface AccessControlState {
  collaborators: Collaborator[];
  pendingInvitations: TreeInvitation[];
  ownerRow: CollaboratorRow;
  isLoading: boolean;
  inviteEmail: string;
  inviteRole: AccessRole;
  isInviting: boolean;
  isCopied: boolean;
  isConfirmRevokeOpen: boolean;
  pendingRevokeCollaborator: Collaborator | null;
  shareLink: string;
  shareLinkLabel: string;
  setInviteEmail: (value: string) => void;
  setInviteRole: (value: AccessRole) => void;
  handleInvite: () => Promise<void>;
  handleRevokeInvitation: (invitation: TreeInvitation) => Promise<void>;
  handleChangeRole: (collaborator: Collaborator, newRole: AccessRole) => Promise<void>;
  requestRevoke: (collaborator: Collaborator) => void;
  closeRevokeConfirm: () => void;
  confirmRevoke: () => Promise<void>;
  copyLink: () => void;
}
