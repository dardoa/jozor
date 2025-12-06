import React, { memo } from 'react';
import { Check } from 'lucide-react';
import { DropdownContentProps } from '../../types'; // Import DropdownContentProps from types

// DropdownContentProps interface (Removed from here, now in types.ts)
// interface DropdownContentProps {
//   children: React.ReactNode;
//   className?: string;
//   onClose?: () => void;
// }

export const DropdownContent: React.FC<DropdownContentProps> = memo(({ children, className, onClose }) => {
  return (
    <div 
      className={`absolute top-full mt-2 min-w-[12rem] rounded-2xl bg-white dark:bg-stone-900 p-2 shadow-float border border-stone-200 dark:border-stone-800 z-50 animate-in fade-in slide-in-from-top-1 duration-200 ${className}`}
      role="menu"
      aria-orientation="vertical"
    >
      {children}
    </div>
  );
});

// DropdownMenuItemProps interface
interface DropdownMenuItemProps {
  onClick: () => void;
  children: React.ReactNode; // Content of the menu item
  icon?: React.ReactNode;
  label?: string; // Optional label, if children is not used directly
  subLabel?: string; // Optional sub-label
  isActive?: boolean;
  colorClass?: string;
  iconBgClass?: string;
  iconTextColorClass?: string;
  className?: string;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = memo(({ 
  onClick, children, icon, isActive, colorClass, iconBgClass, iconTextColorClass, className 
}) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 w-full px-3 py-2 text-sm rounded-xl text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors group ${colorClass} ${className}`}
      role="menuitem"
    >
      {icon && (
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBgClass} ${iconTextColorClass}`}>
          {icon}
        </div>
      )}
      <div className="flex flex-col items-start min-w-0 flex-1">
        {children}
      </div>
      {isActive && <Check className="w-4 h-4 text-teal-600 ms-auto" />}
    </button>
  );
});

interface DropdownMenuHeaderProps {
  icon?: React.ReactNode;
  label: string;
}

export const DropdownMenuHeader: React.FC<DropdownMenuHeaderProps> = memo(({ icon, label }) => (
  <div className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-stone-400 uppercase tracking-wider border-b border-stone-100 dark:border-stone-800 mb-1">
    {icon} {label}
  </div>
));

export const DropdownMenuDivider: React.FC = memo(() => (
  <div className="h-px bg-stone-100 dark:bg-stone-800 my-2" />
));