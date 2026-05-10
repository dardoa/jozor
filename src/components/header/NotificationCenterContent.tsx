import React from 'react';
import type { NotificationBellState } from './notificationBellTypes';
import { NotificationCenterHeader } from './NotificationCenterHeader';
import { NotificationList } from './NotificationList';
import { NotificationSummaryFilters } from './NotificationSummaryFilters';

export const NotificationCenterContent: React.FC<{ state: NotificationBellState }> = ({ state }) => (
  <div className="flex max-h-[min(70vh,500px)] flex-col max-[639px]:max-h-[min(72vh,34rem)]">
    <NotificationCenterHeader state={state} />

    <div className="custom-scrollbar flex-1 overflow-y-auto border-b border-[var(--border-main)] max-[639px]:overscroll-contain">
      <NotificationSummaryFilters state={state} />
      <NotificationList state={state} />
    </div>

    {state.hasNotifications ? (
      <div className="bg-[var(--theme-bg)]/20 p-3 text-center">
        <p className="text-[10px] font-medium italic text-[var(--text-dim)]">
          {state.t.notifications.centerFooter}
        </p>
      </div>
    ) : null}
  </div>
);
