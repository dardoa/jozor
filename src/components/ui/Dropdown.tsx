import React, { useState, useRef, useEffect, cloneElement, isValidElement, memo } from 'react';
import { DropdownContent } from './DropdownMenu'; // Assuming DropdownContent is exported from here

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactElement<React.ComponentProps<typeof DropdownContent>>; // Expects DropdownContent as child
  align?: 'start' | 'end';
}

export const Dropdown: React.FC<DropdownProps> = memo(({ trigger, children, align = 'start' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleClose = () => setIsOpen(false);

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
  }, [isOpen]);

  // Pass the onClose handler to the DropdownContent child
  const childrenWithProps = isValidElement(children) 
    ? cloneElement(children, { onClose: handleClose }) 
    : children;

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{trigger}</div>
      {isOpen && (
        <div className={`absolute ${align === 'end' ? 'right-0' : 'left-0'} z-50`}>
          {childrenWithProps}
        </div>
      )}
    </div>
  );
});