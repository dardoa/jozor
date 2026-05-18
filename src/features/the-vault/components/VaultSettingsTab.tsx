import React from 'react';

import type { TreeSettings, UserProfile } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { PrivacySettingsPanel } from './PrivacySettingsPanel';

interface VaultSettingsTabProps {
  currentTreeId: string | null;
  currentUser: UserProfile | null;
  treeSettings: TreeSettings;
  treeIsPrivate: boolean;
  canManageSecurity: boolean;
  isPasswordResetting: boolean;
  canResetPassword: boolean;
  onResetPassword: () => void;
  onOpenDiagnostics: () => void;
  onOpenCleanTree: () => void;
  onUpdateSetting: (key: keyof TreeSettings, value: boolean | string | number | null) => void;
  section?: 'all' | 'privacy' | 'maintenance';
  t: TranslationSchema;
}

const VaultSettingsTab: React.FC<VaultSettingsTabProps> = (props) => (
  <PrivacySettingsPanel {...props} />
);

export default VaultSettingsTab;
