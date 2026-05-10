import { useEffect, useRef } from 'react';

interface UseSidebarAutoOpenOnFocusOptions {
  focusId: string;
  isPresentMode: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function useSidebarAutoOpenOnFocus({
  focusId,
  isPresentMode,
  setSidebarOpen,
}: UseSidebarAutoOpenOnFocusOptions) {
  const lastFocusIdRef = useRef<string | null>(null);

  useEffect(() => {
    const isMobileViewport =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 639px)').matches;

    if (focusId && focusId !== lastFocusIdRef.current && !isPresentMode && !isMobileViewport) {
      setSidebarOpen(true);
    }

    lastFocusIdRef.current = focusId;
  }, [focusId, isPresentMode, setSidebarOpen]);
}
