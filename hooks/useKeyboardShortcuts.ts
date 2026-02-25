import { useEffect } from 'react';

/**
 * Hook to handle global keyboard shortcuts.
 * Supports Undo (Ctrl+Z), Redo (Ctrl+Y or Ctrl+Shift+Z), and Present Mode exit (Esc).
 */
export const useKeyboardShortcuts = (
  canUndo: boolean,
  undo: () => void,
  canRedo: boolean,
  redo: () => void,
  showWelcome: boolean,
  isPresentMode: boolean,
  setIsPresentMode: (v: boolean) => void
) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showWelcome) return;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) return;

      const isCmd = e.ctrlKey || e.metaKey;
      if (isCmd && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if (isCmd && e.key === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }
      if (e.key === 'Escape' && isPresentMode) setIsPresentMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, undo, canRedo, redo, showWelcome, isPresentMode, setIsPresentMode]);
};
