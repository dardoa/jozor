import React from 'react';

import type { DriveFile, ExportType } from '../../../types';
import type { TranslationSchema } from '../../../utils/translationLoader';
import { ExportCloudPanel } from './ExportCloudPanel';

interface VaultBackupsTabProps {
  canManageCloud: boolean;
  files: DriveFile[];
  t: TranslationSchema;
  onCloseVault: () => void;
  onBackupNow: () => Promise<void> | void;
  onManageDriveFiles: () => void;
  onOpenActivityLog: () => void;
  onRefreshDriveFiles: () => Promise<void> | void;
  onOpenDriveFile: (fileId: string) => Promise<void> | void;
  onRunExport: (type: ExportType) => Promise<void>;
  hasSessionError: boolean;
  isAuthorized: boolean;
  onGoogleLogin: () => void;
  isBackingUp?: boolean;
  isRefreshing?: boolean;
}

const VaultBackupsTab: React.FC<VaultBackupsTabProps> = (props) => (
  <ExportCloudPanel {...props} />
);

export default VaultBackupsTab;
