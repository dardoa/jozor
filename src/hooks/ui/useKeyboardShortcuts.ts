import { useEffect, useRef } from 'react';

type KeyHandler = (e: KeyboardEvent) => void;

export interface ShortcutMap {
  [key: string]: KeyHandler;
}

/**
 * Hook to handle global keyboard shortcuts.
 * Supports simple keys (like '?') and combinations (like 'ctrl+z').
 */
export const useKeyboardShortcuts = (shortcuts: ShortcutMap, active = true) => {
  const shortcutsRef = useRef(shortcuts);
  const activeRef = useRef(active);

  useEffect(() => {
    shortcutsRef.current = shortcuts;
    activeRef.current = active;
  }, [shortcuts, active]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeRef.current) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;
      if ((e.target as HTMLElement).isContentEditable) return;

      const key = e.key.toLowerCase();
      const isCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;

      let combo = '';
      if (isCmd) combo += 'ctrl+';
      if (isShift) combo += 'shift+';
      combo += key;

      // Try specific combo first, then the base key
      const handler = shortcutsRef.current[combo] || shortcutsRef.current[key];

      if (handler) {
        // Only prevent default if it's one of our shortcuts
        e.preventDefault();
        handler(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
};
