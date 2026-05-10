import React, { createContext, useContext } from 'react';

// Dropdown context
// Replaces React.cloneElement prop-drilling pattern with a proper Context so
// that React.memo on child components is not broken by synthetic prop injection.
const DropdownContext = createContext<{ onClose?: () => void }>({});

export const useDropdownClose = () => useContext(DropdownContext).onClose;
export const DropdownCloseProvider = DropdownContext.Provider;

interface DropdownContentProps {
  children: React.ReactNode;
  className?: string;
  onClose?: () => void;
  id?: string;
  role?: string;
}

export const DropdownContent: React.FC<DropdownContentProps> = ({
  children,
  className = '',
  onClose,
  id,
  role = 'menu',
}) => {
  const inheritedClose = useContext(DropdownContext).onClose;
  const resolvedClose = onClose ?? inheritedClose;

  return (
    <DropdownContext.Provider value={{ onClose: resolvedClose }}>
      <div
        className={`ds-menu-surface p-1.5 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right rtl:origin-top-left max-h-[calc(100vh-4rem)] overflow-y-auto focus:outline-none ${className}`}
        id={id}
        role={role}
        aria-orientation="vertical"
      >
        {children}
      </div>
    </DropdownContext.Provider>
  );
};

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
  onClose?: () => void; // Still accepted for direct usage without context.
  rightElement?: React.ReactNode;
  closeOnClick?: boolean;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  children,
  icon,
  label,
  subLabel,
  isActive = false,
  colorClass = 'text-[var(--text-main)] hover:bg-[var(--theme-hover)]',
  iconBgClass = 'bg-[var(--theme-bg)]',
  iconTextColorClass = 'text-[var(--text-dim)] group-hover:text-[var(--primary-600)]',
  className = '',
  onClick,
  onClose: onCloseProp,
  rightElement,
  closeOnClick = true,
  disabled,
  ...props
}) => {
  const contextClose = useContext(DropdownContext).onClose;
  const resolvedClose = onCloseProp ?? contextClose;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (closeOnClick) {
      resolvedClose?.();
    }
  };

  return (
    <button
      role="menuitem"
      aria-disabled={disabled}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-[13px] font-medium transition-all group relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring-color)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card-bg)]
        ${colorClass}
        ${isActive ? 'bg-[var(--primary-50)] text-[var(--primary-600)] ring-1 ring-[var(--primary-600)]/18' : ''}
        ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
        ${className}`}
      onClick={handleClick}
      {...props}
    >
      {icon && (
        <div className={`p-1.5 rounded-[var(--radius-sm)] shadow-[var(--shadow-sm)] ${iconBgClass} ${iconTextColorClass}`}>
          {icon}
        </div>
      )}
      {(label || subLabel) && (
        <div className='flex flex-col items-start flex-grow min-w-0'>
          {label && <span className='font-semibold leading-5'>{label}</span>}
          {subLabel && <span className='text-[11px] leading-4 opacity-75'>{subLabel}</span>}
        </div>
      )}
      {rightElement && <div className='ml-auto'>{rightElement}</div>}
      {children}
    </button>
  );
};

export const DropdownMenuDivider: React.FC = () => (
  <div className='h-px bg-[var(--border-main)] my-1 mx-2' role="separator" />
);

export const DropdownMenuHeader: React.FC<{ icon?: React.ReactNode; label: string }> = ({
  icon,
  label,
}) => (
  <div className='px-3 py-2 ds-label flex items-center gap-2' role="presentation">
    {icon} {label}
  </div>
);

