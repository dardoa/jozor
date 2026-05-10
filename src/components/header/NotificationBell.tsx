import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../context/TranslationContext';
import { Dropdown } from '../ui/Dropdown';
import { Tooltip } from '../ui/Tooltip';
import { NotificationBellTrigger } from './NotificationBellTrigger';
import { NotificationCenterContent } from './NotificationCenterContent';
import { useNotificationBellState } from './useNotificationBellState';

const isMobileViewport = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(max-width: 639px)').matches;

/**
 * Notification center entry point. Persistent notifications live in Zustand,
 * while this shell owns only dropdown placement and trigger wiring.
 */
export const NotificationBell: React.FC = () => {
  const { t, language } = useTranslation();
  const navigate = useNavigate();
  const isRtl = language === 'ar';
  const state = useNotificationBellState({ t, isRtl, navigate });
  const [isMobile, setIsMobile] = useState(isMobileViewport);
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;

    const mediaQuery = window.matchMedia('(max-width: 639px)');
    const handleChange = () => {
      const nextIsMobile = mediaQuery.matches;
      setIsMobile(nextIsMobile);
      if (!nextIsMobile) {
        setIsMobileSheetOpen(false);
      }
    };

    handleChange();
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  useEffect(() => {
    if (!isMobileSheetOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileSheetOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileSheetOpen]);

  const dropdownTrigger = (
    <NotificationBellTrigger
      tooltipLabel={state.tooltipLabel}
      unreadCount={state.unreadCount}
      unreadBadgeLabel={state.unreadBadgeLabel}
    />
  );

  const mobileSheet =
    isMobile && isMobileSheetOpen && typeof document !== 'undefined'
      ? createPortal(
          <div className="fixed inset-0 z-[var(--z-index-modal)] sm:hidden" role="presentation">
            <button
              type="button"
              aria-label={state.t.close || 'Close'}
              className="absolute inset-0 h-full w-full bg-black/25 backdrop-blur-[2px]"
              onClick={() => setIsMobileSheetOpen(false)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-label={state.t.notifications.centerTitle}
              className="fixed inset-x-3 top-[calc(3.75rem+env(safe-area-inset-top))] z-[calc(var(--z-index-modal)+1)] max-h-[min(72vh,34rem)] overflow-hidden rounded-[22px] border border-[var(--border-main)] bg-[var(--card-bg)] shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200"
            >
              <NotificationCenterContent state={state} />
            </div>
          </div>,
          document.body
        )
      : null;

  if (isMobile) {
    return (
      <>
        <NotificationBellTrigger
          tooltipLabel={state.tooltipLabel}
          unreadCount={state.unreadCount}
          unreadBadgeLabel={state.unreadBadgeLabel}
          aria-haspopup="dialog"
          aria-expanded={isMobileSheetOpen}
          onClick={() => setIsMobileSheetOpen((prev) => !prev)}
        />
        {mobileSheet}
      </>
    );
  }

  return (
    <>
      <Tooltip content={state.tooltipLabel} position="bottom">
        <Dropdown
          trigger={dropdownTrigger}
          align={isRtl ? 'start' : 'end'}
          contentClassName="w-[min(22rem,calc(100vw-1rem))] sm:w-96 bg-[var(--card-bg)] border border-[var(--border-main)] shadow-2xl"
        >
          <NotificationCenterContent state={state} />
        </Dropdown>
      </Tooltip>
      {mobileSheet}
    </>
  );
};
