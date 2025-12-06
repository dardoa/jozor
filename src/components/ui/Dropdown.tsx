import React, { useState, useRef, useEffect, useCallback } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode; // This will be the DropdownContent
  align?: 'start' | 'end'; // Where the dropdown content aligns relative to the trigger
  className?: string; // For the main container div
  contentClassName?: string; // For the DropdownContent itself
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'end',
  className = '',
  contentClassName = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div onClick={handleToggle}>
        {trigger}
      </div>
      {isOpen && (
        <div className={`absolute top-full mt-2 ${align === 'end' ? 'right-0' : 'left-0'} ${contentClassName}`}>
          {/* Pass handleClose to children so they can close the dropdown on item click */}
          {React.Children.map(children, child =>
            React.isValidElement(child) ? React.cloneElement(child as React.ReactElement<any>, { onClose: handleClose }) : child
          )}
        </div>
      )}
    </div>
  );
};