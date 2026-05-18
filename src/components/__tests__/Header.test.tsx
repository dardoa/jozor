
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { Header } from '../header/Header';
import type { HeaderProps } from '../../types';

const mockAppStoreState = {
  currentTreeId: 'tree-1' as string | null,
  treeName: 'Active Shared Tree',
};

vi.mock('../../store/useAppStore', () => ({
  useAppStore: vi.fn((selector: any) => selector(mockAppStoreState)),
}));


vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      treeLabelPrefix: 'Tree: ',
      untitledTree: 'Untitled tree',
      roleLabelPrefix: 'Role: ',
      roles: {
        owner: 'Tree owner',
        editor: 'Editor',
        viewer: 'Viewer',
        unknown: 'Unknown',
      },
      syncStatusPrefix: 'Status: ',
      demoMode: 'Demo mode',
      syncStatus: {
        saving: 'Saving...',
        error: 'Sync error',
        offline: 'Offline',
        synced: 'Synced',
      },
    },
  }),
}));

vi.mock('../header/HeaderLeftSection', () => ({
  HeaderLeftSection: () => <div data-testid="header-left" />,
}));

vi.mock('../header/HeaderRightSection', () => ({
  HeaderRightSection: () => <div data-testid="header-right" />,
}));

const buildHeaderProps = (): any => ({
  toggleDetailsPanel: vi.fn(),
  detailsPanelOpen: false,
  hasActivePerson: true,
  historyControls: {
    canUndo: false,
    canRedo: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
  },
  themeLanguage: {
    language: 'en',
    setLanguage: vi.fn(),
  },
  auth: {
    user: {
      uid: 'user-1',
      email: 'owner@example.com',
      displayName: 'Owner',
      photoURL: '',
      supabaseToken: 'token-1',
    },
    isDemoMode: false,
    onLogin: vi.fn(async () => {}),
    onLogout: vi.fn(async () => {}),
    stopSyncing: vi.fn(),
    onLoadCloudData: vi.fn(async () => {}),
    onSaveNewCloudFile: vi.fn(async () => {}),
    driveFiles: [{ id: 'file-1', name: 'Family Archive' } as never],
    currentActiveDriveFileId: 'file-1',
    fileOwnerUid: null,
    refreshDriveFiles: vi.fn(async () => {}),
    handleLoadDriveFile: vi.fn(async () => {}),
    handleSaveAsNewDriveFile: vi.fn(async () => {}),
    handleOverwriteExistingDriveFile: vi.fn(async () => {}),
    handleDeleteDriveFile: vi.fn(async () => {}),
    isSavingDriveFile: false,
    isDeletingDriveFile: false,
    isListingDriveFiles: false,
    handleCreateSnapshot: vi.fn(async () => {}),
    handleRestoreSnapshot: vi.fn(async () => {}),
    onOpenDriveFileManager: vi.fn(),
    onOpenTreeManager: vi.fn(),
    onOpenLoginModal: vi.fn(async () => {}),
    syncStatus: {
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
    },
  },
  viewSettings: {
    treeSettings: {} as never,
    setTreeSettings: vi.fn(),
    onPresent: vi.fn(),
    onOpenSnapshotHistory: vi.fn(),
    currentUserRole: 'editor',
    isAdvancedBarOpen: false,
    setAdvancedBarOpen: vi.fn(),
  },
  toolsActions: {
    onOpenModal: vi.fn(),
    onOpenActivityLog: vi.fn(),
  } as never,
  exportActions: {
    onExport: vi.fn(),
  } as never,
  searchProps: {
    searchTerm: '',
    setSearchTerm: vi.fn(),
    searchResults: [],
    setShowSearchResults: vi.fn(),
    showSearchResults: false,
    handleFocusPerson: vi.fn(),
  } as never,
  globalActions: {
    onOpenGlobalSettings: vi.fn(),
    onOpenDiagnostics: vi.fn(),
    onOpenTreeManager: vi.fn(),
    onOpenLoginModal: vi.fn(),
    onOpenSnapshotHistory: vi.fn(),
    onOpenShareModal: vi.fn(),
  } as never,
});

describe('Header', () => {
  it('renders the center status strip with tree, role, and sync state', () => {
    render(<Header {...buildHeaderProps()} />);

    expect(screen.getByText('Tree: Active Shared Tree')).toBeInTheDocument();
    expect(screen.getByText('Role: Editor')).toBeInTheDocument();
    expect(screen.getByText('Status: Sync error')).toBeInTheDocument();
    expect(screen.getByText('Status: Sync error')).toHaveClass('text-red-600');
  });

  it('shows demo mode and synced status styling when applicable', () => {
    const props = buildHeaderProps();
    props.auth.isDemoMode = true;
    props.auth.syncStatus = {
      ...props.auth.syncStatus,
      state: 'synced',
      supabaseStatus: 'idle',
      errorMessage: undefined,
      pendingCount: 0,
      lastErrorCategory: undefined,
      lastErrorRetryable: undefined,
    };
    props.viewSettings.currentUserRole = 'owner';

    render(<Header {...props} />);

    expect(screen.getByText('Role: Tree owner')).toBeInTheDocument();
    expect(screen.getByText('Status: Synced')).toHaveClass('text-emerald-600');
    expect(screen.getByText('Demo mode')).toBeInTheDocument();
  });

  it('falls back to the active drive file name when no tree is active in the store', async () => {
    const { useAppStore } = await import('../../store/useAppStore');
    vi.mocked(useAppStore).mockImplementation((selector: any) =>
      selector({
        currentTreeId: null,
        treeName: '',
      }));

    render(<Header {...buildHeaderProps()} />);

    expect(screen.getByText('Tree: Family Archive')).toBeInTheDocument();
  });
});
