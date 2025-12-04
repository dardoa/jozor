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
  children?: React.ReactNode;
  icon?: React.ReactNode;
  label?: string;
  subLabel?: string;
  isActive?: boolean;
  colorClass?: string;
  iconBgClass?: string;
  iconTextColorClass?: string;
  className?: string;
}

// TEMPORARY: Simplified DropdownMenuItem for debugging
export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  icon,
  label,
  subLabel,
  isActive = false,
  className = '',
  ...props
}) => {
  // console.log("DropdownMenuItem rendering:", { label, subLabel, isActive }); // Debugging log
  return (
    <button
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all group relative overflow-hidden bg-red-200 text-red-800 border border-red-400 ${className}`} // Strong debugging styles
      {...props}
    >
      {icon && (
        <div className="p-1.5 rounded-lg shadow-sm bg-red-100 text-red-600">
          {icon}
        </div>
      )}
      {(label || subLabel) && (
        <div className="flex flex-col items-start flex-grow min-w-0">
          {label && <span className="font-bold text-lg">{label}</span>} {/* Larger text for visibility */}
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