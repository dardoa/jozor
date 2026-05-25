import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../../../store/useAppStore';
import type { TreeDiscussionMessage } from '../../../../types/tree';
import { TreeDiscussionItem } from '../TreeDiscussionItem';

const mockDeleteMessage = vi.hoisted(() => vi.fn());
let mockLanguage = 'ar';

vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    language: mockLanguage,
  }),
}));

vi.mock('../../services/treeDiscussionService', () => ({
  treeDiscussionService: {
    deleteMessage: (...args: unknown[]) => mockDeleteMessage(...args),
  },
}));

const message: TreeDiscussionMessage = {
  id: 'message-1',
  treeId: 'tree-1',
  userId: 'user-1',
  userEmail: 'owner@example.com',
  content: 'مرحبا',
  createdAt: '2026-05-25T12:00:00.000Z',
};

describe('TreeDiscussionItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLanguage = 'ar';
    mockDeleteMessage.mockResolvedValue(true);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    useAppStore.setState((state) => ({
      ...state,
      user: {
        uid: 'user-1',
        email: 'owner@example.com',
        displayName: 'Owner',
        photoURL: '',
        supabaseToken: 'token-1',
      },
      currentTreeId: 'tree-1',
      currentUserRole: 'owner',
      discussionMessages: {
        'tree-1': [message],
      },
    }));
  });

  it('uses a readable Arabic delete confirmation message', async () => {
    render(<TreeDiscussionItem message={message} isOwn />);

    fireEvent.click(screen.getByTitle('Delete'));

    expect(window.confirm).toHaveBeenCalledWith('هل أنت متأكد من حذف هذه الرسالة؟');
    await waitFor(() => {
      expect(mockDeleteMessage).toHaveBeenCalledWith('message-1', 'user-1', 'owner@example.com', 'token-1');
    });
    expect(useAppStore.getState().discussionMessages['tree-1']).toEqual([]);
  });

  it('uses the English delete confirmation message in English UI', () => {
    mockLanguage = 'en';
    vi.mocked(window.confirm).mockReturnValue(false);

    render(<TreeDiscussionItem message={message} isOwn />);

    fireEvent.click(screen.getByTitle('Delete'));

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this message?');
    expect(mockDeleteMessage).not.toHaveBeenCalled();
  });
});
