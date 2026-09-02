import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getTreeCollaborators,
  revokeCollaboratorAccess,
  updateCollaboratorRole,
} from '../../../../services/supabaseTreeCollaboratorService';
import type { Collaborator } from '../../../../services/supabaseTreeTypes';
import { getSupabaseFull } from '../../../../services/supabaseClient';
import {
  createTreeInvitation,
  buildAuthorizedTreeLink,
  buildTreeInvitationLink,
  listTreeInvitations,
  revokeTreeInvitation,
  type TreeInvitation,
} from '../../../../features/sharing';
import { useAppStore } from '../../../../store/useAppStore';
import { logError } from '../../../../utils/errorLogger';
import { showToast } from '../../../../utils/showToast';
import type { AccessControlState, AccessRole, CollaboratorRow } from './accessControlTypes';
import { formatShareLinkLabel } from './accessControlUtils';

interface UseAccessControlStateArgs {
  treeId: string;
  ownerId: string;
  ownerEmail: string;
}

export const useAccessControlState = ({
  treeId,
  ownerId,
  ownerEmail,
}: UseAccessControlStateArgs): AccessControlState => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [pendingInvitations, setPendingInvitations] = useState<TreeInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AccessRole>('viewer');
  const [isInviting, setIsInviting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isConfirmRevokeOpen, setIsConfirmRevokeOpen] = useState(false);
  const [pendingRevokeCollaborator, setPendingRevokeCollaborator] = useState<Collaborator | null>(null);

  const supabaseToken = useAppStore((state) => state.user?.supabaseToken);
  const currentUserRole = useAppStore((state) => state.currentUserRole);
  const shareLink = buildAuthorizedTreeLink(window.location.origin, treeId);
  const shareLinkLabel = formatShareLinkLabel(shareLink);
  const ownerRow = useMemo<CollaboratorRow>(
    () => ({
      id: `owner-${ownerId}`,
      email: ownerEmail,
      role: 'owner',
      invited_at: '',
    }),
    [ownerEmail, ownerId]
  );

  const loadCollaborators = useCallback(async () => {
    try {
      setIsLoading(true);
      const [collabs, invites] = await Promise.all([
        getTreeCollaborators(treeId, ownerId, ownerEmail, supabaseToken),
        listTreeInvitations(treeId, ownerId, ownerEmail, supabaseToken),
      ]);
      setCollaborators(collabs);
      setPendingInvitations(invites.filter((invitation) => invitation.status === 'pending'));
    } catch (err) {
      logError('ACCESS_CONTROL_LOAD_ERROR', err, {
        category: 'DATABASE',
        severity: 'MEDIUM',
        metadata: { treeId },
      });
      showToast.error('messages.error.collaborators');
    } finally {
      setIsLoading(false);
    }
  }, [ownerEmail, ownerId, supabaseToken, treeId]);

  useEffect(() => {
    void loadCollaborators();

    let channel: { unsubscribe: () => void } | null = null;
    let invitationChannel: { unsubscribe: () => void } | null = null;
    let closed = false;

    const subscribe = async () => {
      if (closed) return;

      const client = getSupabaseFull(ownerId, ownerEmail, supabaseToken);
      channel = client
        .channel(`collaborators:${treeId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tree_collaborators',
            filter: `tree_id=eq.${treeId}`,
          },
          () => {
            void loadCollaborators();
          }
        )
        .subscribe();

      invitationChannel = client
        .channel(`tree-invitations:${treeId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tree_invitations',
            filter: `tree_id=eq.${treeId}`,
          },
          () => {
            void loadCollaborators();
          }
        )
        .subscribe();
    };

    void subscribe();

    return () => {
      closed = true;
      channel?.unsubscribe();
      invitationChannel?.unsubscribe();
    };
  }, [loadCollaborators, ownerEmail, ownerId, supabaseToken, treeId]);

  const handleInvite = async () => {
    if (currentUserRole !== 'owner') {
      showToast.error('Only the owner can manage access permissions.');
      return;
    }
    if (!inviteEmail.trim()) return;
    const trimmedInviteEmail = inviteEmail.trim();

    try {
      setIsInviting(true);
      const { activityService } = await import('../../../../features/activity-log/service');
      const { inviteToken } = await createTreeInvitation(
        treeId,
        trimmedInviteEmail,
        inviteRole,
        ownerId,
        ownerEmail,
        supabaseToken
      );
      const inviteLink = buildTreeInvitationLink(window.location.origin, inviteToken);
      await navigator.clipboard.writeText(inviteLink);
      setInviteEmail('');
      showToast.success('messages.success.invite', { variables: { email: trimmedInviteEmail } });
      await activityService.logAction(treeId, 'SHARE_INVITE', {
        email: trimmedInviteEmail,
        role: inviteRole,
      });
    } catch (err) {
      logError('ACCESS_CONTROL_INVITE_ERROR', err, {
        category: 'DATABASE',
        severity: 'MEDIUM',
        metadata: { treeId, inviteRole },
      });
      showToast.error('messages.error.invite');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRevokeInvitation = async (invitation: TreeInvitation) => {
    if (currentUserRole !== 'owner') {
      showToast.error('Only the owner can manage access permissions.');
      return;
    }
    try {
      const { activityService } = await import('../../../../features/activity-log/service');
      await revokeTreeInvitation(invitation.id, ownerId, ownerEmail, supabaseToken);
      showToast.success('messages.success.revoke');
      await activityService.logAction(treeId, 'SHARE_REVOKE', {
        email: invitation.invited_email,
      });
    } catch (err) {
      logError('ACCESS_CONTROL_REVOKE_INVITATION_ERROR', err, {
        category: 'DATABASE',
        severity: 'MEDIUM',
        metadata: { treeId, invitationId: invitation.id },
      });
      showToast.error('messages.error.revoke');
    }
  };

  const handleChangeRole = async (collaborator: Collaborator, newRole: AccessRole) => {
    if (currentUserRole !== 'owner') {
      showToast.error('Only the owner can manage access permissions.');
      return;
    }
    if (collaborator.role === newRole) return;

    try {
      const { activityService } = await import('../../../../features/activity-log/service');
      await updateCollaboratorRole(
        treeId,
        collaborator.email,
        newRole,
        ownerId,
        ownerEmail,
        supabaseToken,
        collaborator.id
      );
      showToast.success('messages.success.role');
      await activityService.logAction(treeId, 'SHARE_ROLE_CHANGE', {
        email: collaborator.email,
        newRole,
      });
    } catch (err) {
      logError('ACCESS_CONTROL_ROLE_CHANGE_ERROR', err, {
        category: 'DATABASE',
        severity: 'MEDIUM',
        metadata: { treeId, collaboratorId: collaborator.id, newRole },
      });
      showToast.error('messages.error.role');
    }
  };

  const requestRevoke = (collaborator: Collaborator) => {
    if (currentUserRole !== 'owner') {
      showToast.error('Only the owner can manage access permissions.');
      return;
    }
    setPendingRevokeCollaborator(collaborator);
    setIsConfirmRevokeOpen(true);
  };

  const closeRevokeConfirm = () => {
    setIsConfirmRevokeOpen(false);
    setPendingRevokeCollaborator(null);
  };

  const confirmRevoke = async () => {
    if (currentUserRole !== 'owner') {
      showToast.error('Only the owner can manage access permissions.');
      return;
    }
    if (!pendingRevokeCollaborator) return;
    const collaborator = pendingRevokeCollaborator;

    try {
      const { activityService } = await import('../../../../features/activity-log/service');
      await revokeCollaboratorAccess(
        treeId,
        collaborator.email,
        ownerId,
        ownerEmail,
        supabaseToken,
        collaborator.id
      );
      showToast.success('messages.success.revoke');
      await activityService.logAction(treeId, 'SHARE_REVOKE', {
        email: collaborator.email,
      });
    } catch (err) {
      logError('ACCESS_CONTROL_REVOKE_ACCESS_ERROR', err, {
        category: 'DATABASE',
        severity: 'MEDIUM',
        metadata: { treeId, collaboratorId: collaborator.id },
      });
      showToast.error('messages.error.revoke');
    } finally {
      closeRevokeConfirm();
    }
  };

  const copyLink = () => {
    void navigator.clipboard.writeText(shareLink);
    setIsCopied(true);
    showToast.success('messages.success.copy');
    window.setTimeout(() => setIsCopied(false), 2000);
  };

  return {
    currentUserRole,
    collaborators,
    pendingInvitations,
    ownerRow,
    isLoading,
    inviteEmail,
    inviteRole,
    isInviting,
    isCopied,
    isConfirmRevokeOpen,
    pendingRevokeCollaborator,
    shareLink,
    shareLinkLabel,
    setInviteEmail,
    setInviteRole,
    handleInvite,
    handleRevokeInvitation,
    handleChangeRole,
    requestRevoke,
    closeRevokeConfirm,
    confirmRevoke,
    copyLink,
  };
};
