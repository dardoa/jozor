import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InvitePage } from '../InvitePage';
import { acceptTreeInvitation } from '../../features/sharing';
import { useAppStore } from '../../store/useAppStore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../features/sharing', () => ({
    acceptTreeInvitation: vi.fn(),
}));

vi.mock('../../utils/showToast', () => ({
    showToast: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

describe('InvitePage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders auth required state if user is not logged in', () => {
        useAppStore.setState({ user: null });

        render(
            <MemoryRouter initialEntries={['/invite/test-token']}>
                <Routes>
                    <Route path="/invite/:token" element={<InvitePage />} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('تسجيل الدخول مطلوب')).toBeInTheDocument();
    });

    it('deduplicates acceptTreeInvitation calls to exactly once even when mounted twice (Strict Mode simulation)', async () => {
        useAppStore.setState({
            user: { uid: 'user-123', email: 'user@example.com', supabaseToken: 'token-xyz' } as any,
        });

        vi.mocked(acceptTreeInvitation).mockResolvedValue({ treeId: 'tree-456' } as any);

        const { rerender } = render(
            <MemoryRouter initialEntries={['/invite/test-token']}>
                <Routes>
                    <Route path="/invite/:token" element={<InvitePage />} />
                </Routes>
            </MemoryRouter>
        );

        // Simulate strict mode unmount and remount with same parameters
        rerender(
            <MemoryRouter initialEntries={['/invite/test-token']}>
                <Routes>
                    <Route path="/invite/:token" element={<InvitePage />} />
                </Routes>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('تم بنجاح!')).toBeInTheDocument();
        });

        // The RPC acceptTreeInvitation must be called exactly once
        expect(acceptTreeInvitation).toHaveBeenCalledTimes(1);
        expect(acceptTreeInvitation).toHaveBeenCalledWith('test-token', 'user-123', 'user@example.com', 'token-xyz');
    });
});
