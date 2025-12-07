import React from 'react';

interface DropdownContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void; // Added onClose prop
  id?: string; // Added id prop
  role?: string; // Added role prop
}

export const DropdownContent: React.FC<DropdownContentProps> = ({ children, className = '', onClose, id, role }) => (
  <div className={`p-1.5 bg-white/95 dark:bg-stone-950/95 backdrop-blur-xl border border-stone-200/50 dark:border-stone-700/50 rounded-2xl shadow-float z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right ring-1 ring-black/5 ${className}`} id={id} role={role}>
    {/* Pass onClose down to children if they need it */}
    {React.Children.map(children, child =>
      React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<any>, { onClose }) : child
    )}
  </div>
);

interface DropdownMenuItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  icon?: React.ReactNode;
  label?: string;
  subLabel?: string;
  isActive?: boolean;
  colorClass?: string;
  iconBgClass?: string;
  iconTextColorClass?: string;
  className?: string;
  onClose?: () => void; // Added onClose prop
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
  onClick, // Destructure onClick
  onClose, // Destructure onClose
  ...props
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e); // Call original onClick
    onClose?.(); // Close dropdown after click
  };

  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative overflow-hidden ${colorClass} ${isActive ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 ring-1 ring-teal-200 dark:ring-teal-800' : ''} ${className}`}
      onClick={handleClick} // Use new handleClick
      {...props}
    >
      {icon && (
        <div className={`p-1.5 rounded-lg shadow-sm ${iconBgClass} ${iconTextColorClass}`}>
          {icon}
        </div>
      )}
      {(label || subLabel) && (
        <div className="flex flex-col items-start flex-grow min-w-0">
          {label && <span className="font-bold">{label}</span>}
          {subLabel && <span className="text-[9px] opacity-70">{subLabel}</span>}
        </div>
      )}
      {children}
    </button>
  );
};

export const DropdownMenuDivider: React.FC = () => (
  <div className="h-px bg-stone-100 dark:bg-stone-800 my-1 mx-2"></div>
);

export const DropdownMenuHeader: React.FC<{ icon?: React.ReactNode; label: string }> = ({ icon, label }) => (
  <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-2">
    {icon} {label}
  </div>
);