import React from 'react';
import type { NotificationBellState } from './notificationBellTypes';

export const NotificationSummaryFilters: React.FC<{ state: NotificationBellState }> = ({ state }) => {
  if (!state.hasNotifications) return null;

  return (
    <div className="border-b border-[var(--border-main)] bg-[var(--theme-bg)]/10 px-4 py-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-black/10 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {state.t.notifications.summaryUnread}
          </div>
          <div className="mt-1 text-sm font-bold text-[var(--text-main)]">{state.unreadCount}</div>
        </div>
        <div className="rounded-xl bg-black/10 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {state.t.notifications.summaryPending}
          </div>
          <div className="mt-1 text-sm font-bold text-[var(--text-main)]">{state.pendingInvitationCount}</div>
        </div>
        <div className="rounded-xl bg-black/10 px-3 py-2">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-dim)]">
            {state.t.notifications.summaryUpdates}
          </div>
          <div className="mt-1 text-sm font-bold text-[var(--text-main)]">{state.updateCount}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {state.filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => state.setActiveFilter(tab.id)}
            aria-pressed={state.activeFilter === tab.id}
            className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
              state.activeFilter === tab.id
                ? 'bg-[var(--primary-500)] text-white'
                : 'bg-[var(--theme-bg)] text-[var(--text-dim)] hover:bg-[var(--theme-hover)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
};
