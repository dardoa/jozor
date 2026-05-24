import { acceptTreeInvitationById, declineTreeInvitation } from '../features/sharing';
import { showToast } from '../utils/showToast';
import { logError } from '../utils/errorLogger';
import { getNotificationTranslation } from '../utils/notificationTranslations';
import type { AppNotification, Language } from '../types';

type NotificationUser = {
  uid: string;
  email?: string;
  supabaseToken?: string;
} | null;

type NotificationOpenDeps = {
  markRead: (id: string) => void;
  setFocusId: (id: string) => void;
  setSearchTarget: (id: string) => void;
  navigate: (path: string) => void;
};

type NotificationActionDeps = {
  updateNotification: (id: string, patch: Partial<AppNotification>) => void;
  removeNotification: (id: string) => void;
  navigate: (path: string) => void;
};

const getInvitationErrorMessage = (error: unknown, action: 'accept' | 'decline', isRtl: boolean) => {
  const copy = getNotificationTranslation((isRtl ? 'ar' : 'en') as Language);
  const rawMessage =
    typeof error === 'object' && error !== null && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes('email does not match')) {
    return copy.invitationEmailMismatch;
  }

  if (normalized.includes('invalid or expired')) {
    return copy.invitationExpired;
  }

  if (normalized.includes('permission denied') || normalized.includes('row-level security')) {
    return copy.invitationPermissionDenied;
  }

  return action === 'accept'
    ? copy.invitationAcceptFailed
    : copy.invitationDeclineFailed;
};

export const openNotification = (
  notification: AppNotification,
  { markRead, setFocusId, setSearchTarget, navigate }: NotificationOpenDeps
) => {
  markRead(notification.id);

  if (notification.type === 'invitation' && notification.invitationStatus === 'accepted') {
    if (notification.invitationOwnerUid && notification.invitationTreeId) {
      navigate(`/tree/${notification.invitationTreeId}`);
    }
    return;
  }

  if (notification.personId) {
    setFocusId(notification.personId);
    setSearchTarget(notification.personId);
  }
};

export const acceptInvitationNotification = async (
  notification: AppNotification | undefined,
  user: NotificationUser,
  isRtl: boolean,
  { updateNotification, removeNotification: _removeNotification, navigate }: NotificationActionDeps
) => {
  const copy = getNotificationTranslation((isRtl ? 'ar' : 'en') as Language);
  if (!notification?.invitationId || !notification.invitationTreeId || !notification.invitationOwnerUid || !user?.email) {
    showToast.error(copy.invitationAcceptPrecondition);
    return;
  }

  try {
    const accepted = await acceptTreeInvitationById(
      notification.invitationId,
      user.uid,
      user.email,
      user.supabaseToken
    );

    updateNotification(notification.id, {
      read: true,
      invitationStatus: 'accepted',
      title: copy.invitationAcceptedTitle,
      body: copy.invitationAcceptedOpenBody,
    });
    showToast.success(copy.invitationAcceptedToast);
    navigate(`/tree/${accepted.treeId}`);
  } catch (error) {
    logError('NotificationActionService acceptInvitationNotification', error, {
      category: 'PERMISSION',
      severity: 'MEDIUM',
      metadata: {
        notificationId: notification.id,
        invitationId: notification.invitationId,
        action: 'accept',
      },
    });
    showToast.error(getInvitationErrorMessage(error, 'accept', isRtl));
  }
};

export const declineInvitationNotification = async (
  notification: AppNotification | undefined,
  user: NotificationUser,
  isRtl: boolean,
  { removeNotification }: Pick<NotificationActionDeps, 'removeNotification'>
) => {
  const copy = getNotificationTranslation((isRtl ? 'ar' : 'en') as Language);
  if (!notification?.invitationId || !user?.email) {
    showToast.error(copy.invitationDeclinePrecondition);
    return;
  }

  try {
    await declineTreeInvitation(notification.invitationId, user.uid, user.email, user.supabaseToken);
    removeNotification(notification.id);
    showToast.success(copy.invitationDeclinedToast);
  } catch (error) {
    logError('NotificationActionService declineInvitationNotification', error, {
      category: 'PERMISSION',
      severity: 'MEDIUM',
      metadata: {
        notificationId: notification.id,
        invitationId: notification.invitationId,
        action: 'decline',
      },
    });
    showToast.error(getInvitationErrorMessage(error, 'decline', isRtl));
  }
};
