import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SharedTreeLoader } from '../SharedTreeLoader';
import type { AuthProps, Person } from '../../types';

const {
  initializeGoogleApiMock,
  loadSharedFileMock,
  acceptTreeInvitationMock,
  fetchTreeAccessRoleMock,
} = vi.hoisted(() => ({
  initializeGoogleApiMock: vi.fn(),
  loadSharedFileMock: vi.fn(),
  acceptTreeInvitationMock: vi.fn(),
  fetchTreeAccessRoleMock: vi.fn(),
}));

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      sharedLoader: {
        loginRequired: 'Login required',
        loginPrompt: 'Login to continue',
        loginWithGoogle: 'Login',
        goToHome: 'Home',
        accessDenied: 'Access denied',
        invitationCheck: 'Invitation sent to {email}',
        backToHome: 'Back',
        loading: 'Loading',
      },
    },
  }),
}));

vi.mock('../../services/googleService', () => ({
  initializeGoogleApi: initializeGoogleApiMock,
}));

vi.mock('../../services/proxyService', () => ({
  loadSharedFile: loadSharedFileMock,
}));

vi.mock('../../services/treeInvitationService', () => ({
  acceptTreeInvitation: acceptTreeInvitationMock,
}));

vi.mock('../../services/supabaseTreeAccessService', () => ({
  fetchTreeAccessRole: fetchTreeAccessRoleMock,
}));

vi.mock('../../utils/errorLogger', () => ({
  getUserFacingErrorInfo: (error: unknown, fallback: string) => ({
    message: error instanceof Error ? error.message : fallback,
  }),
  logError: vi.fn(),
}));

describe('SharedTreeLoader', () => {
  const onLoadComplete = vi.fn();
  const onCancel = vi.fn();

  const auth: AuthProps = {
    user: {
      uid: 'user-1',
      email: 'invitee@example.com',
      displayName: 'Invitee',
      photoURL: '',
      supabaseToken: 'token-1',
    },
    isDemoMode: false,
    isSyncing: false,
    onLogin: vi.fn(async () => {}),
    onLogout: vi.fn(async () => {}),
    stopSyncing: vi.fn(),
    onLoadCloudData: vi.fn(async () => {}),
    onSaveNewCloudFile: vi.fn(async () => {}),
    driveFiles: [],
    currentActiveDriveFileId: null,
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
      state: 'idle',
      lastSyncTime: null,
      lastSyncSupabase: null,
      lastSyncDrive: null,
      supabaseStatus: 'idle',
      driveStatus: 'idle',
      pendingCount: 0,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/tree/db/owner-1/tree-1?invite=token-123');
    acceptTreeInvitationMock.mockResolvedValue({
      treeId: 'tree-1',
      role: 'viewer',
      invitationId: 'inv-1',
    });
    loadSharedFileMock.mockResolvedValue({
      people: { root: {} as Person },
      treeName: 'Shared Oak',
    });
    fetchTreeAccessRoleMock.mockResolvedValue('viewer');
  });

  it('accepts the invite token before loading the shared tree', async () => {
    render(
      <SharedTreeLoader
        ownerUid="owner-1"
        fileId="tree-1"
        auth={auth}
        onLoadComplete={onLoadComplete}
        onCancel={onCancel}
        isDbTree
      />
    );

    await waitFor(() => {
      expect(acceptTreeInvitationMock).toHaveBeenCalledWith(
        'token-123',
        'user-1',
        'invitee@example.com',
        'token-1'
      );
    });

    await waitFor(() => {
      expect(loadSharedFileMock).toHaveBeenCalledWith('tree-1', true, 'token-1');
      expect(onLoadComplete).toHaveBeenCalledWith(
        { root: {} as Person },
        'tree-1',
        true,
        'viewer',
        'Shared Oak'
      );
    });

    expect(window.location.search).toBe('');
  });

  it('shows the access denied state when accepting the invite token fails', async () => {
    acceptTreeInvitationMock.mockRejectedValue(new Error('Invitation is invalid or expired'));

    render(
      <SharedTreeLoader
        ownerUid="owner-1"
        fileId="tree-1"
        auth={auth}
        onLoadComplete={onLoadComplete}
        onCancel={onCancel}
        isDbTree
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });

    expect(loadSharedFileMock).not.toHaveBeenCalled();
    expect(onLoadComplete).not.toHaveBeenCalled();
    expect(screen.getByText('Invitation is invalid or expired')).toBeInTheDocument();
  });

  it('shows the access denied state when a database tree resolves without collaborator access', async () => {
    loadSharedFileMock.mockResolvedValue({
      people: { root: {} as Person },
      treeName: 'Restricted Pine',
    });
    fetchTreeAccessRoleMock.mockResolvedValue(null);

    render(
      <SharedTreeLoader
        ownerUid="owner-1"
        fileId="tree-1"
        auth={auth}
        onLoadComplete={onLoadComplete}
        onCancel={onCancel}
        isDbTree
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Access denied')).toBeInTheDocument();
    });

    expect(onLoadComplete).not.toHaveBeenCalled();
    expect(screen.getByText('Access denied: no collaborator access for this tree.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows the login required state when the viewer is not authenticated', async () => {
    const unauthenticatedAuth: AuthProps = {
      ...auth,
      user: null,
    };

    render(
      <SharedTreeLoader
        ownerUid="owner-1"
        fileId="tree-1"
        auth={unauthenticatedAuth}
        onLoadComplete={onLoadComplete}
        onCancel={onCancel}
        isDbTree
      />
    );

    expect(screen.getByText('Login required')).toBeInTheDocument();
    expect(screen.getByText('Login to continue')).toBeInTheDocument();
    expect(loadSharedFileMock).not.toHaveBeenCalled();
    expect(acceptTreeInvitationMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));
    expect(auth.onOpenLoginModal).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Home' }));
    expect(onCancel).toHaveBeenCalled();
  });

  it('blocks legacy Drive shared-tree links before loading proxy data', async () => {
    window.history.replaceState({}, '', '/tree/owner-1/file-7');

    render(
      <SharedTreeLoader
        ownerUid="owner-1"
        fileId="file-7"
        auth={auth}
        onLoadComplete={onLoadComplete}
        onCancel={onCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Legacy Google Drive shared links are no longer supported. Ask the owner to share the database-backed tree link.')).toBeInTheDocument();
    });

    expect(initializeGoogleApiMock).not.toHaveBeenCalled();
    expect(loadSharedFileMock).not.toHaveBeenCalled();
    expect(fetchTreeAccessRoleMock).not.toHaveBeenCalled();
    expect(onLoadComplete).not.toHaveBeenCalled();
  });
});
