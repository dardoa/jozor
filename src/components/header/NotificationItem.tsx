import React from 'react';
import type { AppNotification } from '../../types';
import type { NotificationBellState } from './notificationBellTypes';
import { getNotificationIcon } from './notificationBellUtils';

export const NotificationItem: React.FC<{
  notification: AppNotification;
  state: NotificationBellState;
}> = ({ notification, state }) => (
  <div
    onClick={() => state.handleOpenNotification(notification)}
    className={`group relative flex cursor-pointer gap-4 p-4 transition-all hover:bg-[var(--theme-hover)] ${
      !notification.read ? 'bg-[var(--primary-500)]/[0.03]' : ''
    }`}
  >
    <div className="mt-1 shrink-0">
      <div
        className={`rounded-xl border p-2 ${
          !notification.read
            ? 'border-[var(--primary-100)] bg-white shadow-sm'
            : 'border-[var(--border-main)] bg-[var(--theme-bg)]'
        }`}
      >
        {getNotificationIcon(notification.type)}
      </div>
    </div>

    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className={`truncate text-xs font-bold ${!notification.read ? 'text-[var(--text-main)]' : 'text-[var(--text-dim)]'}`}>
          {notification.title}
        </span>
        <span className="shrink-0 whitespace-nowrap text-[10px] text-[var(--text-dim)]">
          {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      <p className={`text-[11px] leading-relaxed ${!notification.read ? 'font-medium text-[var(--text-main)]' : 'text-[var(--text-dim)]'}`}>
        {notification.body}
      </p>

      {notification.type === 'invitation' && notification.invitationStatus === 'pending' ? (
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void state.handleAcceptInvitation(notification.id);
            }}
            disabled={state.busyInvitationId === notification.id}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
          >
            {state.t.notifications.acceptAction}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void state.handleDeclineInvitation(notification.id);
            }}
            disabled={state.busyInvitationId === notification.id}
            className="rounded-lg border border-[var(--border-main)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-main)] transition-colors hover:bg-[var(--theme-bg)] disabled:opacity-60"
          >
            {state.t.notifications.declineAction}
          </button>
        </div>
      ) : null}
    </div>

    {!notification.read ? (
      <div className="absolute top-4 end-4 h-1.5 w-1.5 rounded-full bg-[var(--primary-500)]" />
    ) : null}
  </div>
);
