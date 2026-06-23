
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { AccessControlTab } from '../components/AccessControlTab';

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      owner: 'Owner',
      viewer: 'Viewer',
      editor: 'Editor',
      delete: 'Delete',
      copied: 'Copied',
      copyLink: 'Copy',
      treeManager: {
        shareViaLink: 'Share via Link',
        linkNote: 'Viewer access is the default for links.',
        inviteNewCollaborator: 'Invite New Collaborator',
        emailLabel: 'Email Address',
        inviteButton: 'Invite',
        collaboratorsCount: 'Collaborators ({count})',
        noCollaboratorsYet: 'No collaborators yet.',
        pendingInvitations: 'Pending Invitations',
        noPendingInvitations: 'No pending invitations.',
        invitedOn: 'Invited {date}',
      },
      messages: {
        error: {
          collaborators: 'Failed to load collaborators',
          invite: 'Failed to invite',
          revoke: 'Failed to revoke access',
          role: 'Failed to update role',
        },
        success: {
          invite: 'Invited {email}',
          revoke: 'Access revoked',
          role: 'Role updated',
          copy: 'Link copied',
        },
      },
      adminHub: {
        accessSections: {
          shareDescription: 'Copy a stable viewer link for quick sharing. Editors should still be invited explicitly.',
          inviteDescription: 'Invite a specific collaborator when they need editor access or a tracked pending invitation.',
          collaboratorsDescription: 'Review current access, adjust roles, or revoke collaborators who no longer need the tree.',
          pendingDescription: 'Track invitations that have been sent but not yet accepted.',
          ownerSummary: 'Owner access remains fixed and cannot be reassigned from this panel.',
        },
      },
    },
  }),
}));

vi.mock('../../../services/supabaseTreeCollaboratorService', () => ({
  getTreeCollaborators: vi.fn().mockResolvedValue([]),
  updateCollaboratorRole: vi.fn(),
  revokeCollaboratorAccess: vi.fn(),
}));

vi.mock('../../../features/sharing', () => ({
  createTreeInvitation: vi.fn(),
  listTreeInvitations: vi.fn().mockResolvedValue([]),
  revokeTreeInvitation: vi.fn(),
}));

vi.mock('../../../services/supabaseClient', () => {
  const channelMock = () => ({
    on: () => ({
      subscribe: () => ({
        unsubscribe: vi.fn(),
      }),
    }),
  });
  return {
    getSupabaseWithAuth: vi.fn(() => ({ channel: channelMock })),
    getSupabaseFull: vi.fn(() => ({ channel: channelMock })),
  };
});

const { mockStore } = vi.hoisted(() => ({
  mockStore: {
    user: { supabaseToken: 'token-123' },
    currentUserRole: 'owner',
  },
}));

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: typeof mockStore) => unknown) => selector(mockStore),
}));

vi.mock('../../../utils/showToast', () => ({
  showToast: Object.assign(
    vi.fn(),
    {
      success: vi.fn(),
      error: vi.fn(),
      promise: vi.fn(),
    }
  )
}));

vi.mock('../../../features/activity-log', () => ({
  activityService: {
    logAction: vi.fn(),
  },
}));

vi.mock('../../../ConfirmationModal', () => ({
  ConfirmationModal: () => null,
}));

describe('AccessControlTab', () => {
  it('renders all sections when user is the owner', async () => {
    mockStore.currentUserRole = 'owner';
    render(
      <AccessControlTab
        treeId="tree-1"
        ownerId="owner-1"
        ownerEmail="owner@example.com"
        language="en"
      />
    );

    expect(await screen.findByText('Share via Link')).toBeInTheDocument();
    expect(await screen.findByText('Copy a stable viewer link for quick sharing. Editors should still be invited explicitly.')).toBeInTheDocument();
    expect(await screen.findByText('Invite a specific collaborator when they need editor access or a tracked pending invitation.')).toBeInTheDocument();
    expect(await screen.findByText('Review current access, adjust roles, or revoke collaborators who no longer need the tree.')).toBeInTheDocument();
    expect(await screen.findByText('Track invitations that have been sent but not yet accepted.')).toBeInTheDocument();
    expect(await screen.findByText(/Owner access remains fixed and cannot be reassigned from this panel\./)).toBeInTheDocument();
  });

  it('hides invite and pending sections, rendering a read-only collaborators view when user is viewer', async () => {
    mockStore.currentUserRole = 'viewer';
    render(
      <AccessControlTab
        treeId="tree-1"
        ownerId="owner-1"
        ownerEmail="owner@example.com"
        language="en"
      />
    );

    expect(await screen.findByText('Share via Link')).toBeInTheDocument();
    expect(await screen.findByText('Copy a stable viewer link for quick sharing. Editors should still be invited explicitly.')).toBeInTheDocument();
    expect(await screen.findByText('Review current access, adjust roles, or revoke collaborators who no longer need the tree.')).toBeInTheDocument();
    
    // Invite and pending sections should be hidden
    expect(screen.queryByText('Invite a specific collaborator when they need editor access or a tracked pending invitation.')).not.toBeInTheDocument();
    expect(screen.queryByText('Track invitations that have been sent but not yet accepted.')).not.toBeInTheDocument();
  });
});


