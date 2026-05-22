import { beforeEach, describe, expect, it, vi } from 'vitest';

const { logInfoMock, setStoredSupabaseTokenMock } = vi.hoisted(() => ({
  logInfoMock: vi.fn(),
  setStoredSupabaseTokenMock: vi.fn(),
}));

vi.mock('../../supabaseAuthService', () => ({
  supabaseAuthService: {
    startGoogleSignIn: vi.fn(),
  },
}));

vi.mock('../../authTokenService', () => ({
  authTokenService: {
    getStoredSupabaseToken: vi.fn(),
    setStoredSupabaseToken: setStoredSupabaseTokenMock,
  },
}));

vi.mock('../../../utils/errorLogger', () => ({
  logError: vi.fn(),
  logInfo: logInfoMock,
  logWarn: vi.fn(),
}));

import { GoogleAuthService } from '../GoogleAuthService';
import type { IGoogleApiService } from '../interfaces';

describe('GoogleAuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({
        access_token: 'ya29.sensitive-google-token',
        supabase_token: 'supabase.jwt.token',
        user: {
          uid: 'user-1',
          email: 'user@example.com',
          displayName: 'User One',
        },
      }),
    })));
    vi.stubGlobal('gapi', {
      client: {
        setToken: vi.fn(),
        getToken: vi.fn(),
      },
    });
  });

  it('does not include raw token material in token persistence logs', async () => {
    const codeClient = {
      callback: undefined as ((resp: { code: string; error?: string }) => void) | undefined,
      requestCode: vi.fn(function requestCode(this: typeof codeClient) {
        this.callback?.({ code: 'google-code' });
      }),
    };
    const apiService = {
      isInitialized: true,
      initialize: vi.fn(),
      getCodeClient: vi.fn(() => codeClient),
    } as unknown as IGoogleApiService;

    const service = new GoogleAuthService(apiService);
    const profile = await service.login();

    expect(profile.uid).toBe('user-1');
    expect(setStoredSupabaseTokenMock).toHaveBeenCalledWith('supabase.jwt.token');
    expect(logInfoMock).toHaveBeenCalledWith(
      'GoogleAuthService persistToken',
      'Token stored in localStorage.',
      expect.objectContaining({
        hasAccessToken: true,
      })
    );
    expect(logInfoMock).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        tokenPrefix: expect.any(String),
      })
    );
  });
});
