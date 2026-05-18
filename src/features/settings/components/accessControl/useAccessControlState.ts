import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Collaborator } from '../../../../services/supabaseTreeTypes';
import type { TreeInvitation } from '../../../../services/treeInvitationService';
import { useAppStore } from '../../../../store/useAppStore';
import { logError } from '../../../../utils/errorLogger';
import { showToast } from '../../../../utils/showToast';
import type { AccessControlState, AccessRole, AccessText, CollaboratorRow } from './accessControlTypes';
import { formatShareLinkLabel } from './accessControlUtils';

interface UseAccessControlStateArgs {
  treeId: string;
  ownerId: string;
  ownerEmail: string;
  t: AccessText;
}

export const useAccessControlState = ({
  treeId,
  ownerId,
  ownerEmail,
  t,
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
  const shareLink = `${window.location.origin}/tree/${treeId}`;
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
      const [collaboratorService, invitationService] = await Promise.all([
        import('../../../../services/supabaseTreeCollaboratorService'),
        import('../../../../services/treeInvitationService'),
      ]);
      const [collabs, invites] = await Promise.all([
        collaboratorService.getTreeCollaborators(treeId, ownerId, ownerEmail, supabaseToken),
        invitationService.listTreeInvitations(treeId, ownerId, ownerEmail, supabaseToken),
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
  }, [ownerEmail, ownerId, supabaseToken, t.messages.error.collaborators, treeId]);

  useEffect(() => {
    void loadCollaborators();

    let channel: { unsubscribe: () => void } | null = null;
    let invitationChannel: { unsubscribe: () => void } | null = null;
    let closed = false;

    const subscribe = async () => {
      const { getSupabaseFull } = await import('../../../../services/supabaseClient');
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
    if (!inviteEmail.trim()) return;
    const trimmedInviteEmail = inviteEmail.trim();

    try {
      setIsInviting(true);
      const [{ createTreeInvitation }, { activityService }] = await Promise.all([
        import('../../../../services/treeInvitationService'),
        import('../../../../features/activity-log'),
      ]);
      const { inviteToken } = await createTreeInvitation(
        treeId,
        trimmedInviteEmail,
        inviteRole,
        ownerId,
        ownerEmail,
        supabaseToken
      );
      const inviteLink = `${window.location.origin}/shared/${inviteToken}`;
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
    try {
      const [{ revokeTreeInvitation }, { activityService }] = await Promise.all([
        import('../../../../services/treeInvitationService'),
        import('../../../../features/activity-log'),
      ]);
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
    if (collaborator.role === newRole) return;

    try {
      const [{ updateCollaboratorRole }, { activityService }] = await Promise.all([
        import('../../../../services/supabaseTreeCollaboratorService'),
        import('../../../../features/activity-log'),
      ]);
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
    setPendingRevokeCollaborator(collaborator);
    setIsConfirmRevokeOpen(true);
  };

  const closeRevokeConfirm = () => {
    setIsConfirmRevokeOpen(false);
    setPendingRevokeCollaborator(null);
  };

  const confirmRevoke = async () => {
    if (!pendingRevokeCollaborator) return;
    const collaborator = pendingRevokeCollaborator;

    try {
      const [{ revokeCollaboratorAccess }, { activityService }] = await Promise.all([
        import('../../../../services/supabaseTreeCollaboratorService'),
        import('../../../../features/activity-log'),
      ]);
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
