
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@supabase/supabase-js';
import { useSessionBootstrap } from '../useSessionBootstrap';
import { useAppStore } from '../../../store/useAppStore';

const {
  getSessionMock,
  onAuthStateChangeMock,
  unsubscribeMock,
  setStoredSupabaseTokenMock,
  clearSupabaseInstancesMock,
  mapSupabaseUserToUserProfileMock,
  fetchUserProfileMock,
  claimCollaboratorMembershipsMock,
} = vi.hoisted(() => ({
  getSessionMock: vi.fn(),
  onAuthStateChangeMock: vi.fn(),
  unsubscribeMock: vi.fn(),
  setStoredSupabaseTokenMock: vi.fn(),
  clearSupabaseInstancesMock: vi.fn(),
  mapSupabaseUserToUserProfileMock: vi.fn(),
  fetchUserProfileMock: vi.fn(),
  claimCollaboratorMembershipsMock: vi.fn(),
}));

vi.mock('../../../services/supabaseAuthService', () => ({
  supabaseAuthService: {
    getSession: getSessionMock,
    onAuthStateChange: onAuthStateChangeMock,
  },
}));

vi.mock('../../../services/authTokenService', () => ({
  authTokenService: {
    setStoredSupabaseToken: setStoredSupabaseTokenMock,
  },
}));

vi.mock('../../../services/supabaseClient', () => ({
  clearSupabaseInstances: clearSupabaseInstancesMock,
  mapSupabaseUserToUserProfile: mapSupabaseUserToUserProfileMock,
}));

vi.mock('../../../services/supabaseProfileService', () => ({
  fetchUserProfile: fetchUserProfileMock,
}));

vi.mock('../../../services/supabaseTreeAccessService', () => ({
  claimCollaboratorMemberships: claimCollaboratorMembershipsMock,
}));

describe('useSessionBootstrap', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    useAppStore.setState((state) => ({
      ...state,
      user: null,
      supabaseAccessToken: null,
      authLoading: true,
      notifications: [],
      isE2E: false,
    }));

    onAuthStateChangeMock.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    });
  });

  it('restores the existing Supabase session into the auth slice on startup', async () => {
    localStorage.setItem(
      'jozor_persisted_notifications:user-1',
      JSON.stringify([
        {
          id: 'saved-note',
          type: 'invitation',
          source: 'invitation-hydration',
          title: 'Saved',
          body: 'Existing notification',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          timestamp: Date.now(),
          read: false,
        },
      ])
    );

    const session = {
      access_token: 'session-token',
      user: {
        id: 'user-1',
        email: 'user@example.com',
        user_metadata: {
          full_name: 'User One',
        },
      },
    } as any as Session;

    getSessionMock.mockResolvedValue({ data: { session } });
    mapSupabaseUserToUserProfileMock.mockReturnValue({
      uid: 'user-1',
      email: 'user@example.com',
      displayName: 'User One',
      photoURL: '',
      metadata: {},
    });
    fetchUserProfileMock.mockResolvedValue({
      metadata: {
        has_completed_tour: true,
      },
    });
    claimCollaboratorMembershipsMock.mockResolvedValue(undefined);

    renderHook(() => useSessionBootstrap());

    await waitFor(() => {
      expect(getSessionMock).toHaveBeenCalledTimes(1);
      expect(useAppStore.getState().user?.uid).toBe('user-1');
    });

    expect(useAppStore.getState().user?.supabaseToken).toBe('session-token');
    expect(useAppStore.getState().supabaseAccessToken).toBe('session-token');
    expect(useAppStore.getState().authLoading).toBe(true);
    expect(useAppStore.getState().notifications).toHaveLength(1);
    expect(setStoredSupabaseTokenMock).toHaveBeenCalledWith('session-token');
    expect(claimCollaboratorMembershipsMock).toHaveBeenCalledWith(
      'user-1',
      'user@example.com',
      'session-token'
    );
  });

  it('clears auth state when no Supabase session exists', async () => {
    useAppStore.setState((state) => ({
      ...state,
      user: {
        uid: 'user-1',
        email: 'user@example.com',
        displayName: 'User One',
        photoURL: '',
        supabaseToken: 'stale-token',
      },
      supabaseAccessToken: 'stale-token',
      notifications: [
        {
          id: 'note-1',
          type: 'invitation',
          source: 'invitation-hydration',
          title: 'Invite',
          body: 'Body',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          timestamp: Date.now(),
          read: false,
        },
      ],
    }));

    getSessionMock.mockResolvedValue({ data: { session: null } });

    renderHook(() => useSessionBootstrap());

    await waitFor(() => {
      expect(useAppStore.getState().authLoading).toBe(false);
    });

    expect(useAppStore.getState().user).toBeNull();
    expect(useAppStore.getState().supabaseAccessToken).toBeNull();
    expect(useAppStore.getState().notifications).toHaveLength(0);
    expect(setStoredSupabaseTokenMock).toHaveBeenCalledWith(null);
    expect(clearSupabaseInstancesMock).toHaveBeenCalledTimes(1);
  });

  it('releases bootstrap into offline mode if Supabase session restore hangs', async () => {
    vi.useFakeTimers();
    getSessionMock.mockReturnValue(new Promise(() => {}));

    renderHook(() => useSessionBootstrap());

    act(() => {
      vi.advanceTimersByTime(6000);
    });

    expect(useAppStore.getState().authLoading).toBe(false);
    expect(useAppStore.getState().syncStatus.state).toBe('offline');
    expect(useAppStore.getState().syncStatus.lastErrorCategory).toBe('AUTH');
  });
});

