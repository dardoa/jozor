import React, { memo } from 'react';
import { Check } from 'lucide-react';
import { DropdownContentProps } from '../../types'; // Import DropdownContentProps from types

export const DropdownContent: React.FC<DropdownContentProps> = memo(({ children, className, onClose }) => {
  return (
    <div
      className={`absolute top-full mt-2 bg-white dark:bg-stone-900 rounded-2xl shadow-float border border-stone-200 dark:border-stone-700 p-2 z-50 animate-in fade-in slide-in-from-top-2 ${className}`}
      role="menu"
      aria-orientation="vertical"
      aria-labelledby="menu-button"
      tabIndex={-1}
    >
      {children}
    </div>
  );
});

interface DropdownMenuItemProps {
  onClick: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  label?: string;
  subLabel?: string;
  isActive?: boolean;
  colorClass?: string;
  iconBgClass?: string;
  iconTextColorClass?: string;
  className?: string;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = memo(({ onClick, children, icon, label, subLabel, isActive, colorClass, iconBgClass, iconTextColorClass, className }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center w-full text-start px-3 py-2 rounded-xl text-sm font-medium transition-colors group ${isActive ? 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-300' : 'text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-800'} ${colorClass} ${className}`}
      role="menuitem"
      tabIndex={-1}
    >
      {icon && (
        <div className={`w-7 h-7 flex items-center justify-center rounded-lg me-2 shrink-0 ${iconBgClass || 'bg-stone-100 dark:bg-stone-700'} ${iconTextColorClass || 'text-stone-500 dark:text-stone-400'}`}>
          {icon}
        </div>
      )}
      <div className="flex flex-col items-start min-w-0 flex-1">
        {label && <span className="truncate">{label}</span>}
        {subLabel && <span className="text-xs text-stone-500 dark:text-stone-400 truncate">{subLabel}</span>}
        {!label && !subLabel && children}
      </div>
    </button>
  );
});

export const DropdownMenuDivider: React.FC = memo(() => {
  return <div className="h-px bg-stone-200 dark:bg-stone-700 my-2 mx-1" />;
});

interface DropdownMenuHeaderProps {
  label: string;
  icon?: React.ReactNode;
}

export const DropdownMenuHeader: React.FC<DropdownMenuHeaderProps> = memo(({ label, icon }) => {
  return (
    <div className="flex items-center gap-2 px-3 py-2 text-[9px] font-bold text-stone-400 uppercase tracking-wider">
      {icon && <div className="w-3 h-3 flex items-center justify-center">{icon}</div>}
      {label}
    </div>
  );
});