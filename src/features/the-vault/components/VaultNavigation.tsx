import { useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { VaultTab } from '../types';

interface DesktopNavItem {
  id: VaultTab;
  icon: LucideIcon;
  label: string;
}

export const VaultDesktopNavigation = ({
  items,
  activeTab,
  onSelect,
  label,
}: {
  items: readonly DesktopNavItem[];
  activeTab: VaultTab;
  onSelect: (tab: VaultTab) => void;
  label: string;
}) => (
  <nav
    aria-label={label}
    className="flex w-[13.5rem] shrink-0 flex-col gap-1 overflow-y-auto border-e border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-4"
  >
    {items.map((item) => {
      const Icon = item.icon;
      const isActive = activeTab === item.id;
      return (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          aria-current={isActive ? 'page' : undefined}
          className={`flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-start text-sm transition-colors ${isActive ? 'bg-[var(--primary-600)] font-semibold text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-main)]'}`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="min-w-0 leading-snug">{item.label}</span>
        </button>
      );
    })}
  </nav>
);

export const VaultMobileNavigation = ({
  items,
  activeTab,
  onSelect,
  label,
}: {
  items: readonly DesktopNavItem[];
  activeTab: VaultTab;
  onSelect: (tab: VaultTab) => void;
  label: string;
}) => {
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof activeItemRef.current?.scrollIntoView === 'function') {
      activeItemRef.current.scrollIntoView({ block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  return (
    <div className="shrink-0 border-b border-[var(--border-soft)] bg-[var(--surface-app)] px-3 py-2">
      <nav
        aria-label={label}
        className="flex gap-1 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              ref={isActive ? activeItemRef : undefined}
              key={item.id}
              onClick={() => onSelect(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 py-2 text-center text-[13px] transition-colors ${isActive ? 'bg-[var(--primary-600)] font-semibold text-white shadow-sm' : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]'}`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
