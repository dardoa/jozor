import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TreeSettings } from '../../../../types';
import { en } from '../../../../utils/translations/en';
import { ActiveTreeCard } from '../ActiveTreeCard';
import { PrivacySettingsPanel } from '../PrivacySettingsPanel';
import { VaultTabLoader } from '../VaultTabLoader';
import { VaultTreesPanel } from '../VaultTreesPanel';

const treePanelProps = {
  treeName: 'Family Tree',
  treeId: null,
  roleLabel: 'Owner',
  ownedTrees: [],
  sharedTrees: [],
  busyTreeId: null,
  editingTreeId: null,
  editTreeName: '',
  compact: true,
  retryLabel: 'Try again',
  labels: {
    activeTree: 'Active tree',
    createTree: 'New',
    importTree: 'Import',
    importTreeHint: 'Import creates a separate tree.',
    refreshTrees: 'Refresh trees',
    ownedTitle: 'Owned trees',
    sharedTitle: 'Shared trees',
    ownedEmpty: 'No owned trees.',
    sharedEmpty: 'No shared trees.',
    ownedCount: 'Owned',
    sharedCount: 'Shared',
    loading: 'Loading your trees...',
    list: {},
  },
  maintenanceLabels: {
    title: 'Reset current tree',
    hint: 'Start over.',
    action: 'Reset options',
  },
  onCreateTree: vi.fn(),
  onImportTree: vi.fn(),
  onRefreshTrees: vi.fn(),
  onOpenTree: vi.fn(),
  onStartRename: vi.fn(),
  onConfirmRename: vi.fn(),
  onCancelRename: vi.fn(),
  onEditTreeNameChange: vi.fn(),
  onDeleteTree: vi.fn(),
  onOpenMaintenance: vi.fn(),
};

describe('Vault core panels', () => {
  it('keeps tree actions visible and exposes refresh as an icon command', () => {
    const onCreate = vi.fn();
    const onImport = vi.fn();
    const onRefresh = vi.fn();

    render(
      <ActiveTreeCard
        treeName="Family Tree"
        treeId="tree-1"
        roleLabel="Owner"
        ownedCount={2}
        sharedCount={1}
        labels={{ refreshTrees: 'Refresh trees' }}
        onCreate={onCreate}
        onImport={onImport}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'New' }));
    fireEvent.click(screen.getByRole('button', { name: 'Import as new tree' }));
    fireEvent.click(screen.getByRole('button', { name: 'Refresh trees' }));

    expect(onCreate).toHaveBeenCalledOnce();
    expect(onImport).toHaveBeenCalledOnce();
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('keeps privacy focused on masking and excludes destructive maintenance', () => {
    const onUpdateSetting = vi.fn();
    render(
      <PrivacySettingsPanel
        currentTreeId="tree-1"
        treeSettings={{ privacyMode: false } as TreeSettings}
        treeIsPrivate
        canManageSecurity
        onUpdateSetting={onUpdateSetting}
        t={en}
      />
    );

    expect(screen.getByRole('heading', { name: 'Tree Privacy' })).toBeInTheDocument();
    expect(screen.queryByText('Reset options')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Privacy Mode' }));
    expect(onUpdateSetting).toHaveBeenCalledWith('privacyMode', true);
  });

  it('announces lazy section loading instead of rendering a blank panel', () => {
    render(<VaultTabLoader label="Loading Vault section" />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading Vault section');
  });

  it('does not show empty tree states while the tree list is loading', () => {
    render(<VaultTreesPanel {...treePanelProps} isTreeLoading loadError={null} />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading your trees...');
    expect(screen.queryByText('No owned trees.')).not.toBeInTheDocument();
    expect(screen.queryByText('No shared trees.')).not.toBeInTheDocument();
  });

  it('keeps tree loading errors visible and exposes a working retry action', () => {
    const onRefreshTrees = vi.fn();
    render(
      <VaultTreesPanel
        {...treePanelProps}
        isTreeLoading={false}
        loadError="Unable to load trees."
        onRefreshTrees={onRefreshTrees}
      />
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load trees.');
    expect(screen.queryByText('No owned trees.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRefreshTrees).toHaveBeenCalledTimes(1);
  });
});
