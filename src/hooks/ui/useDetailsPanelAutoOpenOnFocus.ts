import { useEffect, useRef } from 'react';

interface UseDetailsPanelAutoOpenOnFocusOptions {
  focusId: string;
  isPresentMode: boolean;
  setDetailsPanelOpen: (open: boolean) => void;
}

export function useDetailsPanelAutoOpenOnFocus({
  focusId,
  isPresentMode,
  setDetailsPanelOpen,
}: UseDetailsPanelAutoOpenOnFocusOptions) {
  const lastFocusIdRef = useRef<string | null>(null);

  useEffect(() => {
    const isMobileViewport =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 639px)').matches;

    if (focusId && focusId !== lastFocusIdRef.current && !isPresentMode && !isMobileViewport) {
      setDetailsPanelOpen(true);
    }

    lastFocusIdRef.current = focusId;
  }, [focusId, isPresentMode, setDetailsPanelOpen]);
}
