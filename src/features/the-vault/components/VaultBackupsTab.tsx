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
  onOpenActivityLog: () => void;
  onRefreshDriveFiles: () => Promise<void> | void;
  onOpenDriveFile: (fileId: string) => Promise<void> | void;
  onSaveAsNewFile: (fileName: string) => Promise<void> | void;
  onOverwriteDriveFile: (fileId: string) => Promise<void> | void;
  onDeleteDriveFile: (fileId: string) => Promise<void> | void;
  onRunExport: (type: ExportType) => Promise<void>;
  onRunPublishingExport?: (options: { templateId: string; format: 'png' | 'pdf' }) => Promise<void>;
  hasSessionError: boolean;
  isAuthorized: boolean;
  onGoogleLogin: () => void;
  currentActiveDriveFileId: string | null;
  isBackingUp?: boolean;
  isRefreshing?: boolean;
  isSaving?: boolean;
  isDeleting?: boolean;
}

const VaultBackupsTab: React.FC<VaultBackupsTabProps> = (props) => (
  <ExportCloudPanel {...props} />
);

export default VaultBackupsTab;
