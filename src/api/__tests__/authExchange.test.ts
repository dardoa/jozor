import { beforeEach, describe, expect, it, vi } from 'vitest';

const { createClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => createClientMock(...args),
}));

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response;
};

describe('auth exchange API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.SUPABASE_JWT_SECRET = 'jwt-secret';
    process.env.ENCRYPTION_SECRET = 'encryption-secret';
    process.env.GOOGLE_CLIENT_ID = 'google-client-id';
    process.env.GOOGLE_CLIENT_SECRET = 'google-client-secret';
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it('does not log raw Google token exchange responses when Google returns an error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      status: 400,
      json: async () => ({
        error: 'invalid_grant',
        error_description: 'Bad code',
        access_token: 'raw-access-token',
        refresh_token: 'raw-refresh-token',
      }),
    })));

    const { default: handler } = await import('../auth/exchange');

    const req = { method: 'POST', body: { code: 'bad-code' } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Google Token Exchange Error:',
      {
        error: 'invalid_grant',
        hasDescription: true,
        status: 400,
      }
    );
    const loggedText = JSON.stringify(consoleErrorSpy.mock.calls);
    expect(loggedText).not.toContain('raw-access-token');
    expect(loggedText).not.toContain('raw-refresh-token');

    consoleErrorSpy.mockRestore();
  });
});
