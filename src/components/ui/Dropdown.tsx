import React, { useState, useRef, useEffect, cloneElement, isValidElement, memo } from 'react';
import { DropdownProps } from '../../types'; // Import DropdownProps

export const Dropdown: React.FC<DropdownProps> = memo(({ trigger, children, align = 'start' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => setIsOpen((prev) => !prev);
  const handleClose = () => setIsOpen(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const triggerWithProps = isValidElement(trigger)
    ? cloneElement(trigger, { onClick: handleToggle })
    : trigger;

  const childrenWithProps = isValidElement(children)
    ? cloneElement(children, { onClose: handleClose })
    : children;

  return (
    <div className="relative" ref={dropdownRef}>
      {triggerWithProps}
      {isOpen && (
        <div className={`absolute ${align === 'end' ? 'right-0' : 'left-0'} z-50`}>
          {childrenWithProps}
        </div>
      )}
    </div>
  );
});