import type { MobileManagementSection, MobileVaultHub, VaultRenderContext } from './vaultDrawerTypes';
import {
  VaultBackupsContent,
  VaultInsightsContent,
  VaultMembersContent,
  VaultSettingsContent,
  VaultTreesContent,
} from './VaultContentSections';

interface VaultMobileContentProps {
  context: VaultRenderContext;
  hub: MobileVaultHub;
  managementSection: MobileManagementSection;
  onManagementSectionChange: (section: MobileManagementSection) => void;
  labels: {
    management: string;
    trees: string;
    members: string;
  };
}

export const VaultMobileContent = ({
  context,
  hub,
  managementSection,
  onManagementSectionChange,
  labels,
}: VaultMobileContentProps) => (
  <div className="vault-tab-content space-y-8 transition-all duration-200 ease-in-out">
    {hub === 'management' && (
      <div className="space-y-8">
        <div className="space-y-4 px-4">
          <h3 className="text-[16px] font-bold tracking-tight text-slate-800">{labels.management}</h3>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#f4efe6] p-1">
            <button
              type="button"
              onClick={() => onManagementSectionChange('trees')}
              className={`min-h-11 rounded-xl px-4 py-3 text-sm transition-all duration-200 ease-in-out ${managementSection === 'trees' ? 'bg-[#a67c37] font-semibold text-white shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}
            >
              {labels.trees}
            </button>
            <button
              type="button"
              onClick={() => onManagementSectionChange('members')}
              className={`min-h-11 rounded-xl px-4 py-3 text-sm transition-all duration-200 ease-in-out ${managementSection === 'members' ? 'bg-[#a67c37] font-semibold text-white shadow-sm' : 'text-slate-600 hover:bg-white/70'}`}
            >
              {labels.members}
            </button>
          </div>
        </div>

        {managementSection === 'trees' ? (
          <VaultTreesContent context={context} compact />
        ) : (
          <VaultMembersContent context={context} />
        )}
      </div>
    )}

    {hub === 'insights' && <VaultInsightsContent context={context} />}

    {hub === 'tools' && (
      <div className="space-y-6">
        <section className="space-y-6">
          <VaultBackupsContent context={context} />
        </section>
        <section className="space-y-6">
          <VaultSettingsContent context={context} />
        </section>
      </div>
    )}
  </div>
);
