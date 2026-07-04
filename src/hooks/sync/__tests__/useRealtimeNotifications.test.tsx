
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserProfile } from '../../../types';
import { useRealtimeNotifications } from '../useRealtimeNotifications';

const {
  listMyPendingInvitationsMock,
  subscribeToMyInvitationsMock,
  subscribeToOwnedInvitationsMock,
  subscribeToLogsMock,
  addNotificationMock,
  removeNotificationMock,
  updateInvitationTelemetryMock,
  subscriberSubscribeMock,
  subscriberUnsubscribeMock,
} = vi.hoisted(() => ({
  listMyPendingInvitationsMock: vi.fn(),
  subscribeToMyInvitationsMock: vi.fn(),
  subscribeToOwnedInvitationsMock: vi.fn(),
  subscribeToLogsMock: vi.fn(),
  addNotificationMock: vi.fn(),
  removeNotificationMock: vi.fn(),
  updateInvitationTelemetryMock: vi.fn(),
  subscriberSubscribeMock: vi.fn(),
  subscriberUnsubscribeMock: vi.fn(),
}));

const state = vi.hoisted(() => ({
  language: 'en',
  currentUserRole: 'editor' as 'owner' | 'editor' | 'viewer' | null,
  addNotification: addNotificationMock,
  removeNotification: removeNotificationMock,
  updateInvitationTelemetry: updateInvitationTelemetryMock,
  notifications: [] as Array<Record<string, unknown>>,
}));

let realtimeOptions: {
  onOperation: (op: {
    user_id: string;
    type: 'ADD_NODE' | 'UPDATE_PROP' | 'DELETE_RELATION' | 'ADD_RELATION' | 'DELETE_NODE';
    payload: Record<string, unknown>;
    created_at?: string;
  }) => void;
  onPermissionUpdate: () => void;
  onReconcile: () => void;
} | null = null;

const useAppStoreMock = vi.hoisted(() => {
  const storeMock = ((selector: (snapshot: typeof state) => unknown) => selector(state)) as typeof import('../../../store/useAppStore').useAppStore;
  storeMock.getState = () => state as never;
  return storeMock;
});

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: useAppStoreMock,
}));

vi.mock('../../../features/sharing', () => ({
  listMyPendingInvitations: (...args: unknown[]) => listMyPendingInvitationsMock(...args),
  subscribeToMyInvitations: (...args: unknown[]) => subscribeToMyInvitationsMock(...args),
  subscribeToOwnedInvitations: (...args: unknown[]) => subscribeToOwnedInvitationsMock(...args),
}));

vi.mock('../../../features/activity-log/service', () => ({
  activityService: {
    subscribeToLogs: (...args: unknown[]) => subscribeToLogsMock(...args),
  },
}));

vi.mock('../../../services/sync/RealtimeSubscriber', () => ({
  RealtimeSubscriber: class {
    constructor(options: typeof realtimeOptions) {
      realtimeOptions = options;
    }

    subscribe(treeId: string) {
      subscriberSubscribeMock(treeId);
    }

    unsubscribe() {
      subscriberUnsubscribeMock();
    }
  },
}));

const user: UserProfile = {
  uid: 'user-1',
  displayName: 'Owner User',
  email: 'user@example.com',
  photoURL: '',
  supabaseToken: 'token-1',
};

const Harness = ({ currentUser, treeId }: { currentUser: UserProfile | null; treeId: string | null }) => {
  useRealtimeNotifications(currentUser, treeId);
  return null;
};

describe('useRealtimeNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    realtimeOptions = null;
    state.language = 'en';
    state.currentUserRole = 'editor';
    state.notifications = [];
    listMyPendingInvitationsMock.mockResolvedValue([]);
    subscribeToMyInvitationsMock.mockReturnValue({ unsubscribe: vi.fn() });
    subscribeToOwnedInvitationsMock.mockReturnValue({ unsubscribe: vi.fn() });
    subscribeToLogsMock.mockReturnValue({ unsubscribe: vi.fn() });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('emits a deduplicated collaborator tree-change notification for non-viewers', () => {
    render(<Harness currentUser={user} treeId="tree-1" />);

    expect(subscriberSubscribeMock).toHaveBeenCalledWith('tree-1');
    expect(realtimeOptions).not.toBeNull();

    realtimeOptions?.onOperation({
      user_id: 'other-user',
      type: 'UPDATE_PROP',
      payload: { id: 'person-1' },
      created_at: '2026-04-08T12:45:00.000Z',
    });

    expect(addNotificationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'info',
        source: 'tree-realtime',
        personId: 'person-1',
        dedupeKey: 'change-person-1-UPDATE_PROP-2026-04-08T12',
      })
    );
  });

  it('ignores tree-change notifications for viewers and cleans up subscriptions on unmount', () => {
    state.currentUserRole = 'viewer';

    const view = render(<Harness currentUser={user} treeId="tree-1" />);

    expect(subscriberSubscribeMock).not.toHaveBeenCalled();

    view.unmount();

    expect(subscriberUnsubscribeMock).not.toHaveBeenCalled();
  });

  it('cleans up the tree realtime subscriber when the hook unmounts', () => {
    const view = render(<Harness currentUser={user} treeId="tree-1" />);

    view.unmount();

    expect(subscriberUnsubscribeMock).toHaveBeenCalledTimes(1);
  });

  it('does not notify on realtime operations created by the current user', () => {
    render(<Harness currentUser={user} treeId="tree-1" />);

    realtimeOptions?.onOperation({
      user_id: 'user-1',
      type: 'ADD_NODE',
      payload: { person: { id: 'person-2' } },
      created_at: '2026-04-08T12:45:00.000Z',
    });

    expect(addNotificationMock).not.toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'tree-realtime',
      })
    );
  });
});

