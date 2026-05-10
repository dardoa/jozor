// @ts-nocheck
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ActivityLogDrawer from '../ActivityLogDrawer';
import type { ActivityLog } from '../../services/activityService';

const { fetchLogsMock, subscribeToLogsMock } = vi.hoisted(() => ({
  fetchLogsMock: vi.fn(),
  subscribeToLogsMock: vi.fn(),
}));

vi.mock('../../services/activityService', () => ({
  activityService: {
    fetchLogs: fetchLogsMock,
    subscribeToLogs: subscribeToLogsMock,
  },
}));

vi.mock('../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      activityDrawer: {
        title: 'Activity History',
        subtitle: 'Audit Trail',
        allContributors: 'All Contributors',
        emptyState: 'No activity recorded yet',
        emptyStateDesc: 'Changes will appear here in real-time',
        loadMore: 'Load older activities',
        someone: 'Someone',
        actions: {
          addPerson: 'Added {name}',
          updatePerson: 'Updated details for {name}',
          deletePerson: 'Removed {name} from the tree',
          addRelation: 'Modified relationship between {focusName} and {existingName}',
          deleteRelation: 'Modified relationship between {targetName} and {relativeName}',
          shareInvite: 'Sent a share invitation',
          shareInviteDetails: 'Invited {email} as {role}',
          shareInviteAccepted: 'A collaborator accepted an invitation',
          shareInviteAcceptedDetails: '{email} accepted the invitation as {role}',
          shareInviteDeclined: 'A collaborator declined the invitation',
          shareInviteDeclinedDetails: '{email} declined the invitation for {role}',
          shareRevoke: 'Revoked access for a collaborator',
          shareRevokeDetails: 'Revoked access for {email}',
          shareRoleChange: 'Updated collaborator role',
          shareRoleChangeDetails: 'Updated {email} to {role}',
          default: 'Performed an action',
        },
        roles: {
          editor: 'editor',
          viewer: 'viewer',
        },
      },
    },
  }),
}));

vi.mock('../../context/OverlayContext', () => ({
  OverlayPrimitive: ({
    isOpen,
    children,
  }: {
    isOpen: boolean;
    children: React.ReactNode;
  }) => (isOpen ? <>{children}</> : null),
}));

const buildLog = (overrides: Partial<ActivityLog> = {}): ActivityLog => ({
  id: 'log-1',
  tree_id: 'tree-1',
  user_id: 'user-1',
  user_email: 'invitee@example.com',
  action_type: 'SHARE_INVITE_DECLINE',
  details: {
    email: 'invitee@example.com',
    role: 'viewer',
    invitationId: 'invitation-1',
  },
  created_at: '2026-03-27T12:00:00.000Z',
  ...overrides,
});

describe('ActivityLogDrawer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchLogsMock.mockResolvedValue([buildLog()]);
    subscribeToLogsMock.mockReturnValue({
      unsubscribe: vi.fn(),
    });
  });

  it('renders declined invitation audit entries', async () => {
    render(
      <ActivityLogDrawer
        isOpen
        onClose={vi.fn()}
        treeId="tree-1"
        onNavigate={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(fetchLogsMock).toHaveBeenCalledWith('tree-1', 0, 50, '');
    });

    expect(screen.getByText('invitee@example.com declined the invitation for viewer')).toBeInTheDocument();
    expect(subscribeToLogsMock).toHaveBeenCalledWith('tree-1', expect.any(Function));
  });
});

