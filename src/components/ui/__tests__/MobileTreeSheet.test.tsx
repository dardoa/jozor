
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { MobileTreeSheet } from '../MobileTreeSheet';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      manageTrees: 'Manage Trees',
      shareTree: 'Share Tree',
      historyLog: 'History',
      cleanTreeOptionsTitle: 'Clean Tree',
      settings: {
        close: 'Close',
        snapshotHistory: 'Snapshots',
        diagnostics: 'Diagnostics',
      },
      userMenu: {
        activityLog: 'Activity Log',
      },
      treeMenu: 'Tree',
      treeControlCenterTitle: 'Tree Control Center',
      treeControlCenterHint: 'Open the new unified workspace for overview, access, versions, and diagnostics.',
    },
  }),
}));

describe('MobileTreeSheet', () => {
  it('renders tree actions as a mobile sheet and routes clicks', () => {
    const onClose = vi.fn();
    const onOpenTreeControlCenter = vi.fn();
    const onOpenShare = vi.fn();
    const onOpenDiagnostics = vi.fn();
    const onOpenTreeManager = vi.fn();
    const onOpenCloudBackups = vi.fn();
    const onOpenSnapshotHistory = vi.fn();
    const onOpenActivityLog = vi.fn();
    const onOpenCleanTree = vi.fn();

    render(
      <MobileTreeSheet
        isOpen
        onClose={onClose}
        onOpenTreeControlCenter={onOpenTreeControlCenter}
        onOpenShare={onOpenShare}
        onOpenDiagnostics={onOpenDiagnostics}
        onOpenTreeManager={onOpenTreeManager}
        onOpenCloudBackups={onOpenCloudBackups}
        onOpenSnapshotHistory={onOpenSnapshotHistory}
        onOpenActivityLog={onOpenActivityLog}
        onOpenCleanTree={onOpenCleanTree}
        showCleanTree
      />
    );

    expect(screen.getByRole('heading', { name: 'Tree' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Tree Control Center/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Tree Control Center/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenTreeControlCenter).toHaveBeenCalledTimes(1);
  });
});

