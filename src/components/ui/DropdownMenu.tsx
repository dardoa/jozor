import React, { memo } from 'react';
import { ChevronRight } from 'lucide-react';

interface DropdownContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void; // Added onClose prop
}

export const DropdownContent: React.FC<DropdownContentProps> = memo(({ children, className, onClose }) => {
  // We can use onClose here if needed, or just pass it down.
  // For now, it's primarily for the parent Dropdown to manage its state.
  return (
    <div className={`p-1 ${className}`}>
      {children}
    </div>
  );
});

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  label?: string;
  subLabel?: string;
  isActive?: boolean;
  className?: string;
  colorClass?: string; // For custom text/bg color
  iconBgClass?: string; // For custom icon background
  iconTextColorClass?: string; // For custom icon text color
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = memo(({
  children,
  onClick,
  icon,
  label,
  subLabel,
  isActive,
  className,
  colorClass = 'text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800',
  iconBgClass = 'bg-stone-100 dark:bg-stone-700',
  iconTextColorClass = 'text-stone-500 dark:text-stone-400'
}) => {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center rounded-lg px-3 py-2 text-sm transition-colors ${colorClass} ${isActive ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-300' : ''} ${className}`}
      role="menuitem"
      tabIndex={-1}
    >
      {icon && (
        <div className={`flex items-center justify-center w-7 h-7 rounded-md me-2 ${iconBgClass} ${iconTextColorClass}`}>
          {icon}
        </div>
      )}
      <div className="flex flex-col items-start">
        {label ? <span className="font-medium">{label}</span> : children}
        {subLabel && <span className="text-[10px] text-stone-400 dark:text-stone-500">{subLabel}</span>}
      </div>
    </button>
  );
});

interface DropdownMenuHeaderProps {
  label: string;
  icon?: React.ReactNode;
}

export const DropdownMenuHeader: React.FC<DropdownMenuHeaderProps> = memo(({ label, icon }) => {
  return (
    <div className="flex items-center px-3 py-2 text-xs font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider">
      {icon && <div className="me-2 text-stone-400 dark:text-stone-500">{icon}</div>}
      {label}
    </div>
  );
});

export const DropdownMenuDivider: React.FC = memo(() => {
  return <div className="my-1 h-px bg-stone-100 dark:bg-stone-800" />;
});

interface DropdownMenuSubItemProps {
  label: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}

export const DropdownMenuSubItem: React.FC<DropdownMenuSubItemProps> = memo(({ label, children, icon }) => {
  return (
    <div className="relative group">
      <button
        className="flex w-full items-center rounded-lg px-3 py-2 text-sm text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800"
        role="menuitem"
        tabIndex={-1}
      >
        {icon && <div className="flex items-center justify-center w-7 h-7 rounded-md me-2 bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400">{icon}</div>}
        <span>{label}</span>
        <ChevronRight className="ms-auto h-4 w-4 text-stone-400" />
      </button>
      <div className="absolute left-full top-0 hidden group-hover:block">
        <DropdownContent className="w-48">
          {children}
        </DropdownContent>
      </div>
    </div>
  );
});