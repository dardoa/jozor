import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { DropdownCloseProvider } from './DropdownMenu';

type TriggerElementProps = React.HTMLAttributes<HTMLElement> & {
  onClick?: (event: React.MouseEvent<HTMLElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
};

type TriggerElement = React.ReactElement<TriggerElementProps>;

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
  contentClassName?: string;
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
  const contentId = useId();

  const getFocusableItems = useCallback(
    () => contentRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'),
    []
  );

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    setFocusIndex(-1);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setFocusIndex(-1);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    const items = getFocusableItems();
    if (!items || items.length === 0) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
      dropdownRef.current?.querySelector<HTMLElement>('[data-dropdown-trigger="true"]')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      items[activeIndex]?.click();
      handleClose();
    }
  };

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && contentRef.current) {
      const items = getFocusableItems();
      items?.[activeIndex]?.focus();
    }
  }, [activeIndex, getFocusableItems, isOpen]);

  useEffect(() => {
    if (isOpen && contentRef.current) {
      const rect = contentRef.current.getBoundingClientRect();
      const margin = 16;
      const isOverflowingRight = rect.right + margin > window.innerWidth;
      const isOverflowingLeft = rect.left - margin < 0;

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
  }, [isOpen]);

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
      {React.isValidElement(trigger)
        ? React.cloneElement(trigger as TriggerElement, {
            ...((trigger as TriggerElement).props || {}),
            onClick: (e: React.MouseEvent) => {
              (trigger as TriggerElement).props?.onClick?.(e as React.MouseEvent<HTMLElement>);
              handleToggle();
            },
            onKeyDown: (e: React.KeyboardEvent) => {
              (trigger as TriggerElement).props?.onKeyDown?.(e as React.KeyboardEvent<HTMLElement>);
              if (e.defaultPrevented) return;

              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
                setFocusIndex(0);
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
              }
            },
            'data-dropdown-trigger': 'true',
            'aria-haspopup': 'menu',
            'aria-expanded': isOpen,
            'aria-controls': isOpen ? contentId : undefined,
          } as any)
        : (
          <button
            type="button"
            onClick={handleToggle}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIsOpen(true);
                setFocusIndex(0);
              } else if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggle();
              }
            }}
            className="block w-full cursor-pointer border-none bg-transparent p-0 m-0 text-left rtl:text-right"
            data-dropdown-trigger="true"
            aria-haspopup="menu"
            aria-expanded={isOpen}
            aria-controls={isOpen ? contentId : undefined}
          >
            {trigger}
          </button>
        )}

      {isOpen && (
        <div
          id={contentId}
          ref={contentRef}
          className={`absolute top-full mt-2 z-[60] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${
            effectiveAlign === 'end' ? 'end-0 max-[639px]:end-2' : 'start-0 max-[639px]:start-2'
          } ${contentClassName}`}
        >
          <DropdownCloseProvider value={{ onClose: handleClose }}>
            {children}
          </DropdownCloseProvider>
        </div>
      )}
    </div>
  );
};
