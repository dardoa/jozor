import type { NavigateFunction } from 'react-router-dom';
import type { AppNotification, UserProfile as User } from '../../types';
import type { TranslationSchema } from '../../utils/translationLoader';

export type NotificationFilter = 'all' | 'invitations' | 'updates';

export interface NotificationBellStoreActions {
  markRead: (id: string) => void;
  markAllRead: () => void;
  updateNotification: (id: string, patch: Partial<AppNotification>) => void;
  removeNotification: (id: string) => void;
  setFocusId: (id: string) => void;
  setSearchTarget: (id: string | null) => void;
}

export interface NotificationBellState extends NotificationBellStoreActions {
  t: TranslationSchema;
  isRtl: boolean;
  navigate: NavigateFunction;
  notifications: AppNotification[];
  user: User | null;
  activeFilter: NotificationFilter;
  busyInvitationId: string | null;
  unreadCount: number;
  pendingInvitationCount: number;
  updateCount: number;
  hasNotifications: boolean;
  visibleNotifications: AppNotification[];
  hasFilteredNotifications: boolean;
  canClearNotifications: boolean;
  tooltipLabel: string;
  unreadBadgeLabel: string;
  filterTabs: Array<{ id: NotificationFilter; label: string }>;
  setActiveFilter: (filter: NotificationFilter) => void;
  clearSafeNotifications: () => void;
  handleAcceptInvitation: (notificationId: string) => Promise<void>;
  handleDeclineInvitation: (notificationId: string) => Promise<void>;
  handleOpenNotification: (notification: AppNotification) => void;
}
