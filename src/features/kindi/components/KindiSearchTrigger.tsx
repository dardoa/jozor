import React, { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, Suspense } from 'react';
import { Search, Sparkles } from 'lucide-react';

import { KindiIcon } from '../../../components/icons/KindiIcon';
import { useTranslation } from '../../../context/TranslationContext';
import type { SearchProps } from '../../../types/ui';

const LazyKindiOverlayWrapper = React.lazy(() => import('./KindiOverlayWrapper'));

export const KindiSearchTrigger: React.FC<SearchProps> = memo(({
  people,
  onFocusPerson,
  onOpenPersonRecord,
}) => {
  const { t } = useTranslation();
  const [hasOpened, setHasOpened] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isOpenRef = useRef(false);
  const shouldRestoreFocusRef = useRef(false);

  const handleOpen = useCallback(() => {
    shouldRestoreFocusRef.current = false;
    isOpenRef.current = true;
    setHasOpened(true);
    setIsOpen(true);
  }, []);

  const handleClose = useCallback(() => {
    if (!isOpenRef.current) return;
    isOpenRef.current = false;
    shouldRestoreFocusRef.current = true;
    setIsOpen(false);
  }, []);

  useLayoutEffect(() => {
    if (isOpen || !shouldRestoreFocusRef.current) return;
    shouldRestoreFocusRef.current = false;
    triggerRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    const openKindi = () => handleOpen();
    window.addEventListener('jozor:open-kindi', openKindi);
    return () => {
      window.removeEventListener('jozor:open-kindi', openKindi);
    };
  }, [handleOpen]);

  return (
    <>
      <button
        ref={triggerRef}
        id="tree-search-input"
        type="button"
        onClick={handleOpen}
        className="group flex w-full items-center gap-2.5 rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-start shadow-sm transition hover:bg-[var(--surface-hover)] hover:shadow-md lg:w-56 xl:w-64"
        aria-label={t.kindi.triggerLabel}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls="kindi-dialog"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-600)] shadow-sm ring-1 ring-[var(--border-soft)]">
          <KindiIcon size={24} className="h-6 w-6 object-contain" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-[var(--text-main)]">{t.kindi.triggerTitle}</span>
          <span className="hidden truncate text-[11px] font-medium text-[var(--text-muted)] xl:block">
            {t.kindi.triggerSubtitle}
          </span>
        </span>
        <span className="relative text-[var(--primary-600)]">
          <Search className="h-4 w-4 transition group-hover:scale-110" />
          <Sparkles className="absolute -right-1 -top-1 h-2.5 w-2.5 text-[var(--color-warning-500)]" />
        </span>
      </button>

      {hasOpened ? (
        <Suspense fallback={null}>
          <LazyKindiOverlayWrapper
            isOpen={isOpen}
            onClose={handleClose}
            people={people}
            onFocusPerson={onFocusPerson}
            onOpenPersonRecord={onOpenPersonRecord}
          />
        </Suspense>
      ) : null}
    </>
  );
});

KindiSearchTrigger.displayName = 'KindiSearchTrigger';
