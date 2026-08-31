import React from 'react';

import type { TreeSettings } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { PrivacySettingsPanel } from './PrivacySettingsPanel';

interface VaultSettingsTabProps {
  currentTreeId: string | null;
  treeSettings: TreeSettings;
  treeIsPrivate: boolean;
  canManageSecurity: boolean;
  onUpdateSetting: (key: keyof TreeSettings, value: boolean | string | number | null) => void;
  t: TranslationSchema;
}

const VaultSettingsTab: React.FC<VaultSettingsTabProps> = (props) => (
  <PrivacySettingsPanel {...props} />
);

export default VaultSettingsTab;
