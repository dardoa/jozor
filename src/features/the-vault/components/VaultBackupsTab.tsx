import React from 'react';

import type { DriveFile, ExportType, PublishingExportOptions, PublishingPreviewResult } from '../../../types';
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
  onRunPublishingExport?: (options: PublishingExportOptions) => Promise<void>;
  onRunPublishingPreview?: (options: Pick<PublishingExportOptions, 'templateId' | 'renderer'>) => Promise<PublishingPreviewResult>;
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
