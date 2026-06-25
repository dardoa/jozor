import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import type { TranslationSchema } from '../../../../utils/translationLoader';
import { ExportCloudPanel } from '../ExportCloudPanel';

vi.mock('../../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: {
    language: 'en';
    focusId: string;
    people: Record<string, { id: string; firstName?: string; middleName?: string; lastName?: string; title?: string; nickName?: string }>;
  }) => unknown) => selector({
    language: 'en',
    focusId: 'person-1',
    people: {
      'person-1': { id: 'person-1', firstName: 'Root', lastName: 'Person' },
      'person-2': { id: 'person-2', firstName: 'Branch', lastName: 'Person' },
    },
  }),
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
    expect(onRunPublishingPreview).toHaveBeenCalledWith(expect.objectContaining({
      manuscriptOptions: expect.objectContaining({
        rootPersonId: 'person-1',
        generationsDepth: 3,
        includeTimeline: true,
        includeEvidence: true,
      }),
    }));
    expect(await screen.findByText('Estimated pages: 9')).toBeInTheDocument();
  });

  it('passes configured manuscript root and depth to preview', async () => {
    const onRunPublishingPreview = vi.fn().mockResolvedValue({
      title: 'Family Manuscript',
      html: '<!doctype html><html><body>Preview</body></html>',
      pageEstimate: 4,
    });

    render(
      <ExportCloudPanel
        {...baseProps}
        onRunPublishingPreview={onRunPublishingPreview}
      />
    );

    fireEvent.change(screen.getByLabelText(/Manuscript root/i), { target: { value: 'person-2' } });
    fireEvent.change(screen.getByLabelText(/Branch depth/i), { target: { value: 'all' } });
    fireEvent.click(screen.getByRole('button', { name: /Preview Manuscript/i }));

    await waitFor(() => expect(onRunPublishingPreview).toHaveBeenCalled());
    expect(onRunPublishingPreview).toHaveBeenCalledWith(expect.objectContaining({
      manuscriptOptions: expect.objectContaining({
        rootPersonId: 'person-2',
        generationsDepth: 'all',
      }),
    }));
  });
});
