
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { TreeMenu } from '../TreeMenu';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      shareTree: 'Share Tree',
      manageTrees: 'Manage Trees',
      manageDriveFiles: 'Manage Backups',
      historyLog: 'Activity History',
      cleanTreeOptionsTitle: 'Start a New Family Tree',
      userMenu: { activityLog: 'Activity Log' },
      settings: {
        snapshotHistory: 'Snapshot History',
        diagnostics: 'Diagnostics',
      },
      treeMenu: 'Tree',
      treeControlCenterTitle: 'Tree Control Center',
      treeControlCenterHint: 'Open the new unified workspace for overview, access, versions, and diagnostics.',
    },
  }),
}));

const buildProps = () => ({
  onOpenTreeControlCenter: vi.fn(),
  onOpenShare: vi.fn(),
  onOpenDiagnostics: vi.fn(),
  onOpenTreeManager: vi.fn(),
  onOpenCloudBackups: vi.fn(),
  onOpenSnapshotHistory: vi.fn(),
  onOpenActivityLog: vi.fn(),
  onOpenCleanTree: vi.fn(),
  showCleanTree: true,
});

describe('TreeMenu', () => {
  it('groups collaboration, management, history, and diagnostics actions with guidance', () => {
    render(<TreeMenu {...buildProps()} />);

    expect(screen.getByText('Tree Control Center')).toBeInTheDocument();
    expect(screen.getByText('Open the new unified workspace for overview, access, versions, and diagnostics.')).toBeInTheDocument();
    expect(screen.getAllByText('Share Tree')).toHaveLength(2);
    expect(screen.getByText('Invite collaborators and manage shared access.')).toBeInTheDocument();
    expect(screen.getByText('Open, rename, or switch the active tree.')).toBeInTheDocument();
    expect(screen.getByText('Review backup files and connected storage.')).toBeInTheDocument();
    expect(screen.getByText('Inspect recent actions across the tree.')).toBeInTheDocument();
    expect(screen.getByText('Browse earlier snapshots and restore points.')).toBeInTheDocument();
    expect(screen.getByText('Check sync, invitations, and notification health.')).toBeInTheDocument();
  });

  it('shows clean tree only for owners and keeps it isolated', () => {
    const props = buildProps();
    const { rerender } = render(<TreeMenu {...props} />);

    expect(screen.getByText('Start a New Family Tree')).toBeInTheDocument();
    expect(screen.getByText('Start over carefully. This is intended for owners only.')).toBeInTheDocument();

    rerender(<TreeMenu {...props} showCleanTree={false} />);

    expect(screen.queryByText('Start over carefully. This is intended for owners only.')).not.toBeInTheDocument();
  });

  it('runs the destructive action when the owner chooses it', () => {
    const props = buildProps();
    render(<TreeMenu {...props} />);

    fireEvent.click(screen.getByRole('menuitem', { name: /Start a New Family Tree/i }));

    expect(props.onOpenCleanTree).toHaveBeenCalledTimes(1);
  });
});

