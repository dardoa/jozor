import { useCallback, useEffect, useRef } from 'react';

interface UseNodeLongPressOptions {
  personId: string;
  onNodeContextMenu: (e: React.MouseEvent, id: string) => void;
}

export const useNodeLongPress = ({
  personId,
  onNodeContextMenu,
}: UseNodeLongPressOptions) => {
  const longPressTimerRef = useRef<number | null>(null);
  const skipNextClickRef = useRef(false);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearLongPressTimer, [clearLongPressTimer]);

  const shouldSkipClick = useCallback(() => {
    if (!skipNextClickRef.current) return false;
    skipNextClickRef.current = false;
    return true;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<SVGGElement>) => {
    if (e.pointerType !== 'touch') return;

    clearLongPressTimer();
    const { clientX, clientY } = e;

    longPressTimerRef.current = window.setTimeout(() => {
      skipNextClickRef.current = true;
      onNodeContextMenu({
        clientX,
        clientY,
        preventDefault: () => undefined,
        stopPropagation: () => undefined,
      } as unknown as React.MouseEvent, personId);
    }, 500);
  }, [clearLongPressTimer, onNodeContextMenu, personId]);

  return {
    clearLongPressTimer,
    handlePointerDown,
    shouldSkipClick,
  };
};
