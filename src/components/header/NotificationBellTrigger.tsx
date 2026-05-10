import React from 'react';
import { Bell } from 'lucide-react';

export const NotificationBellTrigger: React.FC<{
  tooltipLabel: string;
  unreadCount: number;
  unreadBadgeLabel: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>> = ({ tooltipLabel, unreadCount, unreadBadgeLabel, ...props }) => (
  <button
    type="button"
    data-testid="notification-bell-trigger"
    aria-label={tooltipLabel}
    {...props}
    className={`group relative cursor-pointer rounded-xl p-2.5 text-[var(--text-main)] transition-all duration-200 hover:bg-[var(--card-bg)] hover:shadow-[var(--shadow-sm)] active:scale-95 ${props.className || ''}`}
  >
    <Bell
      className={`h-5 w-5 transition-all duration-300 ${
        unreadCount > 0 ? 'text-amber-500 group-hover:animate-[wiggle_0.3s_ease-in-out]' : 'group-hover:text-[var(--primary-500)]'
      }`}
    />
    {unreadCount > 0 ? (
      <span className="absolute -top-0.5 end-0 flex min-w-[1.15rem] items-center justify-center rounded-full bg-red-500 px-1 py-[1px] text-[9px] font-bold leading-none text-white ring-2 ring-[var(--theme-bg)]">
        <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-50" />
        <span className="relative z-[1]">{unreadBadgeLabel}</span>
      </span>
    ) : null}
  </button>
);
