import React from 'react';

interface DropdownMenuContainerProps {
  children: React.ReactNode;
  className?: string; // For additional positioning or width classes
}

export const DropdownMenuContainer: React.FC<DropdownMenuContainerProps> = ({ children, className }) => (
  <div className={`absolute top-full mt-2 p-1.5 bg-white/95 dark:bg-stone-950/95 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 rounded-2xl shadow-float z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5 ${className}`}>
    {children}
  </div>
);

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode; // جعل خاصية children اختيارية
  icon?: React.ReactNode;
  label?: string;
  subLabel?: string;
  isActive?: boolean;
  colorClass?: string; // For specific item background/text colors
  iconBgClass?: string; // For specific icon background color
  iconTextColorClass?: string; // For specific icon text color
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  icon,
  label,
  subLabel,
  isActive = false,
  colorClass = 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800',
  iconBgClass = 'bg-stone-50 dark:bg-stone-800',
  iconTextColorClass = 'text-stone-500 group-hover:text-teal-600 dark:text-stone-400 dark:group-hover:text-teal-400',
  className = '',
  ...props
}) => (
  <button
    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative overflow-hidden ${colorClass} ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 ring-1 ring-teal-200 dark:ring-teal-800' : ''} ${className}`}
    {...props}
  >
    {icon && (
      <div className={`p-1.5 rounded-lg shadow-sm ${iconBgClass} ${iconTextColorClass}`}>
        {icon}
      </div>
    )}
    {/* Render label and subLabel if they exist */}
    {label && (
      <div className="flex flex-col items-start gap-0.5 flex-1"> {/* Added flex-1 here */}
        <span className="font-bold">{label}</span>
        {subLabel && <span className="text-[9px] opacity-70">{subLabel}</span>}
      </div>
    )}
    {/* Always render children, which will be the checkmark in this case */}
    {children}
  </button>
);

export const DropdownMenuDivider: React.FC = () => (
  <div className="h-px bg-stone-100 dark:bg-stone-800 my-1 mx-2"></div>
);

export const DropdownMenuHeader: React.FC<{ icon?: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
    {icon} {label}
  </div>
);