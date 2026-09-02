import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { TreeSettings } from '../../../../types';
import { en } from '../../../../utils/translations/en';
import { ActiveTreeCard } from '../ActiveTreeCard';
import { PrivacySettingsPanel } from '../PrivacySettingsPanel';
import { VaultTabLoader } from '../VaultTabLoader';
import { VaultTreesPanel } from '../VaultTreesPanel';
import { TreeGridList } from '../TreeGridList';

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
    expect(screen.getByRole('heading', { name: 'Collaboration access' })).toBeInTheDocument();
    expect(screen.getByText('Private tree')).toBeInTheDocument();
    expect(screen.queryByText('Reset options')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Privacy Mode' }));
    expect(onUpdateSetting).toHaveBeenCalledWith('privacyMode', true);
  });

  it('explains why privacy settings are unavailable when no tree is open', () => {
    render(
      <PrivacySettingsPanel
        currentTreeId={null}
        treeSettings={{ privacyMode: false } as TreeSettings}
        treeIsPrivate
        canManageSecurity
        onUpdateSetting={vi.fn()}
        t={en}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Open a tree to review its privacy settings.');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('does not expose privacy controls without owner permission', () => {
    render(
      <PrivacySettingsPanel
        currentTreeId="tree-1"
        treeSettings={{ privacyMode: true } as TreeSettings}
        treeIsPrivate={false}
        canManageSecurity={false}
        onUpdateSetting={vi.fn()}
        t={en}
      />
    );

    expect(screen.getByRole('status')).toHaveTextContent('Only the tree owner can change these privacy settings.');
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
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

  it('disambiguates duplicate names and formats update dates explicitly', () => {
    render(
      <TreeGridList
        title="Manage owned trees"
        items={[
          { id: 'tree-1', name: 'New Family Tree', createdAt: '2026-04-01T00:00:00.000Z', role: 'owner' },
          { id: 'tree-2', name: 'New Family Tree', createdAt: '2026-05-30T00:00:00.000Z', role: 'owner' },
        ]}
        activeTreeId="tree-1"
        busyId={null}
        editingId={null}
        editName=""
        onEditNameChange={vi.fn()}
        onSelect={vi.fn()}
        emptyText="No trees"
        labels={{
          locale: 'en-US',
          duplicateName: 'Tree {index} of {total} with this name',
        }}
        compact
      />
    );

    expect(screen.getByLabelText('Tree 1 of 2 with this name')).toBeInTheDocument();
    expect(screen.getByLabelText('Tree 2 of 2 with this name')).toBeInTheDocument();
    expect(screen.getByText(/Updated Apr 1, 2026/)).toBeInTheDocument();
  });
});
