import type { VaultRenderContext, VaultTab } from '../types';
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
  <div className={tab === 'cloud' ? 'w-full' : 'mx-auto w-full max-w-[960px]'}>
    {tab === 'trees' && <VaultTreesContent context={context} />}
    {tab === 'stats' && <VaultInsightsContent context={context} />}
    {tab === 'members' && <VaultMembersContent context={context} />}
    {tab === 'security' && <VaultSettingsContent context={context} />}
    {tab === 'cloud' && <VaultBackupsContent context={context} />}
  </div>
);
