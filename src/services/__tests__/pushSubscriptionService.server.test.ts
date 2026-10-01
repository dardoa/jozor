import { afterEach, describe, expect, it, vi } from 'vitest';

const getAdminSdkMock = vi.fn();

vi.mock('../supabaseClientRegistry', () => ({
  SupabaseRegistry: {
    getAdminSdk: (...args: unknown[]) => getAdminSdkMock(...args),
  },
}));

vi.mock('../supabaseClient', () => ({
  getSupabaseWithAuth: vi.fn(),
}));

import { listSubscribedUserIdsServer } from '../pushSubscriptionService';

describe('push subscription server client', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('lists subscribed users when only the public Vite Supabase URL is configured', async () => {
    vi.stubGlobal('window', undefined);
    vi.stubEnv('SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_URL', 'https://project.example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');

    getAdminSdkMock.mockReturnValue({
      from: () => ({
        select: () => ({
          order: () => ({
            limit: () => Promise.resolve({
              data: [{ user_id: 'user-1' }],
              error: null,
            }),
          }),
        }),
      }),
    });

    await expect(listSubscribedUserIdsServer({ limit: 10 })).resolves.toEqual({
      userIds: ['user-1'],
      nextCursor: undefined,
    });
  });
});
