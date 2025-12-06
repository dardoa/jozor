import React, { useState, useRef, useEffect, useCallback, memo } from 'react';
import { DropdownContent } from './DropdownMenu'; // Import DropdownContent

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactElement<typeof DropdownContent>; // Ensure children is of type DropdownContent
  align?: 'start' | 'end' | 'center';
}

export const Dropdown: React.FC<DropdownProps> = memo(({ trigger, children, align = 'start' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        handleClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClose]);

  // Pass the onClose handler to the DropdownContent child
  const childrenWithProps = React.cloneElement(children, { onClose: handleClose });

  let alignmentClasses = '';
  if (align === 'end') {
    alignmentClasses = 'right-0';
  } else if (align === 'center') {
    alignmentClasses = 'left-1/2 -translate-x-1/2';
  } else { // 'start'
    alignmentClasses = 'left-0';
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div ref={triggerRef} onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 mt-2 origin-top-right rounded-xl shadow-float bg-white dark:bg-stone-900 ring-1 ring-black ring-opacity-5 focus:outline-none animate-in fade-in zoom-in-95 duration-200 ${alignmentClasses}`}
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="menu-button"
          tabIndex={-1}
        >
          {childrenWithProps}
        </div>
      )}
    </div>
  );
});