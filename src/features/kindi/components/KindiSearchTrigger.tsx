import React, { memo, useState, Suspense } from 'react';
import { Search, Sparkles } from 'lucide-react';

import { KindiIcon } from '../../../components/icons/KindiIcon';
import type { SearchProps } from '../../../types/ui';

const LazyKindiOverlayWrapper = React.lazy(() => import('./KindiOverlayWrapper'));

export const KindiSearchTrigger: React.FC<SearchProps> = memo(({ people, onFocusPerson }) => {
  const [hasOpened, setHasOpened] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setHasOpened(true);
    setIsOpen(true);
  };

  return (
    <>
      <button
        id="tree-search-input"
        type="button"
        onClick={handleOpen}
        className="group flex w-full items-center gap-2.5 rounded-full border border-[var(--border-soft)] bg-[var(--surface-panel)] px-4 py-2 text-start shadow-sm transition hover:bg-[var(--surface-hover)] hover:shadow-md lg:w-56 xl:w-64"
        aria-label="Open Kindi intelligent assistant"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--primary-600)] shadow-sm ring-1 ring-[var(--border-soft)]">
          <KindiIcon size={24} className="h-6 w-6 object-contain" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black text-[var(--text-main)]">اسأل كيندي</span>
          <span className="hidden truncate text-[11px] font-medium text-[var(--text-muted)] xl:block">
            بحث، علاقات، أو إجراء آمن
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
            onClose={() => setIsOpen(false)}
            people={people}
            onFocusPerson={onFocusPerson}
          />
        </Suspense>
      ) : null}
    </>
  );
});

KindiSearchTrigger.displayName = 'KindiSearchTrigger';
