import { FormEvent, useState } from 'react';
import type { UserProfile } from '../../../../types';
import { useTranslation } from '../../../../context/TranslationContext';
import { createTreeInvitation } from '../../services/treeInvitationService';
import {
  buildAuthorizedTreeLink,
  buildTreeInvitationLink,
} from '../../services/treeAccessLinks';
import { getUserFacingErrorInfo, logError } from '../../../../utils/errorLogger';
import { showToast } from '../../../../utils/showToast';
import { useAppStore } from '../../../../store/useAppStore';

export type ShareRole = 'editor' | 'viewer';

interface UseShareModalStateOptions {
  user: UserProfile | null;
  driveFileId: string | null;
  treeId: string | null;
}

export const useShareModalState = ({
  user,
  driveFileId: _driveFileId,
  treeId,
}: UseShareModalStateOptions) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ShareRole>('viewer');
  const [isCopied, setIsCopied] = useState(false);
  const [isInviting, setIsInviting] = useState(false);

  const shareLink =
    user && treeId
      ? buildAuthorizedTreeLink(window.location.origin, treeId)
      : '';

  const handleInvite = async (event: FormEvent) => {
    event.preventDefault();
    const currentUserRole = useAppStore.getState().currentUserRole;
    if (currentUserRole !== 'owner') {
      showToast.error('Only the owner can invite collaborators.');
      return;
    }
    if (!email.trim() || isInviting) return;

    if (!user || !treeId) {
      showToast.error('noActiveTree');
      return;
    }

    setIsInviting(true);
    try {
      const { inviteToken } = await createTreeInvitation(
        treeId,
        email,
        role,
        user.uid,
        user.email || '',
        user.supabaseToken,
      );

      const inviteLink = buildTreeInvitationLink(window.location.origin, inviteToken);
      await navigator.clipboard.writeText(inviteLink);

      setEmail('');
      showToast.success(t.messages.success.invite.replace('{email}', email));
    } catch (error: unknown) {
      logError('ShareModal createTreeInvitation', error, {
        category: 'PERMISSION',
        severity: 'MEDIUM',
        metadata: { treeId, ownerUid: user.uid, inviteeEmail: email, role },
      });
      showToast.error(getUserFacingErrorInfo(error, t.messages.error.invite).message);
    } finally {
      setIsInviting(false);
    }
  };

  const copyLink = () => {
    if (!shareLink) return;
    navigator.clipboard.writeText(shareLink);
    setIsCopied(true);
    showToast.success('messages.success.copy');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return {
    t,
    email,
    setEmail,
    role,
    setRole,
    isCopied,
    isInviting,
    shareLink,
    handleInvite,
    copyLink,
  };
};

export type ShareModalState = ReturnType<typeof useShareModalState>;
