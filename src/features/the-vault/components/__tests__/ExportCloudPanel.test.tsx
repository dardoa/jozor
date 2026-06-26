import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

import type { TranslationSchema } from '../../../../utils/translationLoader';
import { ExportCloudPanel } from '../ExportCloudPanel';

vi.mock('../../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: {
    language: 'en';
    focusId: string;
    people: Record<string, {
      id: string;
      firstName?: string;
      middleName?: string;
      lastName?: string;
      title?: string;
      nickName?: string;
      children?: string[];
      spouses?: string[];
    }>;
  }) => unknown) => selector({
    language: 'en',
    focusId: 'person-1',
    people: {
      'person-1': { id: 'person-1', firstName: 'Root', lastName: 'Person', children: ['person-2'], spouses: [] },
      'person-2': { id: 'person-2', firstName: 'Branch', lastName: 'Person', children: [], spouses: [] },
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
  it('labels manuscript PDF export by document type instead of language', () => {
    render(
      <ExportCloudPanel
        {...baseProps}
        onRunPublishingPreview={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: /Family Book PDF/i })).toBeInTheDocument();
    expect(screen.queryByText(/Enhanced Arabic PDF/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Legacy Vector PDF/i })).toBeInTheDocument();
  });

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
        includeImages: false,
        includeNarrative: false,
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

    expect(screen.getByText('Manuscript Control Panel')).toBeInTheDocument();
    expect(screen.getByText(/Preview and PDF use the same manuscript model and settings/i)).toBeInTheDocument();
    expect(screen.getByText(/People in scope:/i)).toBeInTheDocument();
    expect(screen.getAllByText((_, element) => element?.textContent?.includes('People in scope: 2') ?? false).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/Manuscript root/i), { target: { value: 'Branch Person' } });
    fireEvent.change(screen.getByLabelText(/Branch depth/i), { target: { value: 'all' } });
    fireEvent.click(screen.getByLabelText(/Include photos/i));
    fireEvent.click(screen.getByLabelText(/Narrative draft/i));
    fireEvent.click(screen.getByRole('button', { name: /Preview Manuscript/i }));

    expect(screen.getByText(/Branch Person · Full branch/i)).toBeInTheDocument();
    expect(screen.getAllByText((_, element) => element?.textContent?.includes('People in scope: 1') ?? false).length).toBeGreaterThan(0);
    expect(screen.getByText(/photos, timeline, bibliography, narrative/i)).toBeInTheDocument();

    await waitFor(() => expect(onRunPublishingPreview).toHaveBeenCalled());
    expect(onRunPublishingPreview).toHaveBeenCalledWith(expect.objectContaining({
      manuscriptOptions: expect.objectContaining({
        rootPersonId: 'person-2',
        generationsDepth: 'all',
        includeImages: true,
        includeNarrative: true,
      }),
    }));
  });

  it('opens the manuscript preview in a separate browser window', async () => {
    const write = vi.fn();
    const open = vi.fn();
    const close = vi.fn();
    const focus = vi.fn();
    const previewWindow = {
      document: {
        open,
        write,
        close,
        title: '',
      },
      focus,
    } as unknown as Window;
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(previewWindow);
    const onRunPublishingPreview = vi.fn().mockResolvedValue({
      title: 'Family Manuscript',
      html: '<!doctype html><html><body>Full Preview</body></html>',
      pageEstimate: 4,
    });

    render(
      <ExportCloudPanel
        {...baseProps}
        onRunPublishingPreview={onRunPublishingPreview}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Preview Manuscript/i }));

    await screen.findByText('Estimated pages: 4');
    expect(screen.getAllByRole('button', { name: /Family Book PDF/i })).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /Open Preview/i }));

    expect(openSpy).toHaveBeenCalledWith('', '_blank', 'width=1100,height=900');
    expect(open).toHaveBeenCalled();
    expect(write).toHaveBeenCalledWith('<!doctype html><html><body>Full Preview</body></html>');
    expect(close).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();

    openSpy.mockRestore();
  });

  it('marks an open preview as stale when manuscript settings change', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: /Preview Manuscript/i }));
    await screen.findByText('Estimated pages: 4');

    fireEvent.change(screen.getByLabelText(/Branch depth/i), { target: { value: '4' } });

    expect(screen.getByText(/Settings changed after this preview/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Refresh Preview/i }));

    await waitFor(() => expect(onRunPublishingPreview).toHaveBeenCalledTimes(2));
  });
});
