
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';
import { ActivityHistoryTab } from '../components/ActivityHistoryTab';

const fetchLogsMock = vi.fn();
const subscribeToLogsMock = vi.fn();

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    t: {
      rename: 'Renamed tree',
      onboarding: {
        tip: 'Tip',
      },
      activityTab: {
        title: 'Activity Log',
        count: 'activities',
        noActivity: 'No activity yet.',
        loadMore: 'Load More',
        tip: 'Click an entry to jump to the related person.',
      },
      activityDrawer: {
        someone: 'Someone',
        actions: {
          addPerson: 'Added {name}',
          updatePerson: 'Updated details for {name}',
          deletePerson: 'Removed {name} from the tree',
          addRelation: 'Modified relationship between {focusName} and {existingName}',
          deleteRelation: 'Modified relationship between {targetName} and {relativeName}',
          shareInvite: 'Sent a share invitation',
          shareInviteDetails: 'Invited {email} as {role}',
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
      adminHub: {
        activityPanel: {
          overview: 'Review the latest tree changes, collaboration events, and relationship updates in one timeline.',
          tipPrefix: 'Tip',
        },
      },
    },
    dateLocale: undefined,
  }),
}));

vi.mock('../../../features/activity-log/service', () => ({
  activityService: {
    fetchLogs: (...args: unknown[]) => fetchLogsMock(...args),
    subscribeToLogs: (...args: unknown[]) => subscribeToLogsMock(...args),
  },
}));

describe('ActivityHistoryTab', () => {
  it('formats activity entries with user-facing copy', async () => {
    fetchLogsMock.mockResolvedValue([
      {
        id: 'log-1',
        tree_id: 'tree-1',
        user_id: 'user-1',
        user_email: 'owner@example.com',
        action_type: 'SHARE_ROLE_CHANGE',
        details: {
          email: 'editor@example.com',
          newRole: 'editor',
        },
        created_at: '2026-03-29T10:00:00.000Z',
      },
    ]);
    subscribeToLogsMock.mockReturnValue({ unsubscribe: vi.fn() });

    render(<ActivityHistoryTab treeId="tree-1" language="en" />);

    expect(await screen.findByText('Review the latest tree changes, collaboration events, and relationship updates in one timeline.')).toBeInTheDocument();
    expect(screen.getByText('Updated editor@example.com to editor')).toBeInTheDocument();
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
    expect(screen.getByText('Tip:')).toBeInTheDocument();
  });
});

