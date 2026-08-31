import type { VaultRenderContext, VaultTab } from '../types';
import {
  VaultBackupsContent,
  VaultInsightsContent,
  VaultMembersContent,
  VaultSettingsContent,
  VaultTreesContent,
} from './VaultContentSections';

export const VaultMobileContent = ({
  context,
  tab,
}: {
  context: VaultRenderContext;
  tab: VaultTab;
}) => (
  <div className="vault-tab-content transition-all duration-200 ease-in-out">
    {tab === 'trees' && <VaultTreesContent context={context} compact />}
    {tab === 'stats' && <VaultInsightsContent context={context} />}
    {tab === 'cloud' && <VaultBackupsContent context={context} />}
    {tab === 'members' && <VaultMembersContent context={context} />}
    {tab === 'security' && <VaultSettingsContent context={context} />}
  </div>
);
