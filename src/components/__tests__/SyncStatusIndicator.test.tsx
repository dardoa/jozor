// @ts-nocheck
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncStatusIndicator } from '../SyncStatusIndicator';
import type { SyncStatus } from '../../types';

const useSyncStatusMock = vi.fn();
const syncTooltipMock = vi.fn();

vi.mock('../../hooks/useSyncStatus', () => ({
  useSyncStatus: () => useSyncStatusMock(),
}));

vi.mock('../SyncStatusFloatingLayer', () => ({
  default: (props: unknown) => {
    syncTooltipMock(props);
    return <div data-testid="sync-tooltip">Sync tooltip</div>;
  },
}));

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      syncStatus: {
        ariaLabel: 'Sync Status',
      },
    },
  }),
}));

const buildSyncStatus = (overrides: Partial<SyncStatus> = {}): SyncStatus => ({
  state: 'error',
  lastSyncTime: null,
  lastSyncSupabase: null,
  lastSyncDrive: null,
  supabaseStatus: 'error',
  driveStatus: 'idle',
  pendingCount: 2,
  errorMessage: 'Needs attention',
  lastErrorCategory: 'PERMISSION',
  lastErrorAt: null,
  lastErrorRetryable: false,
  ...overrides,
});

describe('SyncStatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSyncStatusMock.mockReturnValue({
      syncStatus: buildSyncStatus(),
      forceDriveSync: vi.fn(),
      onClearSyncCache: vi.fn(),
      resetError: vi.fn(),
    });
  });

  it('opens the tooltip and passes sync actions through', async () => {
    const forceDriveSync = vi.fn();
    const onClearSyncCache = vi.fn();
    const resetError = vi.fn();

    useSyncStatusMock.mockReturnValue({
      syncStatus: buildSyncStatus(),
      forceDriveSync,
      onClearSyncCache,
      resetError,
    });

    render(<SyncStatusIndicator />);

    const trigger = screen.getByRole('button', { name: 'Sync Status' });
    expect(trigger.querySelector('span')).toHaveClass('bg-red-500');

    fireEvent.click(trigger);

    expect(await screen.findByTestId('sync-tooltip')).toBeInTheDocument();
    expect(syncTooltipMock).toHaveBeenCalledTimes(1);
    expect(syncTooltipMock).toHaveBeenCalledWith(
      expect.objectContaining({
        syncStatus: expect.objectContaining({ state: 'error', pendingCount: 2 }),
        forceDriveSync,
        onClearSyncCache,
        resetError,
      })
    );
  });

  it('reflects offline sync state styling on the trigger', () => {
    useSyncStatusMock.mockReturnValue({
      syncStatus: buildSyncStatus({
        state: 'offline',
        supabaseStatus: 'idle',
        errorMessage: undefined,
        lastErrorCategory: undefined,
        lastErrorRetryable: undefined,
      }),
      forceDriveSync: vi.fn(),
      onClearSyncCache: vi.fn(),
      resetError: vi.fn(),
    });

    render(<SyncStatusIndicator />);

    expect(screen.getByRole('button', { name: 'Sync Status' }).querySelector('span')).toHaveClass('bg-gray-500');
  });
});

