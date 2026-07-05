import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useControlledPdfReadiness } from '../../../publishing/hooks';

vi.mock('../../../publishing/hooks', () => ({
  useControlledPdfReadiness: vi.fn().mockReturnValue({
    status: 'ready',
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

import type { TranslationSchema } from '../../../../utils/translationLoader';
import { ExportCloudPanel } from '../ExportCloudPanel';
import { ManuscriptExportSummary } from '../ManuscriptExportSummary';

const mockLoadExportHistory = vi.fn().mockResolvedValue(undefined);
const mockClearExportHistory = vi.fn().mockResolvedValue(undefined);
let mockExportHistoryData: Record<string, unknown>[] = [];

vi.mock('../../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: Record<string, unknown>) => unknown) => selector({
    language: 'en',
    focusId: 'person-1',
    people: {
      'person-1': { id: 'person-1', firstName: 'Root', lastName: 'Person', children: ['person-2'], spouses: [] },
      'person-2': { id: 'person-2', firstName: 'Branch', lastName: 'Person', children: [], spouses: [] },
    },
    exportHistory: mockExportHistoryData,
    loadExportHistory: mockLoadExportHistory,
    clearExportHistory: mockClearExportHistory,
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
  it('renders neutral manuscript summary fallbacks when values are missing', () => {
    render(
      <ManuscriptExportSummary
        language="en"
        rootPersonName=""
        generationsDepth="all"
        manuscriptScopePersonCount={0}
        manuscriptOrderingLabel="Family path"
        includedManuscriptSections="timeline, bibliography"
        previewStatus="idle"
      />
    );

    expect(screen.getByText(/Root person:/i)).toBeInTheDocument();
    expect(screen.getByText(/Not selected/i)).toBeInTheDocument();
    expect(screen.getByText(/All branch/i)).toBeInTheDocument();
    expect(screen.getByText(/Citation coverage: Not calculated/i)).toBeInTheDocument();
  });

  it('shows Family Book PDF button and hides Legacy Vector PDF button', async () => {
    const onRunPublishingExport = vi.fn().mockResolvedValue(undefined);
    render(
      <ExportCloudPanel
        {...baseProps}
        onRunPublishingExport={onRunPublishingExport}
        onRunPublishingPreview={vi.fn()}
      />
    );

    // Family Book PDF must remain visible
    expect(screen.getByRole('button', { name: /Family Book PDF/i })).toBeInTheDocument();

    // Legacy Vector PDF must no longer be visible
    expect(screen.queryByRole('button', { name: /Legacy Vector PDF/i })).not.toBeInTheDocument();

    // Enhanced Arabic PDF path was never shown either
    expect(screen.queryByText(/Enhanced Arabic PDF/i)).not.toBeInTheDocument();

    // Family Book PDF calls the handler with the manuscript renderer
    fireEvent.click(screen.getByRole('button', { name: /Family Book PDF/i }));
    await waitFor(() => expect(onRunPublishingExport).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'classic-book-manuscript',
        format: 'pdf',
        renderer: 'html-print',
      })
    ));
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
        orderingStrategy: 'narrative',
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
    expect(screen.getByText(/Estimated people count:/i)).toBeInTheDocument();
    expect(screen.getAllByText((_, element) => element?.textContent?.includes('Estimated people count: 2') ?? false).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ordering strategy:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Family path/i).length).toBeGreaterThan(0);

    fireEvent.change(screen.getByLabelText(/Manuscript root/i), { target: { value: 'Branch Person' } });
    fireEvent.change(screen.getByLabelText(/Branch depth/i), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText(/Reading order/i), { target: { value: 'alphabetical' } });
    fireEvent.click(screen.getByLabelText(/Include available profile photos/i));
    fireEvent.click(screen.getByLabelText(/Draft biography text/i));
    fireEvent.click(screen.getByRole('button', { name: /Preview Manuscript/i }));

    expect(screen.getByText(/Root person:/i)).toBeInTheDocument();
    expect(screen.getByText(/Depth:/i)).toBeInTheDocument();
    expect(screen.getByText(/All branch/i)).toBeInTheDocument();
    expect(screen.getAllByText((_, element) => element?.textContent?.includes('Estimated people count: 1') ?? false).length).toBeGreaterThan(0);
    expect(screen.getByText(/photos, timeline, bibliography, narrative/i)).toBeInTheDocument();
    expect(screen.getByTestId('manuscript-visual-review-hint')).toHaveTextContent(/Manuscript renderer visual review/i);

    await waitFor(() => expect(onRunPublishingPreview).toHaveBeenCalled());
    expect(onRunPublishingPreview).toHaveBeenCalledWith(expect.objectContaining({
      manuscriptOptions: expect.objectContaining({
        rootPersonId: 'person-2',
        generationsDepth: 'all',
        orderingStrategy: 'alphabetical',
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

  it('renders the Controlled PDF readiness diagnostic indicator based on status hook', async () => {
    vi.mocked(useControlledPdfReadiness).mockReturnValue({
      status: 'ready',
      refresh: vi.fn().mockResolvedValue(undefined),
    });

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

    const indicator = await screen.findByTestId('controlled-pdf-readiness-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveTextContent('PDF engine: Ready');
  });

  it('renders manuscript summary panel with root, depth, strategy, and citation coverage stats', async () => {
    const onRunPublishingPreview = vi.fn().mockResolvedValue({
      title: 'Family Manuscript',
      html: '<html><body>Preview</body></html>',
      pageEstimate: 4,
      citationCoverage: 75,
    });

    render(
      <ExportCloudPanel
        {...baseProps}
        onRunPublishingPreview={onRunPublishingPreview}
      />
    );

    // Initial state check - citation coverage defaults to "Not calculated"
    const citation = screen.getByTestId('manuscript-citation-coverage-indicator');
    expect(citation).toHaveTextContent('Citation coverage: Not calculated');

    // Run preview to get calculated stats
    fireEvent.click(screen.getByRole('button', { name: /Preview Manuscript/i }));
    await screen.findByText('Estimated pages: 4');

    // Check summary parameters and updated citation metrics
    const summary = screen.getByTestId('manuscript-export-summary');
    expect(summary).toBeInTheDocument();
    expect(summary).toHaveTextContent(/Root person:/i);
    expect(summary).toHaveTextContent(/Depth:/i);
    expect(summary).toHaveTextContent(/Ordering strategy:/i);
    expect(summary).toHaveTextContent(/Included content:/i);

    expect(screen.getByTestId('manuscript-citation-coverage-indicator')).toHaveTextContent('Citation coverage: 75%');
    expect(screen.queryByTestId('manuscript-low-citation-warning')).not.toBeInTheDocument();
  });

  it('renders warning banner if citation coverage is low', async () => {
    const onRunPublishingPreview = vi.fn().mockResolvedValue({
      title: 'Family Manuscript',
      html: '<html><body>Preview</body></html>',
      pageEstimate: 4,
      citationCoverage: 20,
    });

    render(
      <ExportCloudPanel
        {...baseProps}
        onRunPublishingPreview={onRunPublishingPreview}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Preview Manuscript/i }));
    await screen.findByText('Estimated pages: 4');

    expect(screen.getByTestId('manuscript-citation-coverage-indicator')).toHaveTextContent('Citation coverage: 20%');
    expect(screen.getByTestId('manuscript-low-citation-warning')).toHaveTextContent(/Low citation coverage/i);
  });

  it('verifies preview status changes when options are modified', async () => {
    const onRunPublishingPreview = vi.fn().mockResolvedValue({
      title: 'Family Manuscript',
      html: '<html><body>Preview</body></html>',
      pageEstimate: 4,
    });

    render(
      <ExportCloudPanel
        {...baseProps}
        onRunPublishingPreview={onRunPublishingPreview}
      />
    );

    // Initial state: not generated
    expect(screen.getByTestId('manuscript-preview-status-indicator')).toHaveTextContent('Preview not generated');

    // Generate preview
    fireEvent.click(screen.getByRole('button', { name: /Preview Manuscript/i }));
    await screen.findByText('Estimated pages: 4');
    expect(screen.getByTestId('manuscript-preview-status-indicator')).toHaveTextContent('Preview ready');

    // Change setting to make it stale
    fireEvent.change(screen.getByLabelText(/Branch depth/i), { target: { value: '4' } });
    expect(screen.getByTestId('manuscript-preview-status-indicator')).toHaveTextContent('Preview stale - refresh recommended');
  });

  it('retains controlled PDF readiness indicator as purely informational with no active button', () => {
    render(
      <ExportCloudPanel
        {...baseProps}
      />
    );

    const pdfButton = screen.queryByRole('button', { name: /Export controlled PDF/i });
    expect(pdfButton).not.toBeInTheDocument();

    const indicator = screen.getByTestId('controlled-pdf-readiness-indicator');
    expect(indicator).toBeInTheDocument();
  });

  it('keeps visible options honest by renaming photos/drafts and hiding custom reading order from select element', () => {
    render(
      <ExportCloudPanel
        {...baseProps}
      />
    );

    // Honest labels must be visible
    expect(screen.getByText(/Include available profile photos/i)).toBeInTheDocument();
    expect(screen.getByText(/Draft biography text/i)).toBeInTheDocument();

    // Check custom option is not present in select dropdown
    // Check custom option is not present in select dropdown
    const select = screen.getByLabelText(/Reading order/i) as HTMLSelectElement;
    const options = Array.from(select.options).map(opt => opt.value);
    expect(options).not.toContain('custom');
    expect(options).toContain('narrative');
    expect(options).toContain('chronological');
    expect(options).toContain('alphabetical');
  });

  it('marks preview as stale when any relevant option is changed', async () => {
    const onRunPublishingPreview = vi.fn().mockResolvedValue({
      title: 'Family Manuscript',
      html: '<html><body>Preview</body></html>',
      pageEstimate: 4,
    });

    const { rerender } = render(
      <ExportCloudPanel
        {...baseProps}
        onRunPublishingPreview={onRunPublishingPreview}
      />
    );

    // Helper to generate preview and verify ready
    const generatePreview = async () => {
      fireEvent.click(screen.getByRole('button', { name: /Preview Manuscript/i }));
      await screen.findByText('Estimated pages: 4');
      expect(screen.getByTestId('manuscript-preview-status-indicator')).toHaveTextContent('Preview ready');
    };

    // Test 1: Root Person change triggers stale
    await generatePreview();
    fireEvent.change(screen.getByLabelText(/Manuscript root/i), { target: { value: 'Branch Person' } });
    expect(screen.getByTestId('manuscript-preview-status-indicator')).toHaveTextContent('Preview stale');

    // Clean rerender for next test
    rerender(<ExportCloudPanel {...baseProps} onRunPublishingPreview={onRunPublishingPreview} />);

    // Test 2: Reading order change triggers stale
    await generatePreview();
    fireEvent.change(screen.getByLabelText(/Reading order/i), { target: { value: 'chronological' } });
    expect(screen.getByTestId('manuscript-preview-status-indicator')).toHaveTextContent('Preview stale');

    // Clean rerender for next test
    rerender(<ExportCloudPanel {...baseProps} onRunPublishingPreview={onRunPublishingPreview} />);

    // Test 3: Photos change triggers stale
    await generatePreview();
    fireEvent.click(screen.getByLabelText(/Include available profile photos/i));
    expect(screen.getByTestId('manuscript-preview-status-indicator')).toHaveTextContent('Preview stale');

    // Clean rerender for next test
    rerender(<ExportCloudPanel {...baseProps} onRunPublishingPreview={onRunPublishingPreview} />);

    // Test 4: Narrative change triggers stale
    await generatePreview();
    fireEvent.click(screen.getByLabelText(/Draft biography text/i));
    expect(screen.getByTestId('manuscript-preview-status-indicator')).toHaveTextContent('Preview stale');

    // Clean rerender for next test
    rerender(<ExportCloudPanel {...baseProps} onRunPublishingPreview={onRunPublishingPreview} />);

    // Test 5: Timeline change triggers stale
    await generatePreview();
    fireEvent.click(screen.getByLabelText(/Include timeline/i));
    expect(screen.getByTestId('manuscript-preview-status-indicator')).toHaveTextContent('Preview stale');

    // Clean rerender for next test
    rerender(<ExportCloudPanel {...baseProps} onRunPublishingPreview={onRunPublishingPreview} />);

    // Test 6: Bibliography change triggers stale
    await generatePreview();
    fireEvent.click(screen.getByLabelText(/Include bibliography/i));
    expect(screen.getByTestId('manuscript-preview-status-indicator')).toHaveTextContent('Preview stale');
  });

  it('refreshes the preview when clicking the emerald button in the modal if the preview is stale', async () => {
    const onRunPublishingPreview = vi.fn().mockResolvedValue({
      title: 'Family Manuscript',
      html: '<html><body>Preview</body></html>',
      pageEstimate: 4,
    });
    const onRunPublishingExport = vi.fn().mockResolvedValue(undefined);

    render(
      <ExportCloudPanel
        {...baseProps}
        onRunPublishingPreview={onRunPublishingPreview}
        onRunPublishingExport={onRunPublishingExport}
      />
    );

    // 1. Click preview to open modal
    fireEvent.click(screen.getByRole('button', { name: /Preview Manuscript/i }));
    await screen.findByText('Estimated pages: 4');

    // 2. Change a setting inside the main view to make it stale
    fireEvent.change(screen.getByLabelText(/Branch depth/i), { target: { value: '4' } });
    expect(screen.getByTestId('manuscript-preview-status-indicator')).toHaveTextContent('Preview stale');

    // 3. Click the Refresh Preview button (which takes the place of the PDF button when stale)
    const actionButton = screen.getByRole('button', { name: /Refresh Preview/i });
    expect(actionButton).toBeInTheDocument();

    // Clear mock calls to be sure
    onRunPublishingPreview.mockClear();
    fireEvent.click(actionButton);

    // Should call preview generation instead of export
    await waitFor(() => expect(onRunPublishingPreview).toHaveBeenCalled());
    expect(onRunPublishingExport).not.toHaveBeenCalled();
  });

  it('direct card Family Book PDF button uses the current options directly', async () => {
    const onRunPublishingExport = vi.fn().mockResolvedValue(undefined);
    render(
      <ExportCloudPanel
        {...baseProps}
        onRunPublishingExport={onRunPublishingExport}
      />
    );

    // Change some settings
    fireEvent.change(screen.getByLabelText(/Branch depth/i), { target: { value: 'all' } });
    fireEvent.change(screen.getByLabelText(/Reading order/i), { target: { value: 'chronological' } });

    // Click direct card export
    fireEvent.click(screen.getByRole('button', { name: /Family Book PDF/i }));

    await waitFor(() => expect(onRunPublishingExport).toHaveBeenCalled());
    expect(onRunPublishingExport).toHaveBeenCalledWith(expect.objectContaining({
      templateId: 'classic-book-manuscript',
      format: 'pdf',
      manuscriptOptions: expect.objectContaining({
        generationsDepth: 'all',
        orderingStrategy: 'chronological',
      }),
    }));
  });

  describe('Publishing History and Quality Panel', () => {
    beforeEach(() => {
      mockExportHistoryData = [];
      mockLoadExportHistory.mockClear();
      mockClearExportHistory.mockClear();
    });

    it('calls loadExportHistory on mount', () => {
      render(<ExportCloudPanel {...baseProps} />);
      expect(mockLoadExportHistory).toHaveBeenCalled();
    });

    it('renders empty history placeholder when no history exists', () => {
      render(<ExportCloudPanel {...baseProps} />);
      expect(screen.getByText('No export history available yet.')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Clear History/i })).not.toBeInTheDocument();
    });

    it('renders successful export history with templates, health, citations, and config options', () => {
      mockExportHistoryData = [
        {
          id: 1,
          publicationId: 'pub-1',
          templateId: 'classic-book-manuscript',
          exportType: 'publishing',
          createdAt: new Date().toISOString(),
          totalPages: 10,
          totalPeople: 25,
          totalFamilies: 8,
          initiatedBy: 'user-1',
          success: true,
          durationMs: 4500,
          warnings: [],
          privacy: { masked: true },
          evidence: { citationCoverage: 0.85 },
          integrity: { healthScore: 94, issueCount: 2 },
          manuscript: {
            generationsDepth: 3,
            orderingStrategy: 'narrative',
            includeImages: true,
            includeTimeline: true,
            includeEvidence: true,
            includeNarrative: true,
            orderedPersonCount: 25,
          },
        },
      ];

      render(<ExportCloudPanel {...baseProps} />);

      // Friendly template name and success status
      expect(screen.getByText('Family Book')).toBeInTheDocument();
      expect(screen.getByText('Success')).toBeInTheDocument();

      // Core metadata
      expect(screen.getByText('10 pages')).toBeInTheDocument();
      expect(screen.getByText('25 people')).toBeInTheDocument();
      expect(screen.getByText('masked')).toBeInTheDocument();

      // Integrity and Evidence
      expect(screen.getByText('Health:')).toBeInTheDocument();
      expect(screen.getByText('94%')).toBeInTheDocument();
      expect(screen.getByText('Citations:')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
      expect(screen.getByText('Issues:')).toBeInTheDocument();
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);

      // Config Options
      expect(screen.getByText('Export Configuration:')).toBeInTheDocument();
      expect(screen.getByText('3 gens')).toBeInTheDocument();
      expect(screen.getAllByText('Family path').length).toBeGreaterThan(0);
      expect(screen.getByText('photos, timeline, bibliography, narrative')).toBeInTheDocument();
    });

    it('renders warnings and failures correctly without exposing raw warning strings', () => {
      mockExportHistoryData = [
        {
          id: 2,
          publicationId: 'pub-2',
          templateId: 'gedcom',
          exportType: 'publishing',
          createdAt: new Date().toISOString(),
          totalPages: 0,
          totalPeople: 15,
          totalFamilies: 4,
          initiatedBy: 'user-1',
          success: true,
          durationMs: 1200,
          warnings: ['WARNING: Sensitive John Doe has issue'],
          privacy: { masked: false },
        },
      ];

      render(<ExportCloudPanel {...baseProps} />);

      expect(screen.getAllByText('GEDCOM').length).toBeGreaterThan(0);
      expect(screen.getByText('Warnings')).toBeInTheDocument();
      // Verify safe warnings message displays warning count, NOT raw warning string
      expect(screen.queryByText(/John Doe/i)).not.toBeInTheDocument();
      expect(screen.getByText('1 warnings reported during export.')).toBeInTheDocument();
    });

    it('requires a two-step confirmation to clear history', () => {
      mockExportHistoryData = [
        {
          id: 3,
          publicationId: 'pub-3',
          templateId: 'json',
          exportType: 'publishing',
          createdAt: new Date().toISOString(),
          totalPages: 0,
          totalPeople: 5,
          totalFamilies: 1,
          initiatedBy: 'user-1',
          success: true,
          durationMs: 500,
          warnings: [],
        },
      ];

      render(<ExportCloudPanel {...baseProps} />);

      const clearBtn = screen.getByRole('button', { name: /Clear History/i });
      expect(clearBtn).toBeInTheDocument();

      // First click: changes button label to "Confirm clear"
      fireEvent.click(clearBtn);
      expect(mockClearExportHistory).not.toHaveBeenCalled();
      expect(screen.getByRole('button', { name: /Confirm clear/i })).toBeInTheDocument();

      // Second click: calls clearExportHistory
      fireEvent.click(screen.getByRole('button', { name: /Confirm clear/i }));
      expect(mockClearExportHistory).toHaveBeenCalled();
    });
  });
});
