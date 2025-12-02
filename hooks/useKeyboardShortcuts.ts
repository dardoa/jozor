import { useEffect } from 'react';

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
        e.shiftKey ? (canRedo && redo()) : (canUndo && undo()); 
      } 
      else if (isCmd && e.key === 'y') { 
        e.preventDefault(); 
        canRedo && redo(); 
      }
      if (e.key === 'Escape' && isPresentMode) setIsPresentMode(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, undo, canRedo, redo, showWelcome, isPresentMode, setIsPresentMode]);
};