import { useEffect, useMemo, useRef, useState } from 'react';

import { useAppStore } from '../../store/useAppStore';
import type { Person, PersonSidebarTabId } from '../../types';
import { getDisplayDate } from '../../utils/familyLogic';

interface UseSmartPersonaDrawerStateArgs {
  person: Person | null;
  isOpen: boolean;
  fallbackProfileLabel: string;
  unnamedPersonLabel: string;
  tabLabels: {
    about: string;
    links: string;
    media: string;
  };
}

export const useSmartPersonaDrawerState = ({
  person,
  isOpen,
  fallbackProfileLabel,
  unnamedPersonLabel,
  tabLabels,
}: UseSmartPersonaDrawerStateArgs) => {
  const activeTab = useAppStore((state) => state.personSidebarTab);
  const setActiveTab = useAppStore((state) => state.setPersonSidebarTab);
  const isEditing = useAppStore((state) => state.isPersonSidebarEditing);
  const setIsEditing = useAppStore((state) => state.setPersonSidebarEditing);
  const smartPersonaSize = useAppStore((state) => state.smartPersonaSize);
  const setSmartPersonaSize = useAppStore((state) => state.setSmartPersonaSize);

  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const startYRef = useRef(0);

  const safeDisplayName = useMemo(() => {
    if (!person) return fallbackProfileLabel;
    return [person.firstName, person.lastName].filter(Boolean).join(' ') || unnamedPersonLabel;
  }, [fallbackProfileLabel, person, unnamedPersonLabel]);

  const safeBirthYear = useMemo(() => {
    if (!person?.birthDate) return '';
    return getDisplayDate(person.birthDate);
  }, [person?.birthDate]);

  const fallbackInitial = useMemo(() => {
    const source = person?.firstName?.trim() || person?.lastName?.trim() || '?';
    return source.charAt(0).toUpperCase();
  }, [person?.firstName, person?.lastName]);

  const tabBoundaryKey = `${person?.id ?? 'loading'}:${activeTab}:${isEditing ? 'edit' : 'view'}`;

  const tabs = useMemo(() => {
    const allTabs = [
      { id: 'about', label: tabLabels.about, show: true, priority: 1 },
      { id: 'links', label: tabLabels.links, show: true, priority: 2 },
      { id: 'media', label: tabLabels.media, show: true, priority: 3 },
    ] as { id: PersonSidebarTabId; label: string; show: boolean; priority: number }[];

    return allTabs.filter((tab) => tab.show);
  }, [tabLabels]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    handleChange(mediaQuery);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isOpen && smartPersonaSize === 'closed') {
      const isMobile = window.innerWidth < 640;
      setSmartPersonaSize(isMobile ? 'expanded' : 'full');
    } else if (!isOpen && smartPersonaSize !== 'closed') {
      setSmartPersonaSize('closed');
    }
  }, [isOpen, smartPersonaSize, setSmartPersonaSize]);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (isMobileViewport) return;
    const target = event.target as HTMLElement;
    if (target.closest('.no-drag')) return;

    startYRef.current = event.touches[0].clientY;
    setIsDragging(true);
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (isMobileViewport || !isDragging) return;
    const currentY = event.touches[0].clientY;
    const deltaY = currentY - startYRef.current;
    setDragY(deltaY);
  };

  const handleTouchEnd = (onClose: () => void) => {
    if (isMobileViewport || !isDragging) return;
    setIsDragging(false);

    if (dragY > 100) {
      if (smartPersonaSize === 'expanded') setSmartPersonaSize('collapsed');
      else onClose();
    } else if (dragY < -50 && smartPersonaSize === 'collapsed') {
      setSmartPersonaSize('expanded');
    }

    setDragY(0);
  };

  const sizeClasses = useMemo(() => {
    if (!isOpen) {
      return 'translate-y-full ltr:sm:-translate-x-full rtl:sm:translate-x-full pointer-events-none opacity-0 sm:opacity-100';
    }

    const mobileClass = isMobileViewport
      ? 'translate-y-0 h-[100dvh] max-h-[100dvh]'
      : smartPersonaSize === 'collapsed'
        ? 'translate-y-[calc(100%-92px)]'
        : 'translate-y-0 h-[100dvh] max-h-[100dvh]';

    return `${mobileClass} sm:translate-x-0 sm:w-[420px] sm:h-[calc(100vh-3.5rem)] md:h-[calc(100vh-4rem)]`;
  }, [isMobileViewport, isOpen, smartPersonaSize]);

  return {
    activeTab,
    setActiveTab,
    isEditing,
    setIsEditing,
    smartPersonaSize,
    setSmartPersonaSize,
    dragY,
    isDragging,
    isMobileViewport,
    safeDisplayName,
    safeBirthYear,
    fallbackInitial,
    tabBoundaryKey,
    tabs,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    sizeClasses,
  };
};
