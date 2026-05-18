import { useEffect } from 'react';
import type { UserProfile } from '../../types';
import { useAppStore } from '../../store/useAppStore';
import {
  listMyPendingInvitations,
  subscribeToMyInvitations,
  subscribeToOwnedInvitations,
} from '../../services/treeInvitationService';
import { activityService } from '../../features/activity-log';
import { RealtimeSubscriber } from '../../services/sync/RealtimeSubscriber';
import type { DeltaOperation } from '../../services/sync/SyncTypes';
import { logError, logInfo, logWarn } from '../../utils/errorLogger';
import {
  createAcceptedSelfNotificationSpec,
  createOwnerInvitationOutcomeNotificationSpec,
  createPendingInvitationNotificationSpec,
  deliverNotificationWithPolicy,
} from '../../services/notificationPolicyService';

const getOperationPersonId = (operation: DeltaOperation): string | undefined =>
  operation.payload.id
  || operation.payload.person?.id
  || operation.payload.existingId
  || operation.payload.targetId;

const getChangeBucketHour = (createdAt?: string): string => {
  const date = createdAt ? new Date(createdAt) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 13);
  }

  return date.toISOString().slice(0, 13);
};

const getTreeChangeCopy = (isRtl: boolean, type: DeltaOperation['type']) => {
  const typeLabelMap: Partial<Record<DeltaOperation['type'], string>> = isRtl
    ? {
        ADD_NODE: 'أضاف شخصًا',
        UPDATE_PROP: 'حدّث بيانات شخص',
        DELETE_RELATION: 'أزال علاقة',
        ADD_RELATION: 'أضاف علاقة',
        DELETE_NODE: 'حذف شخصًا',
      }
    : {
        ADD_NODE: 'added a person',
        UPDATE_PROP: 'updated a person',
        DELETE_RELATION: 'removed a relationship',
        ADD_RELATION: 'added a relationship',
        DELETE_NODE: 'deleted a person',
        SET_TREE_METADATA: 'updated tree settings',
      };

  return {
    title: isRtl ? 'تحديث من متعاون' : 'Collaborator update',
    body: isRtl
      ? `أحد المتعاونين ${typeLabelMap[type]} في الشجرة الحالية.`
      : `A collaborator ${typeLabelMap[type]} in the current tree.`,
  };
};

/**
 * Centralizes realtime notification wiring so invitation lifecycle events and
 * collaborator tree-change pings share one cleanup-aware integration point.
 */
export const useRealtimeNotifications = (
  user: UserProfile | null,
  treeId: string | null
) => {
  const language = useAppStore(state => state.language);
  const currentUserRole = useAppStore(state => state.currentUserRole);
  const addNotification = useAppStore(state => state.addNotification);
  const removeNotification = useAppStore(state => state.removeNotification);
  const updateInvitationTelemetry = useAppStore(state => state.updateInvitationTelemetry);

  useEffect(() => {
    if (!user?.uid || !user.email) return;

    let cancelled = false;

    const hydratePendingInvitations = async () => {
      try {
        logInfo('useRealtimeNotifications hydratePendingInvitations', 'Hydrating pending invitations after login.', {
          uid: user.uid,
        });

        const pendingInvitations = await listMyPendingInvitations(
          user.uid,
          user.email,
          user.supabaseToken
        );

        if (cancelled) return;

        const pendingIds = new Set(pendingInvitations.map(invitation => invitation.id));
        const existingInvitationNotifications = useAppStore
          .getState()
          .notifications.filter(notification => notification.type === 'invitation');

        const removedNotificationIds: string[] = [];

        existingInvitationNotifications.forEach((notification) => {
          if (
            notification.invitationStatus === 'pending' &&
            notification.invitationId &&
            !pendingIds.has(notification.invitationId)
          ) {
            removedNotificationIds.push(notification.id);
            removeNotification(notification.id);
          }
        });

        let addedNotificationCount = 0;

        pendingInvitations.forEach((invitation) => {
          const alreadyExists = useAppStore
            .getState()
            .notifications.some(
              notification =>
                notification.type === 'invitation' &&
                notification.invitationId === invitation.id &&
                notification.invitationStatus === 'pending'
            );

          if (!alreadyExists) {
            addedNotificationCount += 1;
            deliverNotificationWithPolicy(
              addNotification as any,
              createPendingInvitationNotificationSpec({
                isRtl: language === 'ar',
                invitationId: invitation.id,
                treeId: invitation.tree_id,
                ownerUid: invitation.invited_by,
                role: invitation.role,
                status: 'pending',
                source: 'invitation-hydration',
                expiresAt: invitation.expires_at,
              })
            );
          }
        });

        updateInvitationTelemetry({
          lastHydratedAt: new Date(),
          lastHydrationCount: pendingInvitations.length,
          lastHydrationAddedCount: addedNotificationCount,
          lastHydrationRemovedCount: removedNotificationIds.length,
          lastErrorAt: null,
          lastErrorMessage: undefined,
        });
      } catch (error) {
        logError('useRealtimeNotifications hydratePendingInvitations', error, {
          category: 'SYNC',
          severity: 'LOW',
          metadata: { uid: user.uid }
        });
        updateInvitationTelemetry({
          lastErrorAt: new Date(),
          lastErrorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    };

    void hydratePendingInvitations();

    const channel = subscribeToMyInvitations(
      user.uid,
      user.email,
      user.supabaseToken,
      (invitation) => {
        updateInvitationTelemetry({
          lastEventAt: new Date(),
          lastEventSource: 'my-realtime',
          lastEventStatus: invitation.status,
          lastEventInvitationId: invitation.id,
        });

        if (invitation.status === 'pending') {
          deliverNotificationWithPolicy(
            addNotification as any,
            createPendingInvitationNotificationSpec({
              isRtl: language === 'ar',
              invitationId: invitation.id,
              treeId: invitation.tree_id,
              ownerUid: invitation.invited_by,
              role: invitation.role,
              status: 'pending',
              source: 'invitation-realtime',
              expiresAt: invitation.expires_at,
            })
          );
        } else if (invitation.status === 'accepted') {
          deliverNotificationWithPolicy(
            addNotification as any,
            createAcceptedSelfNotificationSpec({
              isRtl: language === 'ar',
              invitationId: invitation.id,
            })
          );
        }
      }
    );

    return () => {
      cancelled = true;
      channel.unsubscribe();
    };
  }, [addNotification, language, removeNotification, updateInvitationTelemetry, user]);

  useEffect(() => {
    if (!user?.uid || !user.email) return;

    const invitationSubscription = subscribeToOwnedInvitations(
      user.uid,
      user.email,
      user.supabaseToken,
      (invitation) => {
        if (invitation.status !== 'accepted' && invitation.status !== 'declined') {
          logWarn('useRealtimeNotifications subscribeToOwnedInvitations', 'Ignored owned invitation event with non-terminal status.', {
            category: 'SYNC',
            metadata: {
              uid: user.uid,
              invitationId: invitation.id,
              invitationStatus: invitation.status,
            }
          });
          updateInvitationTelemetry({
            lastIgnoredAt: new Date(),
            lastIgnoredSource: 'owned-realtime',
            lastIgnoredStatus: invitation.status,
          });
          return;
        }

        updateInvitationTelemetry({
          lastEventAt: new Date(),
          lastEventSource: 'owned-realtime',
          lastEventStatus: invitation.status,
          lastEventInvitationId: invitation.id,
          lastOwnerEventAt: new Date(),
          lastOwnerEventStatus: invitation.status,
          lastOwnerEventEmail: invitation.invited_email,
          lastOwnerEventRole: invitation.role,
          lastOwnerEventInvitationId: invitation.id,
        });

        deliverNotificationWithPolicy(
          addNotification as any,
          createOwnerInvitationOutcomeNotificationSpec({
            isRtl: language === 'ar',
            invitationId: invitation.id,
            invitedEmail: invitation.invited_email,
            role: invitation.role,
            status: invitation.status,
            source: 'owner-realtime',
          })
        );
      }
    );

    const activitySubscription =
      treeId && currentUserRole === 'owner'
        ? activityService.subscribeToLogs(treeId, (log) => {
            if (log.action_type !== 'SHARE_INVITE_ACCEPT') return;
            if (log.user_id === user.uid) return;

            updateInvitationTelemetry({
              lastEventAt: new Date(),
              lastEventSource: 'activity-log',
              lastEventStatus: log.action_type,
              lastEventInvitationId: log.details.invitationId as string | undefined,
              lastOwnerEventAt: new Date(),
              lastOwnerEventStatus: log.action_type,
              lastOwnerEventEmail: ((log.details.email as string | undefined) || log.user_email),
              lastOwnerEventRole: (log.details.role as string | undefined) || 'viewer',
              lastOwnerEventInvitationId: log.details.invitationId as string | undefined,
            });

            const email = (log.details.email as string | undefined) || log.user_email;
            const role = (log.details.role as string | undefined) || 'viewer';

            deliverNotificationWithPolicy(
              addNotification as any,
              createOwnerInvitationOutcomeNotificationSpec({
                isRtl: language === 'ar',
                invitationId: String(log.details.invitationId ?? 'unknown'),
                invitedEmail: email,
                role: role === 'editor' ? 'editor' : 'viewer',
                status: 'accepted',
                source: 'activity-log',
              })
            );
          })
        : null;

    return () => {
      invitationSubscription.unsubscribe();
      activitySubscription?.unsubscribe();
    };
  }, [addNotification, currentUserRole, language, treeId, updateInvitationTelemetry, user]);

  useEffect(() => {
    if (!user?.uid || !treeId || currentUserRole === 'viewer') return;

    const subscriber = new RealtimeSubscriber({
      onOperation: (operation) => {
        if (operation.user_id === user.uid) return;

        const personId = getOperationPersonId(operation) ?? 'tree';
        const hourBucket = getChangeBucketHour(operation.created_at);
        const copy = getTreeChangeCopy(language === 'ar', operation.type);

        deliverNotificationWithPolicy(addNotification as any, {
          notification: {
            type: 'info',
            source: 'tree-realtime',
            title: copy.title,
            body: copy.body,
            personId: personId === 'tree' ? undefined : personId,
            dedupeKey: `change-${personId}-${operation.type}-${hourBucket}`,
          },
        });
      },
      onPermissionUpdate: () => undefined,
      onReconcile: () => undefined,
    });

    subscriber.subscribe(treeId);

    return () => {
      subscriber.unsubscribe();
    };
  }, [addNotification, currentUserRole, language, treeId, user]);
};
