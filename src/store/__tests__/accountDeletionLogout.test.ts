import { createStore } from 'zustand/vanilla';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAuthSlice, type AuthSlice } from '../slices/authSlice';

const mocks = vi.hoisted(() => ({ forget: vi.fn(), signOut: vi.fn(), google: vi.fn(), clear: vi.fn(), role: vi.fn() }));
vi.mock('../../services/supabaseAuthService', () => ({ supabaseAuthService: { forgetDeletedAccount: mocks.forget, signOut: mocks.signOut } }));
vi.mock('../../services/googleService', () => ({ googleAuthService: { logout: mocks.google } }));
vi.mock('../../services/supabaseClient', () => ({ clearSupabaseInstances: mocks.clear }));
vi.mock('../../services/storageService', () => ({ storageService: { setRole: mocks.role } }));
vi.mock('../../services/supabaseProfileService', () => ({ updateUserTourStatus: vi.fn() }));

describe('accepted account deletion local store teardown', () => {
  beforeEach(() => { Object.values(mocks).forEach(mock => mock.mockReset()); });
  const fixture = () => {
    // This test exercises only the auth slice, without unrelated application state.
    const store = createStore<AuthSlice>((set, get, api) => createAuthSlice(set as never, get as never, api as never));
    store.setState({ user: { uid: 'synthetic', displayName: 'Test', email: 'synthetic@example.test', photoURL: '' },
      currentTreeId: 'tree', currentUserRole: 'owner', supabaseAccessToken: 'old-token' });
    return store;
  };
  it('clears user, role, tree and bearer despite both provider logout failures', async () => {
    mocks.forget.mockRejectedValue(new Error('offline'));
    mocks.google.mockImplementation(() => { throw new Error('SDK unavailable'); });
    const store = fixture();
    await expect(store.getState().logout({ accountDeleted: true })).resolves.toBeUndefined();
    expect(store.getState()).toMatchObject({ user: null, currentUserRole: null, currentTreeId: null, supabaseAccessToken: null });
    expect(mocks.clear).toHaveBeenCalledOnce(); expect(mocks.role).toHaveBeenCalledWith(null);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('preserves the ordinary logout error contract when deletion was not accepted', async () => {
    mocks.signOut.mockRejectedValue(new Error('offline'));
    const store = fixture();
    await expect(store.getState().logout()).rejects.toThrow('offline');
    expect(store.getState().user?.uid).toBe('synthetic');
    expect(mocks.forget).not.toHaveBeenCalled();
  });
});
