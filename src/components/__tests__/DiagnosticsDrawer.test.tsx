import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DiagnosticsDrawer } from '../../features/diagnostics';

const { pruneTreeOperationsMock, pruneActivityLogsMock, showErrorMock, showLoadingMock, updateToastMock, clearOutgoingQueueMock } = vi.hoisted(() => ({
  pruneTreeOperationsMock: vi.fn(),
  pruneActivityLogsMock: vi.fn(),
  showErrorMock: vi.fn(),
  showLoadingMock: vi.fn(() => 'toast-1'),
  updateToastMock: vi.fn(),
  clearOutgoingQueueMock: vi.fn(),
}));

const mockState = {
  isDiagnosticsDrawerOpen: true,
  setDiagnosticsDrawerOpen: vi.fn(),
  syncStatus: {
    state: 'synced',
    lastSyncTime: null,
    lastSyncSupabase: null,
    lastSyncDrive: null,
    supabaseStatus: 'idle',
    driveStatus: 'idle',
    pendingCount: 0,
    errorMessage: undefined,
    lastErrorCategory: undefined,
    lastErrorAt: null as Date | null,
    lastErrorRetryable: undefined as boolean | undefined,
  },
  invitationTelemetry: {
    lastHydratedAt: new Date('2026-03-27T12:00:00.000Z'),
    lastHydrationCount: 2,
    lastHydrationAddedCount: 1,
    lastHydrationRemovedCount: 0,
    lastEventAt: new Date('2026-03-27T12:05:00.000Z'),
    lastEventSource: 'my-realtime',
    lastEventStatus: 'pending',
    lastEventInvitationId: 'inv-1',
    lastIgnoredAt: new Date('2026-03-27T12:04:00.000Z'),
    lastIgnoredSource: 'owned-realtime',
    lastIgnoredStatus: 'revoked',
    lastOwnerEventAt: new Date('2026-03-27T12:06:00.000Z'),
    lastOwnerEventStatus: 'declined',
    lastOwnerEventEmail: 'invitee@example.com',
    lastOwnerEventRole: 'viewer',
    lastOwnerEventInvitationId: 'inv-2',
    lastErrorAt: null as Date | null,
    lastErrorMessage: undefined as string | undefined,
  },
  notificationTelemetry: {
    lastEventAt: new Date('2026-03-27T11:55:00.000Z'),
    lastEventType: 'birthday',
    lastEventSource: 'heritage',
    lastEventPersonId: 'person-1',
    lastEventDedupKey: 'birthday:person-1:1980:3:27',
    lastIntegrityCount: undefined,
    lastBirthdayName: 'Owner Person',
    lastSkippedAt: new Date('2026-03-27T11:50:00.000Z'),
    lastSkippedSource: 'integrity',
    lastSkippedReason: 'integrity-session-guard:2026-03-27',
  },
  currentTreeId: 'tree-1' as string | null,
  currentUserRole: 'owner' as 'owner' | 'editor' | 'viewer' | null,
  user: {
    uid: 'user-1',
    email: 'owner@example.com',
    displayName: 'Owner',
    photoURL: '',
    supabaseToken: 'token-1',
  },
};

vi.mock('../../store/useAppStore', () => ({
  useAppStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      settings: {
        close: 'Close Diagnostics',
        performance: 'Performance',
        syncDiagnostics: 'Sync Diagnostics',
        syncStateLabel: 'Sync State',
        pendingChangesLabel: 'Pending Changes',
        lastSyncLabel: 'Last Overall Sync',
        lastSupabaseSyncLabel: 'Last Supabase Sync',
        lastDriveSyncLabel: 'Last Drive Sync',
        lastErrorCategoryLabel: 'Error Category',
        lastErrorAtLabel: 'Error Time',
        retryExpectationLabel: 'Retry',
        retryAutomatic: 'Automatic retry expected',
        retryManual: 'Manual action may be required',
        invitationDiagnostics: 'Invitation Diagnostics',
        notificationDiagnostics: 'Notification Diagnostics',
        lastNotificationEventLabel: 'Last Notification Event',
        lastNotificationTypeLabel: 'Last Notification Type',
        lastNotificationSourceLabel: 'Last Notification Source',
        lastNotificationTargetLabel: 'Last Notification Target',
        lastNotificationDedupLabel: 'Last Notification Key',
        lastNotificationSkipLabel: 'Last Skipped Notification',
        noNotificationActivity: 'None',
        lastInvitationHydrationLabel: 'Last Hydration',
        lastInvitationEventLabel: 'Last Invitation Event',
        hydrationSummaryLabel: 'Hydration Summary',
        lastInvitationSourceLabel: 'Last Event Source',
        lastInvitationStatusLabel: 'Last Event Status',
        lastInvitationIdLabel: 'Last Invitation ID',
        lastInvitationIgnoredLabel: 'Last Ignored Event',
        lastInvitationIgnoredAtLabel: 'Ignored Event Time',
        lastOwnerInvitationEventLabel: 'Last Owner Event',
        lastOwnerInvitationDetailsLabel: 'Owner Event Details',
        invitationErrorLabel: 'Invitation Telemetry Error',
        noInvitationActivity: 'None',
        neverSynced: 'Never',
        maintenance: 'Maintenance',
        maintenanceDesc: 'Run lightweight cleanup tasks for sync and activity history on the active tree.',
        maintenanceOwnerOnly: 'Maintenance tools are available only to the tree owner while a tree is open.',
        pruneOperations: 'Prune Old Sync Operations',
        pruneActivityLogs: 'Prune Old Activity Logs',
        pruneOperationsRunning: 'Pruning old sync operations...',
        pruneActivityLogsRunning: 'Pruning old activity logs...',
        pruneOperationsSuccess: 'Removed {count} old sync operations.',
        pruneActivityLogsSuccess: 'Removed {count} old activity log entries.',
        pruneOperationsError: 'Failed to prune old sync operations.',
        pruneActivityLogsError: 'Failed to prune old activity logs.',
        clearSyncQueue: 'Clear Pending Syncs',
        clearSyncQueueDesc: 'Remove all unsaved changes waiting for upload. This cannot be undone.',
        clearSyncConfirmValue: 'CLEAR',
        clearSyncConfirmPlaceholder: 'Type CLEAR to confirm',
      },
    },
    dateLocale: undefined,
  }),
}));

vi.mock('../../context/OverlayContext', () => ({
  OverlayPrimitive: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}));

vi.mock('../ConfirmationModal', () => ({
  ConfirmationModal: ({ isOpen, onConfirm, title }: { isOpen: boolean; onConfirm: () => void; title: string }) =>
    isOpen ? (
      <button type="button" onClick={onConfirm}>
        {title}
      </button>
    ) : null,
}));

vi.mock('../../services/deltaSyncService', () => ({
  deltaSyncService: {
    clearOutgoingQueue: (...args: unknown[]) => clearOutgoingQueueMock(...args),
    getLastCheckpointVersion: () => 42,
  },
}));

vi.mock('../../services/operationalMaintenanceService', () => ({
  pruneTreeOperations: (...args: unknown[]) => pruneTreeOperationsMock(...args),
  pruneActivityLogs: (...args: unknown[]) => pruneActivityLogsMock(...args),
}));

vi.mock('../../utils/showToast', () => ({
  showToast: Object.assign(
    vi.fn(),
    {
      error: (...args: unknown[]) => showErrorMock(...args),
      loading: showLoadingMock as unknown as (message: string) => string,
      success: (...args: unknown[]) => updateToastMock(...args),
      promise: vi.fn(),
    }
  )
}));

describe('DiagnosticsDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.currentTreeId = 'tree-1';
    mockState.currentUserRole = 'owner';
    mockState.user = {
      uid: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner',
      photoURL: '',
      supabaseToken: 'token-1',
    };
    pruneTreeOperationsMock.mockResolvedValue(5);
    pruneActivityLogsMock.mockResolvedValue(3);
  });

  it('shows diagnostics and maintenance actions for the tree owner', async () => {
    render(<DiagnosticsDrawer />);

    expect(screen.getByText('Sync Diagnostics')).toBeInTheDocument();
    expect(screen.getByText('Notification Diagnostics')).toBeInTheDocument();
    expect(screen.getByText('Invitation Diagnostics')).toBeInTheDocument();
    expect(screen.getByText('synced')).toBeInTheDocument();
    expect(screen.getByText('birthday')).toBeInTheDocument();
    expect(screen.getByText('heritage')).toBeInTheDocument();
    expect(screen.getByText('Owner Person')).toBeInTheDocument();
    expect(screen.getByText('birthday:person-1:1980:3:27')).toBeInTheDocument();
    expect(screen.getByText('integrity:integrity-session-guard:2026-03-27')).toBeInTheDocument();
    expect(screen.getByText('2/1/0')).toBeInTheDocument();
    expect(screen.getByText('my-realtime')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();
    expect(screen.getByText('inv-1')).toBeInTheDocument();
    expect(screen.getByText('owned-realtime:revoked')).toBeInTheDocument();
    expect(screen.getByText(/invitee@example.com/i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Prune Old Sync Operations' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Prune Old Activity Logs' })).toBeInTheDocument();
  });

  it('shows invitation telemetry errors when present', () => {
    mockState.invitationTelemetry.lastErrorAt = new Date('2026-03-27T12:07:00.000Z');
    mockState.invitationTelemetry.lastErrorMessage = 'Hydration failed after login.';

    render(<DiagnosticsDrawer />);

    expect(screen.getByText('Invitation Telemetry Error')).toBeInTheDocument();
    expect(screen.getByText('Hydration failed after login.')).toBeInTheDocument();

    mockState.invitationTelemetry.lastErrorAt = null;
    mockState.invitationTelemetry.lastErrorMessage = undefined;
  });

  it('hides maintenance actions for non-owners', async () => {
    mockState.currentUserRole = 'editor';

    render(<DiagnosticsDrawer />);

    expect(screen.queryByRole('button', { name: 'Prune Old Sync Operations' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Prune Old Activity Logs' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear Pending Syncs' })).toBeDisabled();
    expect(await screen.findByText('Maintenance tools are available only to the tree owner while a tree is open.')).toBeInTheDocument();
  });

  it('runs the tree operation cleanup action', async () => {
    render(<DiagnosticsDrawer />);

    fireEvent.click(await screen.findByRole('button', { name: 'Prune Old Sync Operations' }));

    await waitFor(() => {
      expect(pruneTreeOperationsMock).toHaveBeenCalledWith(
        'tree-1',
        expect.objectContaining({
          uid: 'user-1',
          email: 'owner@example.com',
          supabaseToken: 'token-1',
        }),
        2000
      );
    });
  });

  it('shows success feedback when activity log cleanup completes', async () => {
    render(<DiagnosticsDrawer />);

    fireEvent.click(await screen.findByRole('button', { name: 'Prune Old Activity Logs' }));

    await waitFor(() => {
      expect(pruneActivityLogsMock).toHaveBeenCalledWith(
        'tree-1',
        expect.objectContaining({
          uid: 'user-1',
          email: 'owner@example.com',
          supabaseToken: 'token-1',
        }),
        180
      );
    });

    expect(showLoadingMock).toHaveBeenCalledWith('Pruning old activity logs...');
    expect(updateToastMock).toHaveBeenCalledWith(
      'Removed 3 old activity log entries.',
      { id: 'toast-1', duration: 3500 }
    );
  });

  it('shows error feedback when maintenance fails', async () => {
    pruneTreeOperationsMock.mockRejectedValueOnce(new Error('Database temporarily unavailable.'));

    render(<DiagnosticsDrawer />);

    fireEvent.click(await screen.findByRole('button', { name: 'Prune Old Sync Operations' }));

    await waitFor(() => {
      expect(showErrorMock).toHaveBeenCalledWith(
        'Database temporarily unavailable.',
        { id: 'toast-1', duration: 4500 }
      );
    });
  });

  it('disables maintenance actions while a cleanup task is running', async () => {
    let resolveMaintenance: ((value: number) => void) | undefined;
    pruneTreeOperationsMock.mockImplementationOnce(
      () =>
        new Promise<number>((resolve) => {
          resolveMaintenance = resolve;
        })
    );

    render(<DiagnosticsDrawer />);

    const pruneOperationsButton = await screen.findByRole('button', { name: 'Prune Old Sync Operations' });
    const pruneActivityButton = await screen.findByRole('button', { name: 'Prune Old Activity Logs' });

    fireEvent.click(pruneOperationsButton);

    await waitFor(() => {
      expect(pruneOperationsButton).toBeDisabled();
      expect(pruneActivityButton).toBeDisabled();
    });

    act(() => {
      resolveMaintenance?.(7);
    });

    await waitFor(() => {
      expect(pruneOperationsButton).not.toBeDisabled();
      expect(pruneActivityButton).not.toBeDisabled();
    });
  });

  it('opens the clear sync confirmation from diagnostics', async () => {
    render(<DiagnosticsDrawer />);

    fireEvent.click(await screen.findByRole('button', { name: 'Clear Pending Syncs' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Clear Pending Syncs' })[1]);

    await waitFor(() => {
      expect(clearOutgoingQueueMock).toHaveBeenCalled();
    });
  });
});
