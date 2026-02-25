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
  contentClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [effectiveAlign, setEffectiveAlign] = useState(align);
  const [activeIndex, setFocusIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    setFocusIndex(-1);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setFocusIndex(-1);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    const items = contentRef.current?.querySelectorAll('button, [role="menuitem"]');
    if (!items) return;

    if (e.key === 'Escape') {
      handleClose();
      dropdownRef.current?.querySelector('button')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex(prev => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex(prev => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0) {
        (items[activeIndex] as HTMLElement).click();
        handleClose();
      }
    }
  };

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && contentRef.current) {
      const items = contentRef.current.querySelectorAll('button, [role="menuitem"]');
      (items[activeIndex] as HTMLElement)?.focus();
    }
  }, [activeIndex, isOpen]);

  // Boundary Detection logic
  useEffect(() => {
    if (isOpen && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      const margin = 16; // Safe buffer

      const isOverflowingRight = rect.right + margin > window.innerWidth;
      const isOverflowingLeft = rect.left - margin < 0;

      // In LTR: start=left, end=right. In RTL: start=right, end=left.
      // Logic: if overflowing screen edge, switch to the other logical alignment.
      if (isOverflowingRight) {
        const timer = setTimeout(() => setEffectiveAlign(document.dir === 'rtl' ? 'start' : 'end'), 0);
        return () => clearTimeout(timer);
      }
      if (isOverflowingLeft) {
        const timer = setTimeout(() => setEffectiveAlign(document.dir === 'rtl' ? 'end' : 'start'), 0);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [isOpen]); // Removed effectiveAlign from deps to prevent toggle loops

  // Reset alignment when closed or alignment prop changes
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => setEffectiveAlign(align), 0);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen, align]);

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
    <div
      className={`relative ${className}`}
      ref={dropdownRef}
      onKeyDown={handleKeyDown}
    >
      <div
        onClick={handleToggle}
        className="cursor-pointer"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        {trigger}
      </div>
      {isOpen && (
        <div
          ref={contentRef}
          className={`absolute top-full mt-2 z-[60] shadow-xl rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200
            ${effectiveAlign === 'end' ? 'end-0' : 'start-0'}
            ${contentClassName}`}
        >
          {/* Pass handleClose as prop — DropdownContent distributes via Context */}
          {React.Children.map(children, (child) =>
            React.isValidElement(child)
              ? React.cloneElement(child as React.ReactElement<any>, { onClose: handleClose })
              : child
          )}
        </div>
      )}
    </div>
  );
};
