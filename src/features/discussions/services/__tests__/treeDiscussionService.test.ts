import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSupabaseFullMock, getSupabaseWithAuthMock } = vi.hoisted(() => ({
  getSupabaseFullMock: vi.fn(),
  getSupabaseWithAuthMock: vi.fn(),
}));

vi.mock('../../../../services/supabaseClient', () => ({
  getSupabaseFull: getSupabaseFullMock,
  getSupabaseWithAuth: getSupabaseWithAuthMock,
}));

vi.mock('../../../../utils/errorLogger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import { treeDiscussionService } from '../treeDiscussionService';

describe('treeDiscussionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps fetched Supabase discussion rows into chronological discussion messages', async () => {
    const limitMock = vi.fn(async () => ({
      data: [
        {
          id: 'message-2',
          tree_id: 'tree-1',
          user_id: 'user-2',
          user_email: 'second@example.com',
          content: 'Second',
          reply_to_event_id: null,
          reply_to_message_id: 'message-1',
          reply_to_user_name: 'first',
          reply_to_content: 'First',
          created_at: '2026-06-07T12:01:00.000Z',
        },
        {
          id: 'message-1',
          tree_id: 'tree-1',
          user_id: 'user-1',
          user_email: 'first@example.com',
          content: 'First',
          reply_to_event_id: null,
          reply_to_message_id: null,
          reply_to_user_name: null,
          reply_to_content: null,
          created_at: '2026-06-07T12:00:00.000Z',
        },
      ],
      error: null,
    }));
    const orderMock = vi.fn(() => ({ limit: limitMock }));
    const eqMock = vi.fn(() => ({ order: orderMock }));
    const selectMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ select: selectMock }));
    getSupabaseWithAuthMock.mockReturnValue({ from: fromMock });

    const messages = await treeDiscussionService.fetchMessages(
      'tree-1',
      'user-1',
      'first@example.com',
      'token-1',
      50
    );

    expect(getSupabaseWithAuthMock).toHaveBeenCalledWith('user-1', 'first@example.com', 'token-1');
    expect(fromMock).toHaveBeenCalledWith('tree_discussions');
    expect(messages).toEqual([
      {
        id: 'message-1',
        treeId: 'tree-1',
        userId: 'user-1',
        userEmail: 'first@example.com',
        content: 'First',
        replyToEventId: undefined,
        replyToMessageId: undefined,
        replyToUserName: undefined,
        replyToContent: undefined,
        createdAt: '2026-06-07T12:00:00.000Z',
      },
      {
        id: 'message-2',
        treeId: 'tree-1',
        userId: 'user-2',
        userEmail: 'second@example.com',
        content: 'Second',
        replyToEventId: undefined,
        replyToMessageId: 'message-1',
        replyToUserName: 'first',
        replyToContent: 'First',
        createdAt: '2026-06-07T12:01:00.000Z',
      },
    ]);
  });

  it('normalizes realtime presence users and drops malformed entries', () => {
    let presenceSync: (() => void) | undefined;
    let subscriptionStatus: ((status: string) => void) | undefined;
    const trackMock = vi.fn();
    const unsubscribeMock = vi.fn();
    const channel = {
      on: vi.fn((eventName: string, _filterOrCallback: unknown, maybeCallback?: unknown) => {
        if (eventName === 'presence') {
          presenceSync = maybeCallback as () => void;
        }
        return channel;
      }),
      presenceState: vi.fn(() => ({
        user1: [{ uid: 'user-1', email: 'one@example.com', online_at: '2026-06-07T12:00:00.000Z' }],
        user2: [{ uid: 123, email: 'bad@example.com', online_at: '2026-06-07T12:01:00.000Z' }],
        user3: [{ uid: 'user-3', email: 'three@example.com' }],
      })),
      subscribe: vi.fn((callback: (status: string) => void) => {
        subscriptionStatus = callback;
        return channel;
      }),
      track: trackMock,
      unsubscribe: unsubscribeMock,
    };
    getSupabaseFullMock.mockReturnValue({
      channel: vi.fn(() => channel),
    });
    const onPresenceSync = vi.fn();

    const subscription = treeDiscussionService.subscribeToMessages(
      'tree-1',
      'user-1',
      'one@example.com',
      'token-1',
      vi.fn(),
      vi.fn(),
      onPresenceSync
    );

    subscriptionStatus?.('SUBSCRIBED');
    presenceSync?.();

    expect(onPresenceSync).toHaveBeenCalledWith([
      {
        uid: 'user-1',
        email: 'one@example.com',
        onlineAt: '2026-06-07T12:00:00.000Z',
      },
      {
        uid: 'user-3',
        email: 'three@example.com',
        onlineAt: '',
      },
    ]);
    expect(trackMock).toHaveBeenCalledWith({
      uid: 'user-1',
      email: 'one@example.com',
      online_at: expect.any(String),
    });

    subscription.unsubscribe();
    expect(unsubscribeMock).toHaveBeenCalled();
  });
});
