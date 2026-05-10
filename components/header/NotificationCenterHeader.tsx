import React from 'react';
import { Bell, CheckCircle2, Trash2 } from 'lucide-react';
import type { NotificationBellState } from './notificationBellTypes';

export const NotificationCenterHeader: React.FC<{ state: NotificationBellState }> = ({ state }) => (
  <div className="flex items-center justify-between border-b border-[var(--border-main)] bg-[var(--theme-bg)]/30 p-4 max-[639px]:sticky max-[639px]:top-0 max-[639px]:z-10 max-[639px]:rounded-t-[28px] max-[639px]:bg-[var(--surface-panel)]/95">
    <div className="absolute start-1/2 top-2 h-1 w-12 -translate-x-1/2 rounded-full bg-[var(--border-main)]/70 sm:hidden" aria-hidden="true" />
    <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)]">
      <Bell className="h-4 w-4 text-[var(--primary-500)]" />
      {state.t.notifications.centerTitle}
    </h3>
    <div className="flex items-center gap-2">
      {state.unreadCount > 0 ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            state.markAllRead();
          }}
          aria-label={state.t.notifications.markAllRead}
          className="rounded-lg p-1.5 text-[var(--primary-600)] transition-colors hover:bg-[var(--primary-500)]/10"
          title={state.t.notifications.markAllRead}
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
      ) : null}
      {state.canClearNotifications ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            state.clearSafeNotifications();
          }}
          aria-label={state.t.notifications.clearSafeAria || state.t.notifications.clearSafe}
          className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-500/10"
          title={state.t.notifications.clearSafe}
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  </div>
);
