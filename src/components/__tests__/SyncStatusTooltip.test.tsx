
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
    },
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
        onForceSync={vi.fn()}
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

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Error' }));

    expect(onResetError).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('opens reset confirmation and clears the sync cache on confirm', async () => {
    const onClearSyncCache = vi.fn();
    const onClose = vi.fn();

    render(
      <SyncStatusTooltip
        syncStatus={buildSyncStatus()}
        onForceSync={vi.fn()}
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
});

