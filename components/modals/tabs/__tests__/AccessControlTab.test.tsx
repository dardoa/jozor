import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { AccessControlTab } from '../AccessControlTab';

vi.mock('../../../../context/TranslationContext', () => ({
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

vi.mock('../../../../services/supabaseTreeCollaboratorService', () => ({
  getTreeCollaborators: vi.fn().mockResolvedValue([]),
  updateCollaboratorRole: vi.fn(),
  revokeCollaboratorAccess: vi.fn(),
}));

vi.mock('../../../../services/treeInvitationService', () => ({
  createTreeInvitation: vi.fn(),
  listTreeInvitations: vi.fn().mockResolvedValue([]),
  revokeTreeInvitation: vi.fn(),
}));

vi.mock('../../../../services/supabaseClient', () => {
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

vi.mock('../../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: { user: { supabaseToken: string } }) => unknown) =>
    selector({ user: { supabaseToken: 'token-123' } }),
}));

vi.mock('../../../../utils/showToast', () => ({
  showToast: Object.assign(
    vi.fn(),
    {
      success: vi.fn(),
      error: vi.fn(),
      promise: vi.fn(),
    }
  )
}));

vi.mock('../../../../services/activityService', () => ({
  activityService: {
    logAction: vi.fn(),
  },
}));

vi.mock('../../../ConfirmationModal', () => ({
  ConfirmationModal: () => null,
}));

describe('AccessControlTab', () => {
  it('renders the reorganized access sections with guidance copy', async () => {
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
});
