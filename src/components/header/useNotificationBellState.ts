import { useEffect, useMemo, useState } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import {
  acceptInvitationNotification,
  declineInvitationNotification,
  openNotification,
} from '../../services/notificationActionService';
import { useAppStore } from '../../store/useAppStore';
import type { AppNotification } from '../../types';
import type { TranslationSchema } from '../../utils/translationLoader';
import type { NotificationBellState, NotificationFilter } from './notificationBellTypes';
import { isSafeToClearNotification, MAX_VISIBLE_NOTIFICATIONS } from './notificationBellUtils';

interface UseNotificationBellStateArgs {
  t: TranslationSchema;
  isRtl: boolean;
  navigate: NavigateFunction;
}

export const useNotificationBellState = ({
  t,
  isRtl,
  navigate,
}: UseNotificationBellStateArgs): NotificationBellState => {
  const notifications = useAppStore(state => state.notifications);
  const markRead = useAppStore(state => state.markRead);
  const markAllRead = useAppStore(state => state.markAllRead);
  const updateNotification = useAppStore(state => state.updateNotification);
  const removeNotification = useAppStore(state => state.removeNotification);
  const setFocusId = useAppStore(state => state.setFocusId);
  const setSearchTarget = useAppStore(state => state.setSearchTarget);
  const user = useAppStore(state => state.user);
  const [busyInvitationId, setBusyInvitationId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>('all');

  const unreadCount = useMemo(
    () => notifications.filter(n => !n.read).length,
    [notifications]
  );
  const pendingInvitationCount = useMemo(
    () => notifications.filter(
      notification => notification.type === 'invitation' && notification.invitationStatus === 'pending'
    ).length,
    [notifications]
  );
  const updateCount = useMemo(
    () => notifications.filter(notification => notification.type !== 'invitation').length,
    [notifications]
  );

  const hasNotifications = notifications.length > 0;
  const orderedNotifications = useMemo(
    () => [...notifications].sort((a, b) => b.timestamp - a.timestamp),
    [notifications]
  );
  const filteredNotifications = useMemo(() => {
    switch (activeFilter) {
      case 'invitations':
        return orderedNotifications.filter(notification => notification.type === 'invitation');
      case 'updates':
        return orderedNotifications.filter(notification => notification.type !== 'invitation');
      default:
        return orderedNotifications;
    }
  }, [activeFilter, orderedNotifications]);
  const visibleNotifications = useMemo(
    () => filteredNotifications.slice(0, MAX_VISIBLE_NOTIFICATIONS),
    [filteredNotifications]
  );
  const hasFilteredNotifications = visibleNotifications.length > 0;
  const clearableNotifications = useMemo(
    () => notifications.filter(isSafeToClearNotification),
    [notifications]
  );
  const canClearNotifications = clearableNotifications.length > 0;

  useEffect(() => {
    if (activeFilter === 'invitations' && !notifications.some(notification => notification.type === 'invitation')) {
      setActiveFilter('all');
      return;
    }

    if (activeFilter === 'updates' && !notifications.some(notification => notification.type !== 'invitation')) {
      setActiveFilter('all');
    }
  }, [activeFilter, notifications]);

  const handleAcceptInvitation = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);

    try {
      setBusyInvitationId(notificationId);
      await acceptInvitationNotification(notification, user, isRtl, {
        updateNotification,
        removeNotification,
        navigate,
      });
    } finally {
      setBusyInvitationId(null);
    }
  };

  const handleDeclineInvitation = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);

    try {
      setBusyInvitationId(notificationId);
      await declineInvitationNotification(notification, user, isRtl, {
        removeNotification,
      });
    } finally {
      setBusyInvitationId(null);
    }
  };

  const clearSafeNotifications = () => {
    clearableNotifications.forEach((notification) => {
      removeNotification(notification.id);
    });
  };

  const handleOpenNotification = (notification: AppNotification) => {
    openNotification(notification, {
      markRead,
      setFocusId,
      setSearchTarget,
      navigate,
    });
  };

  const tooltipLabel = unreadCount > 0
    ? t.notifications.labelWithCount.replace('{count}', String(unreadCount))
    : t.notifications.label;
  const unreadBadgeLabel = unreadCount > 99 ? '99+' : String(unreadCount);

  const filterTabs = [
    { id: 'all' as const, label: t.notifications.filterAll },
    { id: 'invitations' as const, label: t.notifications.filterInvitations },
    { id: 'updates' as const, label: t.notifications.filterUpdates },
  ];

  return {
    t,
    isRtl,
    navigate,
    notifications,
    user,
    markRead,
    markAllRead,
    updateNotification,
    removeNotification,
    setFocusId: setFocusId as any,
    setSearchTarget,
    activeFilter,
    busyInvitationId,
    unreadCount,
    pendingInvitationCount,
    updateCount,
    hasNotifications,
    visibleNotifications,
    hasFilteredNotifications,
    canClearNotifications,
    tooltipLabel,
    unreadBadgeLabel,
    filterTabs,
    setActiveFilter,
    clearSafeNotifications,
    handleAcceptInvitation,
    handleDeclineInvitation,
    handleOpenNotification,
  };
};
