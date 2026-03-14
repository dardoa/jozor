import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface OverlayEntry {
  id: string;
  onEscapeClose?: () => void;
}

interface OverlayContextType {
  register: (id: string, onEscapeClose?: () => void) => void;
  unregister: (id: string) => void;
  isTop: (id: string) => boolean;
  stackSize: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const OverlayContext = createContext<OverlayContextType | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider — manages the global overlay stack
// ─────────────────────────────────────────────────────────────────────────────

export const OverlayProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [stack, setStack] = useState<OverlayEntry[]>([]);

  const register = useCallback((id: string, onEscapeClose?: () => void) => {
    setStack(prev => {
      // Avoid duplicates (StrictMode double-mount safety)
      if (prev.some(e => e.id === id)) return prev;
      return [...prev, { id, onEscapeClose }];
    });
  }, []);

  const unregister = useCallback((id: string) => {
    setStack(prev => prev.filter(e => e.id !== id));
  }, []);

  const isTop = useCallback(
    (id: string) => {
      if (stack.length === 0) return false;
      return stack[stack.length - 1].id === id;
    },
    [stack]
  );

  // Global Escape key: close only the topmost overlay
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      const top = stack[stack.length - 1];
      if (top?.onEscapeClose) {
        e.stopPropagation();
        top.onEscapeClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => document.removeEventListener('keydown', handleKeyDown, { capture: true });
  }, [stack]);

  // Scroll lock: lock body scroll when any overlay is open
  useEffect(() => {
    if (stack.length > 0) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [stack.length]);

  return (
    <OverlayContext.Provider value={{ register, unregister, isTop, stackSize: stack.length }}>
      {children}
    </OverlayContext.Provider>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook — used by OverlayPrimitive (internal)
// ─────────────────────────────────────────────────────────────────────────────

export const useOverlayManager = () => {
  const ctx = useContext(OverlayContext);
  if (!ctx) throw new Error('useOverlayManager must be used inside <OverlayProvider>');
  return ctx;
};

// ─────────────────────────────────────────────────────────────────────────────
// Focus Trap utility — used inside OverlayPrimitive
// ─────────────────────────────────────────────────────────────────────────────

const FOCUSABLE = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export const useFocusTrap = (
  ref: React.RefObject<HTMLElement | null>,
  active: boolean
) => {
  useEffect(() => {
    if (!active || !ref.current) return;
    const el = ref.current;

    // Auto-focus the first focusable element
    const focusable = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    focusable[0]?.focus();

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const visible = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (visible.length === 0) { e.preventDefault(); return; }
      const first = visible[0];
      const last = visible[visible.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };

    el.addEventListener('keydown', handleTab);
    return () => el.removeEventListener('keydown', handleTab);
  }, [active, ref]);
};

// ─────────────────────────────────────────────────────────────────────────────
// OverlayPrimitive — wraps all Modals / Drawers
// ─────────────────────────────────────────────────────────────────────────────

interface OverlayPrimitiveProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /**
   * When false, renders children inline (e.g. a Drawer that slides in).
   * When true (default), renders a full-screen backdrop + centered content.
   */
  withBackdrop?: boolean;
  backdropClassName?: string;
  contentClassName?: string;
}

export const OverlayPrimitive: React.FC<OverlayPrimitiveProps> = ({
  id,
  isOpen,
  onClose,
  children,
  withBackdrop = true,
  backdropClassName,
  contentClassName,
}) => {
  const { register, unregister } = useOverlayManager();
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useFocusTrap(contentRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      register(id, onClose);
    } else {
      unregister(id);
      // Restore focus to the element that triggered the overlay
      previousFocusRef.current?.focus();
    }
    return () => {
      unregister(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, id]);

  if (!isOpen) return null;

  if (!withBackdrop) {
    return (
      <div ref={contentRef} className={contentClassName}>
        {children}
      </div>
    );
  }

  return (
    <div
      className={backdropClassName ?? 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4'}
      onClick={onClose}
    >
      <div
        ref={contentRef}
        className={contentClassName ?? 'relative'}
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};
