import type { LucideIcon } from 'lucide-react';
import type { MobileVaultHub, VaultTab } from './vaultDrawerTypes';

interface DesktopNavItem {
  id: VaultTab;
  icon: LucideIcon;
  label: string;
}

interface MobileHubItem {
  id: MobileVaultHub;
  icon: LucideIcon;
  label: string;
}

export const VaultDesktopNavigation = ({
  items,
  activeTab,
  onSelect,
}: {
  items: readonly DesktopNavItem[];
  activeTab: VaultTab;
  onSelect: (tab: VaultTab) => void;
}) => (
  <nav className="flex w-48 shrink-0 flex-col gap-1 overflow-y-auto border-e border-[var(--border-soft)] bg-[var(--surface-app)] py-3">
    {items.map((item) => {
      const Icon = item.icon;
      const isActive = activeTab === item.id;
      return (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className={`mx-2 flex items-center gap-2.5 rounded-2xl px-4 py-2.5 text-start text-sm transition-all duration-200 ease-in-out ${isActive ? 'bg-[#a67c37] font-semibold text-white shadow-sm' : 'border border-black/[0.04] bg-white/40 text-slate-600 hover:bg-white'}`}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="truncate">{item.label}</span>
        </button>
      );
    })}
  </nav>
);

export const VaultMobileHubNavigation = ({
  items,
  activeHub,
  onSelect,
}: {
  items: readonly MobileHubItem[];
  activeHub: MobileVaultHub;
  onSelect: (hub: MobileVaultHub) => void;
}) => (
  <div className="shrink-0 bg-[var(--surface-app)] px-4 pt-4">
    <nav
      className="grid grid-cols-3 gap-2 rounded-2xl bg-[#f4efe6] p-1"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeHub === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className={`flex min-h-11 items-center justify-center gap-2 rounded-[14px] px-3 py-3 text-center text-sm transition-all duration-200 ease-in-out ${isActive ? 'bg-[#a67c37] font-semibold text-white shadow-sm' : 'bg-transparent text-slate-600 hover:bg-white/70'}`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  </div>
);
