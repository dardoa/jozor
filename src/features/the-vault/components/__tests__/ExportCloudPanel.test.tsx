import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import type { TranslationSchema } from '../../../../utils/translationLoader';
import { ExportCloudPanel } from '../ExportCloudPanel';

vi.mock('../../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { language: 'en' }) => unknown) => selector({ language: 'en' }),
}));

vi.mock('../../../../utils/showToast', () => ({
  showToast: {
    error: vi.fn(),
    success: vi.fn(),
    promise: vi.fn(),
  },
}));

const t = {
  vaultSessionExpired: 'Your session has expired.',
  vaultCloudBackupTitle: 'Cloud backup',
  vaultBackupNow: 'Backup now',
  vaultActivityLog: 'Activity log',
  vaultExportDataTitle: 'Export data',
  vaultCloudFiles: 'Cloud files',
  vaultCloudFilesHint: 'Manage Google Drive backups from this tab.',
  vaultRefreshCloudFiles: 'Refresh files',
  googleDriveFileName: 'File name',
  saveAsNewFile: 'Save as new file',
  vaultCloudEmpty: 'No cloud files yet.',
  active: 'Active',
  confirmOverwrite: 'Confirm overwrite',
  overwrite: 'Overwrite',
  vaultOpenCloudFile: 'Open file',
  confirmDelete: 'Confirm delete',
  delete: 'Delete',
  vaultCloudAccessLimited: 'Cloud access is limited.',
  vaultExportArchive: 'Jozor archive',
  vaultExportJson: 'JSON',
  vaultExportGedcom: 'GEDCOM',
  vaultExportCalendar: 'Calendar',
  vaultExportMarkdown: 'Markdown',
  vaultExportPng: 'PNG',
  vaultExportPdf: 'PDF',
  vaultExportPrint: 'Print',
} as unknown as TranslationSchema;

const baseProps = {
  canManageCloud: true,
  files: [],
  t,
  onCloseVault: vi.fn(),
  onBackupNow: vi.fn(),
  onOpenActivityLog: vi.fn(),
  onRefreshDriveFiles: vi.fn(),
  onOpenDriveFile: vi.fn(),
  onSaveAsNewFile: vi.fn(),
  onOverwriteDriveFile: vi.fn(),
  onDeleteDriveFile: vi.fn(),
  onRunExport: vi.fn(),
  onRunPublishingExport: vi.fn(),
  hasSessionError: false,
  isAuthorized: true,
  onGoogleLogin: vi.fn(),
  currentActiveDriveFileId: null,
};

describe('ExportCloudPanel manuscript preview', () => {
  it('shows the estimated page count returned by the HTML manuscript preview', async () => {
    const onRunPublishingPreview = vi.fn().mockResolvedValue({
      title: 'Family Manuscript',
      html: '<!doctype html><html><body>Preview</body></html>',
      pageEstimate: 9,
    });

    render(
      <ExportCloudPanel
        {...baseProps}
        onRunPublishingPreview={onRunPublishingPreview}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Preview Manuscript/i }));

    await waitFor(() => expect(onRunPublishingPreview).toHaveBeenCalled());
    expect(await screen.findByText('Estimated pages: 9')).toBeInTheDocument();
  });
});
