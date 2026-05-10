import { useNavigate } from 'react-router-dom';
import { useKeyboardShortcuts, ShortcutMap } from './useKeyboardShortcuts';

interface UseAppShortcutBindingsOptions {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  isPresentMode: boolean;
  setIsPresentMode: (value: boolean) => void;
  enabled: boolean;
}

export function useAppShortcutBindings({
  canUndo,
  canRedo,
  undo,
  redo,
  isPresentMode,
  setIsPresentMode,
  enabled,
}: UseAppShortcutBindingsOptions) {
  const navigate = useNavigate();

  const shortcuts: ShortcutMap = {
    'ctrl+z': () => canUndo && undo(),
    'ctrl+y': () => canRedo && redo(),
    'ctrl+shift+z': () => canRedo && redo(),
    escape: () => isPresentMode && setIsPresentMode(false),
    '?': () => navigate('/help'),
    '/': () => navigate('/help'),
  };

  useKeyboardShortcuts(shortcuts, enabled);
}
