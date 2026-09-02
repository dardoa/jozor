import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAppStore } from '../../../../store/useAppStore';
import TreeDiscussionDrawer from '../TreeDiscussionDrawer';

vi.mock('../../../../context/OverlayContext', () => ({
  OverlayPrimitive: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) =>
    isOpen ? <>{children}</> : null,
}));

vi.mock('../../../../context/TranslationContext', () => ({
  useTranslation: () => ({
    language: 'ar',
    t: {
      discussionDrawer: {
        title: 'مناقشة الشجرة',
        subtitle: 'نسّق العمل مع المشاركين',
        online: 'متصل',
        offline: 'غير متصل',
        close: 'إغلاق مناقشة الشجرة',
        searchPlaceholder: 'ابحث في الرسائل...',
        searchResults: (visible: number, total: number) => `${visible} من ${total}`,
        emptyState: 'لا توجد رسائل بعد',
        emptyStateDesc: 'ابدأ مناقشة للتنسيق مع المشاركين الآخرين',
        noMatches: 'لا توجد رسائل مطابقة',
        noMatchesDesc: 'جرّب كلمة أخرى.',
        loadMore: 'تحميل الرسائل الأقدم',
        placeholder: 'اكتب رسالة...',
        send: 'إرسال الرسالة',
        cancelReply: 'إلغاء الرد',
        reply: 'رد',
        delete: 'حذف الرسالة',
        someone: 'شخص ما',
        context: 'سياق',
        deleteConfirmation: 'هل أنت متأكد من حذف هذه الرسالة؟',
        sendError: 'تعذر إرسال الرسالة.',
      },
    },
  }),
}));

vi.mock('../../hooks/useTreeDiscussion', () => ({
  useTreeDiscussion: () => ({
    messages: [],
    loading: false,
    loadingMore: false,
    hasMore: false,
    sendMessage: vi.fn(),
    loadMore: vi.fn(),
  }),
}));

describe('TreeDiscussionDrawer accessibility', () => {
  beforeEach(() => {
    useAppStore.setState((state) => ({
      ...state,
      user: {
        uid: 'owner-1',
        email: 'owner@example.com',
        displayName: 'المالك',
        photoURL: '',
        supabaseToken: 'token',
      },
      discussionMessages: {},
      collaborators: {},
      onlineUsers: {},
    }));
  });

  it('exposes a localized dialog and named commands at mobile-safe width', () => {
    render(<TreeDiscussionDrawer isOpen onClose={vi.fn()} treeId="tree-1" />);

    const dialog = screen.getByRole('dialog', { name: 'مناقشة الشجرة' });
    expect(dialog).toHaveClass('w-full', 'max-w-[400px]');
    expect(screen.getByRole('button', { name: 'إغلاق مناقشة الشجرة' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'ابحث في الرسائل...' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'اكتب رسالة...' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إرسال الرسالة' })).toBeDisabled();
    expect(screen.queryByText('Tree Discussion')).not.toBeInTheDocument();
  });
});
