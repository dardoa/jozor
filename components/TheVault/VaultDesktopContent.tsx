import type { VaultRenderContext, VaultTab } from './vaultDrawerTypes';
import {
  VaultBackupsContent,
  VaultInsightsContent,
  VaultMembersContent,
  VaultSettingsContent,
  VaultTreesContent,
} from './VaultContentSections';

export const VaultDesktopContent = ({
  context,
  tab,
}: {
  context: VaultRenderContext;
  tab: VaultTab;
}) => (
  <>
    {tab === 'trees' && <VaultTreesContent context={context} />}
    {tab === 'stats' && <VaultInsightsContent context={context} />}
    {tab === 'members' && <VaultMembersContent context={context} />}
    {tab === 'security' && <VaultSettingsContent context={context} />}
    {tab === 'cloud' && <VaultBackupsContent context={context} />}
  </>
);
