import { Settings, ShieldAlert, User } from 'lucide-react';
import type { GlobalSettingsTab } from '../useGlobalSettingsModalState';

interface GlobalSettingsTabsProps {
  activeTab: GlobalSettingsTab;
  setActiveTab: (tab: GlobalSettingsTab) => void;
  labels: {
    profile: string;
    preferences: string;
    security: string;
  };
}

export const GlobalSettingsTabs = ({
  activeTab,
  setActiveTab,
  labels,
}: GlobalSettingsTabsProps) => {
  const tabs = [
    { id: 'profile' as const, icon: User, label: labels.profile },
    { id: 'preferences' as const, icon: Settings, label: labels.preferences },
    { id: 'security' as const, icon: ShieldAlert, label: labels.security },
  ];

  return (
    <div className="flex px-6 border-b border-[var(--border-soft)] bg-[var(--surface-panel-subtle)]/75">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id)}
          className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-all border-b-2 ${activeTab === tab.id
            ? 'border-[var(--color-info-500)] text-[var(--color-info-500)] bg-[var(--surface-subtle)]'
            : 'border-transparent text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--surface-hover)]'
            }`}
        >
          <tab.icon className="w-4 h-4" />
          {tab.label}
        </button>
      ))}
    </div>
  );
};
