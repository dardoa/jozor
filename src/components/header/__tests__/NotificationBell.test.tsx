// @ts-nocheck
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationBell } from '../NotificationBell';

const navigateMock = vi.fn();
const removeNotificationMock = vi.fn();
const markReadMock = vi.fn();
const markAllReadMock = vi.fn();
const updateNotificationMock = vi.fn();
const setFocusIdMock = vi.fn();
const setSearchTargetMock = vi.fn();
const acceptInvitationNotificationMock = vi.fn();
const declineInvitationNotificationMock = vi.fn();
const openNotificationMock = vi.fn();

const setMobileViewport = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query === '(max-width: 639px)' ? matches : false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const mockState = {
  notifications: [
    {
      id: 'inv-1',
      type: 'invitation',
      source: 'invitation-realtime',
      title: 'Invitation',
      body: 'Pending invitation',
      dedupeKey: 'invitation:1:pending',
      actionable: true,
      createdAt: '2026-03-27T12:00:00.000Z',
      updatedAt: '2026-03-27T12:00:00.000Z',
      invitationId: 'invitation-1',
      invitationTreeId: 'tree-1',
      invitationOwnerUid: 'owner-1',
      invitationRole: 'viewer',
      invitationStatus: 'pending',
      timestamp: Date.now(),
      read: false,
    },
    {
      id: 'info-1',
      type: 'info',
      source: 'system',
      title: 'Info',
      body: 'General info',
      dedupeKey: 'info:1',
      actionable: false,
      createdAt: '2026-03-27T12:01:00.000Z',
      updatedAt: '2026-03-27T12:01:00.000Z',
      timestamp: Date.now(),
      read: true,
    },
  ],
  markRead: markReadMock,
  markAllRead: markAllReadMock,
  updateNotification: updateNotificationMock,
  removeNotification: removeNotificationMock,
  setFocusId: setFocusIdMock,
  setSearchTarget: setSearchTargetMock,
  user: {
    uid: 'user-1',
    email: 'user@example.com',
    displayName: 'User',
    photoURL: '',
    supabaseToken: 'token-1',
  },
};

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    language: 'en',
    t: {
      language: 'en',
      notifications: {
        centerTitle: 'Notification Center',
        centerEmpty: 'No notifications yet',
        centerFooter: 'You can accept or decline tree invitations directly from here.',
        acceptAction: 'Accept',
        declineAction: 'Decline',
        markAllRead: 'Mark all as read',
        clearSafe: 'Clear read and non-actionable',
        label: 'Notifications',
        labelWithCount: '{count} new notifications',
        filterAll: 'All',
        filterInvitations: 'Invitations',
        filterUpdates: 'Updates',
        filterEmpty: 'No notifications match this filter',
        summaryUnread: 'Unread',
        summaryPending: 'Pending',
        summaryUpdates: 'Updates',
      },
    },
  }),
}));

vi.mock('../../../store/useAppStore', () => ({
  useAppStore: (selector: (state: typeof mockState) => unknown) => selector(mockState),
}));

vi.mock('../../ui/Tooltip', () => ({
  Tooltip: ({ children, content }: { children: React.ReactNode; content: React.ReactNode }) => (
    <div data-testid="notification-tooltip" data-tooltip-content={String(content)}>
      {children}
    </div>
  ),
}));

vi.mock('../../ui/Dropdown', () => ({
  Dropdown: ({ trigger, children, contentClassName }: { trigger: React.ReactNode; children: React.ReactNode; contentClassName?: string }) => (
    <div data-testid="notification-dropdown" data-content-class={contentClassName || ''}>
      {trigger}
      <div>{children}</div>
    </div>
  ),
}));

vi.mock('../../../services/notificationActionService', () => ({
  acceptInvitationNotification: (...args: unknown[]) => acceptInvitationNotificationMock(...args),
  declineInvitationNotification: (...args: unknown[]) => declineInvitationNotificationMock(...args),
  openNotification: (...args: unknown[]) => openNotificationMock(...args),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMobileViewport(false);
    mockState.user = {
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'User',
      photoURL: '',
      supabaseToken: 'token-1',
    };
    mockState.notifications = [
      {
        id: 'inv-1',
        type: 'invitation',
        source: 'invitation-realtime',
        title: 'Invitation',
        body: 'Pending invitation',
        dedupeKey: 'invitation:1:pending',
        actionable: true,
        createdAt: '2026-03-27T12:00:00.000Z',
        updatedAt: '2026-03-27T12:00:00.000Z',
        invitationId: 'invitation-1',
        invitationTreeId: 'tree-1',
        invitationOwnerUid: 'owner-1',
        invitationRole: 'viewer',
        invitationStatus: 'pending',
        timestamp: Date.now(),
        read: false,
      },
      {
        id: 'info-1',
        type: 'info',
        source: 'system',
        title: 'Info',
        body: 'General info',
        dedupeKey: 'info:1',
        actionable: false,
        createdAt: '2026-03-27T12:01:00.000Z',
        updatedAt: '2026-03-27T12:01:00.000Z',
        timestamp: Date.now() - 500,
        read: true,
      },
    ];
  });

  it('clears only notifications that are read or non-actionable', () => {
    mockState.notifications.push({
      id: 'action-1',
      type: 'info',
      source: 'system',
      title: 'Action required',
      body: 'Needs follow-up',
      dedupeKey: 'action:1',
      actionable: true,
      createdAt: '2026-03-27T12:02:00.000Z',
      updatedAt: '2026-03-27T12:02:00.000Z',
      timestamp: Date.now() - 1000,
      read: false,
    });

    render(<NotificationBell />);

    fireEvent.click(screen.getByTitle('Clear read and non-actionable'));

    expect(removeNotificationMock).toHaveBeenCalledTimes(1);
    expect(removeNotificationMock).toHaveBeenCalledWith('info-1');
    expect(removeNotificationMock).not.toHaveBeenCalledWith('inv-1');
    expect(removeNotificationMock).not.toHaveBeenCalledWith('action-1');
  });

  it('marks all notifications as read from the header action', () => {
    render(<NotificationBell />);

    fireEvent.click(screen.getByTitle('Mark all as read'));

    expect(markAllReadMock).toHaveBeenCalledTimes(1);
  });

  it('shows the unread count in the bell tooltip label', () => {
    render(<NotificationBell />);

    expect(screen.getByTestId('notification-tooltip')).toHaveAttribute(
      'data-tooltip-content',
      '1 new notifications'
    );
    expect(screen.getByTestId('notification-bell-trigger')).toHaveTextContent('1');
  });

  it('delegates invitation acceptance to the notification action service', async () => {
    render(<NotificationBell />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Accept' }));
    });

    expect(acceptInvitationNotificationMock).toHaveBeenCalledWith(
      mockState.notifications[0],
      mockState.user,
      false,
      expect.objectContaining({
        updateNotification: updateNotificationMock,
        removeNotification: removeNotificationMock,
        navigate: navigateMock,
      })
    );
  });

  it('delegates opening a notification to the notification action service', () => {
    render(<NotificationBell />);

    fireEvent.click(screen.getByText('General info'));

    expect(openNotificationMock).toHaveBeenCalledWith(
      mockState.notifications[1],
      expect.objectContaining({
        markRead: markReadMock,
        setFocusId: setFocusIdMock,
        setSearchTarget: setSearchTargetMock,
        navigate: navigateMock,
      })
    );
  });

  it('filters the center to invitations only when the invitations tab is selected', () => {
    render(<NotificationBell />);

    fireEvent.click(screen.getByRole('button', { name: 'Invitations' }));

    expect(screen.getByText('Pending invitation')).toBeInTheDocument();
    expect(screen.queryByText('General info')).not.toBeInTheDocument();
  });

  it('shows summary counters for unread, pending invitations, and updates', () => {
    render(<NotificationBell />);

    expect(screen.getByText('Unread')).toBeInTheDocument();
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getAllByText('Updates')).toHaveLength(2);
    expect(screen.getAllByText('1')).toHaveLength(4);
  });

  it('exposes the bell trigger as an accessible button label', () => {
    render(<NotificationBell />);

    expect(screen.getByRole('button', { name: '1 new notifications' })).toBeInTheDocument();
  });

  it('keeps the desktop notification dropdown constrained to the header menu', () => {
    render(<NotificationBell />);

    expect(screen.getByTestId('notification-dropdown')).toHaveAttribute(
      'data-content-class',
      expect.stringContaining('w-[min(22rem,calc(100vw-1rem))]')
    );
    expect(screen.getByTestId('notification-dropdown')).toHaveAttribute(
      'data-content-class',
      expect.not.stringContaining('max-[639px]:fixed')
    );
  });

  it('opens the mobile notification sheet from the bell trigger', () => {
    setMobileViewport(true);

    render(<NotificationBell />);

    expect(screen.queryByRole('dialog', { name: 'Notification Center' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '1 new notifications' }));

    expect(screen.getByRole('dialog', { name: 'Notification Center' })).toHaveClass(
      'top-[calc(3.75rem+env(safe-area-inset-top))]'
    );
  });

  it('shows only the latest 5 notifications in the center', () => {
    const now = Date.now();
    mockState.notifications = Array.from({ length: 6 }, (_, index) => ({
      id: `info-${index + 1}`,
      type: 'info' as const,
      source: 'system' as const,
      title: `Info ${index + 1}`,
      body: `General info ${index + 1}`,
      dedupeKey: `info:${index + 1}`,
      actionable: false,
      createdAt: '2026-03-27T12:01:00.000Z',
      updatedAt: '2026-03-27T12:01:00.000Z',
      timestamp: now - index * 1000,
      read: index % 2 === 0,
    }));

    render(<NotificationBell />);

    expect(screen.getByText('General info 1')).toBeInTheDocument();
    expect(screen.getByText('General info 5')).toBeInTheDocument();
    expect(screen.queryByText('General info 6')).not.toBeInTheDocument();
  });
});

