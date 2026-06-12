import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { InvitePage } from '../InvitePage';
import { acceptTreeInvitation } from '../../features/sharing';
import { useAppStore } from '../../store/useAppStore';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { UserProfile } from '../../types';

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

    it('deduplicates acceptTreeInvitation during the Strict Mode effect replay', async () => {
        const user: UserProfile = {
            uid: 'user-123',
            displayName: 'Test User',
            email: 'user@example.com',
            photoURL: '',
            supabaseToken: 'token-xyz',
        };
        useAppStore.setState({
            user,
        });

        type InvitationResult = Awaited<ReturnType<typeof acceptTreeInvitation>>;
        let resolveInvitation!: (result: InvitationResult) => void;
        vi.mocked(acceptTreeInvitation).mockImplementation(
            () => new Promise((resolve) => {
                resolveInvitation = resolve;
            })
        );

        render(
            <React.StrictMode>
                <MemoryRouter initialEntries={['/invite/test-token']}>
                    <Routes>
                        <Route path="/invite/:token" element={<InvitePage />} />
                    </Routes>
                </MemoryRouter>
            </React.StrictMode>
        );

        expect(acceptTreeInvitation).toHaveBeenCalledTimes(1);

        resolveInvitation({
            treeId: 'tree-456',
            role: 'editor',
            invitationId: 'invitation-789',
        });

        await waitFor(() => {
            expect(screen.getByText('تم بنجاح!')).toBeInTheDocument();
        });

        // The RPC acceptTreeInvitation must be called exactly once
        expect(acceptTreeInvitation).toHaveBeenCalledTimes(1);
        expect(acceptTreeInvitation).toHaveBeenCalledWith('test-token', 'user-123', 'user@example.com', 'token-xyz');
    });
});
