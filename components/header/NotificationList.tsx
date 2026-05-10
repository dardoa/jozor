import React from 'react';
import type { NotificationBellState } from './notificationBellTypes';
import { NotificationEmptyState } from './NotificationEmptyState';
import { NotificationItem } from './NotificationItem';

export const NotificationList: React.FC<{ state: NotificationBellState }> = ({ state }) => {
  if (!state.hasNotifications) {
    return <NotificationEmptyState message={state.t.notifications.centerEmpty} />;
  }

  if (!state.hasFilteredNotifications) {
    return <NotificationEmptyState message={state.t.notifications.filterEmpty} />;
  }

  return (
    <div className="divide-y divide-[var(--border-main)]/50">
      {state.visibleNotifications.map((notification) => (
        <NotificationItem key={notification.id} notification={notification} state={state} />
      ))}
    </div>
  );
};
