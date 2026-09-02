
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncStatusTooltip } from '../SyncStatusTooltip';
import type { SyncStatus } from '../../types';

vi.mock('@floating-ui/react', () => ({
  FloatingArrow: () => <div data-testid="floating-arrow" />,
}));

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      common: {
        closeAria: 'Close',
      },
      close: 'Close',
      cancel: 'Cancel',
      confirm: 'Confirm',
      deleteConfirmPlaceholder: 'Type {name}',
      settings: {
        clearSyncQueue: 'Reset Backup Link',
      },
      syncStatus: {
        savingLocally: 'Saving locally...',
        syncing: 'Syncing...',
        checking: 'Checking session...',
        saving: 'Saving...',
        error: 'Sync error',
        offline: 'Offline',
        synced: 'Synced',
        allChangesSaved: 'All changes saved',
        attentionNeeded: 'Attention needed',
        overallLabel: 'Overall',
        cloudSyncLabel: 'Cloud sync (Supabase)',
        backupLabel: 'Backup (Google Drive)',
        databaseSyncLabel: 'Tree database',
        offlineQueueLabel: 'Local queue',
        driveConnectionLabel: 'Google Drive connection',
        backupFileLabel: 'Linked backup file',
        connected: 'Connected',
        disconnected: 'Not connected',
        sessionExpired: 'Reconnect required',
        queueClear: 'No pending changes',
        queuePending: '{count} pending changes',
        backupUnlinked: 'No backup file selected',
        backupReady: 'Ready for first backup',
        openBackupSettings: 'Open backup settings',
        nextActionLabel: 'Next action',
        online: 'Online',
        needsAttention: 'Needs attention',
        lastLabel: 'Last',
        backedUp: 'Backed up',
        uploading: 'Uploading',
        categoryLabel: 'Category',
        whenLabel: 'When',
        retryLabel: 'Retry',
        retryAutomatic: 'Automatic retry expected',
        retryManual: 'Manual action may be required',
        retryAttemptLabel: 'Attempt',
        nextRetryLabel: 'Next retry',
        retryPausedLabel: 'Automatic retries paused. Your changes remain saved locally.',
        retryNow: 'Retry pending changes now',
        backupNow: 'Backup Now (Google Drive)',
        resetBackupTitle: 'Reset backup',
        resetBackupAction: 'Reset Backup Link & Retry',
        dismissError: 'Dismiss Error',
        footerNote: 'Changes are saved to Supabase. Google Drive is used for backups.',
        resetBackupDialogTitle: 'Reset Backup Link',
        resetBackupMessage: 'Reset the backup?',
        resetBackupConfirm: 'Reset & Retry',
        never: 'Never',
      },
    },
    dateLocale: undefined,
  }),
}));

vi.mock('../ConfirmationModal', () => ({
  ConfirmationModal: ({
    isOpen,
    onConfirm,
    title,
  }: {
    isOpen: boolean;
    onConfirm: () => void;
    title: string;
  }) =>
    isOpen ? (
      <button type="button" onClick={onConfirm}>
        {title}
      </button>
    ) : null,
}));

const buildSyncStatus = (overrides: Partial<SyncStatus> = {}): SyncStatus => ({
  state: 'error',
  lastSyncTime: new Date('2026-03-27T12:00:00.000Z'),
  lastSyncSupabase: new Date('2026-03-27T12:00:00.000Z'),
  lastSyncDrive: new Date('2026-03-27T11:55:00.000Z'),
  supabaseStatus: 'error',
  driveStatus: 'idle',
  errorMessage: 'Permission denied while syncing.',
  pendingCount: 2,
  lastErrorCategory: 'PERMISSION',
  lastErrorAt: new Date('2026-03-27T12:01:00.000Z'),
  lastErrorRetryable: false,
  ...overrides,
});

describe('SyncStatusTooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders sync diagnostics and allows dismissing the error', () => {
    const onResetError = vi.fn();
    const onClose = vi.fn();

    render(
      <SyncStatusTooltip
        syncStatus={buildSyncStatus()}
        driveConnectionState="connected"
        hasLinkedBackup
        onForceSync={vi.fn()}
        onOpenVault={vi.fn()}
        onClearSyncCache={vi.fn()}
        onResetError={onResetError}
        onClose={onClose}
        setFloating={vi.fn()}
        setArrowElement={vi.fn()}
        floatingStyles={{}}
        getFloatingProps={() => ({})}
        context={{} as never}
      />
    );

    expect(screen.getByText('Permission denied while syncing.')).toBeInTheDocument();
    expect(screen.getByText('Category: PERMISSION')).toBeInTheDocument();
    expect(screen.getByText('Retry: Manual action may be required')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry pending changes now' }));

    expect(onResetError).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens reset confirmation and clears the sync cache on confirm', async () => {
    const onClearSyncCache = vi.fn();
    const onClose = vi.fn();

    render(
      <SyncStatusTooltip
        syncStatus={buildSyncStatus({
          state: 'synced',
          supabaseStatus: 'idle',
          driveStatus: 'error',
          pendingCount: 0,
          errorMessage: undefined,
        })}
        driveConnectionState="connected"
        hasLinkedBackup
        onForceSync={vi.fn()}
        onOpenVault={vi.fn()}
        onClearSyncCache={onClearSyncCache}
        onResetError={vi.fn()}
        onClose={onClose}
        setFloating={vi.fn()}
        setArrowElement={vi.fn()}
        floatingStyles={{}}
        getFloatingProps={() => ({})}
        context={{} as never}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset Backup Link & Retry' }));

    expect(await screen.findByRole('button', { name: 'Reset Backup Link' })).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Reset Backup Link' }));
    });

    expect(onClearSyncCache).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows paused retry diagnostics and offers an explicit retry action', () => {
    const onResetError = vi.fn();

    render(
      <SyncStatusTooltip
        syncStatus={buildSyncStatus({
          retryAttempt: 6,
          retryPaused: true,
          nextRetryAt: null,
        })}
        driveConnectionState="connected"
        hasLinkedBackup
        onForceSync={vi.fn()}
        onOpenVault={vi.fn()}
        onClearSyncCache={vi.fn()}
        onResetError={onResetError}
        onClose={vi.fn()}
        setFloating={vi.fn()}
        setArrowElement={vi.fn()}
        floatingStyles={{}}
        getFloatingProps={() => ({})}
        context={{} as never}
      />
    );

    expect(screen.getByText('Attempt: 6')).toBeInTheDocument();
    expect(screen.getByText('Automatic retries paused. Your changes remain saved locally.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry pending changes now' }));
    expect(onResetError).toHaveBeenCalledTimes(1);
  });

  it('does not claim a Drive backup exists when no file is linked', () => {
    const onOpenVault = vi.fn();

    render(
      <SyncStatusTooltip
        syncStatus={buildSyncStatus({
          state: 'synced',
          supabaseStatus: 'idle',
          driveStatus: 'idle',
          pendingCount: 0,
          errorMessage: undefined,
          lastSyncDrive: null,
        })}
        driveConnectionState="connected"
        hasLinkedBackup={false}
        onForceSync={vi.fn()}
        onOpenVault={onOpenVault}
        onClearSyncCache={vi.fn()}
        onResetError={vi.fn()}
        onClose={vi.fn()}
        setFloating={vi.fn()}
        setArrowElement={vi.fn()}
        floatingStyles={{}}
        getFloatingProps={() => ({})}
        context={{} as never}
      />
    );

    expect(screen.getByText('No backup file selected')).toBeInTheDocument();
    expect(screen.queryByText('Backed up')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Open backup settings' }));
    expect(onOpenVault).toHaveBeenCalledTimes(1);
  });
});

