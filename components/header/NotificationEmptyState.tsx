import React from 'react';
import { Bell } from 'lucide-react';

export const NotificationEmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center gap-3 p-8 text-center">
    <div className="rounded-full bg-[var(--theme-bg)] p-4">
      <Bell className="h-8 w-8 text-[var(--text-dim)] opacity-20" />
    </div>
    <p className="text-xs font-medium text-[var(--text-dim)]">{message}</p>
  </div>
);
