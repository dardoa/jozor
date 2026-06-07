import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { useAppStore } from '../../../../store/useAppStore';
import type { TreeDiscussionMessage } from '../../../../types/tree';

const buildMessage = (
  id: string,
  userId: string,
  content: string,
  createdAt: string
): TreeDiscussionMessage => ({
  id,
  treeId: 'tree-1',
  userId,
  userEmail: `${userId}@example.com`,
  content,
  createdAt,
});

describe('discussionSlice', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      useAppStore.setState((state) => ({
        ...state,
        discussionMessages: {},
        lastReadTimestamps: {},
        unreadCounts: {},
        onlineUsers: {},
        collaborators: {},
        hasMore: {},
        isDiscussionOpen: false,
      }));
    });
  });

  it('increments unread counts only for new messages from others while closed', () => {
    const firstMessage = buildMessage(
      'message-1',
      'user-2',
      'First',
      '2026-06-07T12:00:00.000Z'
    );
    const editedMessage = {
      ...firstMessage,
      content: 'First edited',
    };
    const ownMessage = buildMessage(
      'message-2',
      'user-1',
      'Mine',
      '2026-06-07T12:01:00.000Z'
    );

    act(() => {
      useAppStore.getState().addDiscussionMessage('tree-1', firstMessage, 'user-1');
      useAppStore.getState().addDiscussionMessage('tree-1', editedMessage, 'user-1');
      useAppStore.getState().addDiscussionMessage('tree-1', ownMessage, 'user-1');
    });

    expect(useAppStore.getState().unreadCounts['tree-1']).toBe(1);
    expect(useAppStore.getState().discussionMessages['tree-1']).toEqual([
      editedMessage,
      ownMessage,
    ]);
  });

  it('marks discussions as read and persists the reset unread count', () => {
    act(() => {
      useAppStore.getState().addDiscussionMessage(
        'tree-1',
        buildMessage('message-1', 'user-2', 'Hello', '2026-06-07T12:00:00.000Z'),
        'user-1'
      );
      useAppStore.getState().markAsRead('tree-1');
    });

    expect(useAppStore.getState().unreadCounts['tree-1']).toBe(0);
    expect(useAppStore.getState().lastReadTimestamps['tree-1']).toEqual(expect.any(String));
    expect(JSON.parse(localStorage.getItem('jozor_unread_counts') || '{}')).toEqual({
      'tree-1': 0,
    });
  });
});

