import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  acceptTreeInvitationByIdMock,
  declineTreeInvitationMock,
  showErrorMock,
  showSuccessMock,
  logErrorMock,
} = vi.hoisted(() => ({
  acceptTreeInvitationByIdMock: vi.fn(),
  declineTreeInvitationMock: vi.fn(),
  showErrorMock: vi.fn(),
  showSuccessMock: vi.fn(),
  logErrorMock: vi.fn(),
}));

vi.mock('../treeInvitationService', () => ({
  acceptTreeInvitationById: (...args: unknown[]) => acceptTreeInvitationByIdMock(...args),
  declineTreeInvitation: (...args: unknown[]) => declineTreeInvitationMock(...args),
}));

vi.mock('../../utils/showToast', () => ({
  showToast: Object.assign(
    vi.fn(),
    {
      error: (...args: unknown[]) => showErrorMock(...args),
      success: (...args: unknown[]) => showSuccessMock(...args),
      promise: vi.fn(),
    }
  )
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

import {
  acceptInvitationNotification,
  declineInvitationNotification,
  openNotification,
} from '../notificationActionService';

const notification = {
  id: 'notif-1',
  type: 'invitation' as const,
  source: 'invitation-realtime' as const,
  title: 'Invitation',
  body: 'Pending invitation',
  createdAt: '2026-03-27T12:00:00.000Z',
  updatedAt: '2026-03-27T12:00:00.000Z',
  timestamp: Date.now(),
  read: false,
  actionable: true,
  invitationId: 'invitation-1',
  invitationTreeId: 'tree-1',
  invitationOwnerUid: 'owner-1',
  invitationRole: 'viewer' as const,
  invitationStatus: 'pending' as const,
};

const user = {
  uid: 'user-1',
  email: 'user@example.com',
  supabaseToken: 'token-1',
};

describe('notificationActionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens accepted invitation notifications through the shared tree route', () => {
    const markRead = vi.fn();
    const setFocusId = vi.fn();
    const setSearchTarget = vi.fn();
    const navigate = vi.fn();

    openNotification(
      {
        ...notification,
        invitationStatus: 'accepted',
      },
      { markRead, setFocusId, setSearchTarget, navigate }
    );

    expect(markRead).toHaveBeenCalledWith('notif-1');
    expect(navigate).toHaveBeenCalledWith('/tree/tree-1');
    expect(setFocusId).not.toHaveBeenCalled();
  });

  it('shows a feedback error when invitation acceptance data is incomplete', async () => {
    await acceptInvitationNotification(
      {
        ...notification,
        invitationTreeId: undefined,
      },
      user,
      false,
      {
        updateNotification: vi.fn(),
        removeNotification: vi.fn(),
        navigate: vi.fn(),
      }
    );

    expect(showErrorMock).toHaveBeenCalledWith(
      'This invitation cannot be accepted because its data is incomplete or your current session is unavailable.'
    );
    expect(acceptTreeInvitationByIdMock).not.toHaveBeenCalled();
  });

  it('updates the notification and navigates after a successful invitation acceptance', async () => {
    const updateNotification = vi.fn();
    const navigate = vi.fn();

    acceptTreeInvitationByIdMock.mockResolvedValue({
      treeId: 'tree-2',
      role: 'editor',
      invitationId: 'invitation-1',
    });

    await acceptInvitationNotification(notification, user, false, {
      updateNotification,
      removeNotification: vi.fn(),
      navigate,
    });

    expect(acceptTreeInvitationByIdMock).toHaveBeenCalledWith('invitation-1', 'user-1', 'user@example.com', 'token-1');
    expect(updateNotification).toHaveBeenCalledWith(
      'notif-1',
      expect.objectContaining({
        read: true,
        invitationStatus: 'accepted',
        title: 'Invitation accepted',
      })
    );
    expect(showSuccessMock).toHaveBeenCalledWith('Invitation accepted.');
    expect(navigate).toHaveBeenCalledWith('/tree/tree-2');
  });

  it('removes the notification after a successful decline', async () => {
    const removeNotification = vi.fn();
    declineTreeInvitationMock.mockResolvedValue(true);

    await declineInvitationNotification(notification, user, false, {
      removeNotification,
    });

    expect(declineTreeInvitationMock).toHaveBeenCalledWith('invitation-1', 'user-1', 'user@example.com', 'token-1');
    expect(removeNotification).toHaveBeenCalledWith('notif-1');
    expect(showSuccessMock).toHaveBeenCalledWith('Invitation declined.');
  });
});
