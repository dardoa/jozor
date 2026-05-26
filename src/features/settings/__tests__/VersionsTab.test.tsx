
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { VersionsTab } from '../components/VersionsTab';
import { OverlayProvider } from '../../../context/OverlayContext';

const listSnapshotsMock = vi.fn();
const renameFileMock = vi.fn();
const deleteFileMock = vi.fn();

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      delete: 'Delete',
      treeManager: {
        createManualSnapshot: 'Create Manual Snapshot',
        snapshotLabelPlaceholder: 'Snapshot name...',
        previousVersions: 'Previous Versions',
        noSnapshotsYet: 'No snapshots found yet.',
        aboutSnapshotsTitle: 'About Snapshots',
        aboutSnapshotsBody: 'Snapshots are stored in hidden app data.',
        confirmRestoreVersion: 'Restore this version?',
        confirmDeleteVersion: 'Delete this version?',
      },
      versions: {
        save: 'Save',
        restore: 'Restore',
        untitled: 'Untitled',
        pinned: 'Pinned',
        unpinned: 'Unpinned',
      },
      messages: {
        success: {
          snapshot: 'Snapshot created',
          restore: 'Restored',
          deleteSuccess: 'Deleted',
        },
        error: {
          snapshot: 'Snapshot failed',
          load: 'Load failed',
          rename: 'Rename failed',
          delete: 'Delete failed',
        },
      },
      adminHub: {
        versionsPanel: {
          createDescription: 'Capture a labeled restore point before risky edits or collaboration changes.',
          listDescription: 'Pinned versions stay protected while regular snapshots can be restored or cleaned up later.',
          pinAction: 'Pin version',
          unpinAction: 'Unpin version',
          infoPrefix: 'Note:',
        },
      },
    },
    dateLocale: undefined,
  }),
}));

vi.mock('../../../services/googleService', () => ({
  googleDriveService: {
    listSnapshots: (...args: unknown[]) => listSnapshotsMock(...args),
    renameFile: (...args: unknown[]) => renameFileMock(...args),
    deleteFile: (...args: unknown[]) => deleteFileMock(...args),
  },
}));

vi.mock('../../../utils/showToast', () => ({
  showToast: Object.assign(
    vi.fn(),
    {
      success: vi.fn(),
      error: vi.fn(),
      promise: vi.fn(),
    }
  )
}));

vi.mock('../../../ConfirmationModal', () => ({
  ConfirmationModal: () => null,
}));

describe('VersionsTab', () => {
  it('uses the drive service to pin a version and shows the new helper copy', async () => {
    listSnapshotsMock.mockResolvedValue([
      {
        id: 'snapshot-1',
        name: 'snapshot_tree-1_2026-03-29T10-00-00Z_Family_Checkpoint.json',
        modifiedTime: '2026-03-29T10:00:00.000Z',
      },
    ]);
    renameFileMock.mockResolvedValue(undefined);

    render(
      <OverlayProvider>
        <VersionsTab
          treeId="tree-1"
          language="en"
          googleSync={{
            handleCreateSnapshot: vi.fn(),
            handleRestoreSnapshot: vi.fn(),
          }}
        />
      </OverlayProvider>
    );

    expect(await screen.findByText('Capture a labeled restore point before risky edits or collaboration changes.')).toBeInTheDocument();
    expect(screen.getByText('Pinned versions stay protected while regular snapshots can be restored or cleaned up later.')).toBeInTheDocument();
    expect(screen.getByText(/^Note:/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Pin version' }));

    await waitFor(() => {
      expect(renameFileMock).toHaveBeenCalledWith(
        'snapshot-1',
        'pinned_snapshot_tree-1_2026-03-29T10-00-00Z_Family_Checkpoint.json'
      );
    });
  });
});

