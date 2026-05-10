import { beforeEach, describe, expect, it, vi } from 'vitest';

const authenticateUserMock = vi.fn();
const createSupabaseClientForUserMock = vi.fn();

vi.mock('../../utils/authUtils', () => ({
  authenticateUser: (...args: unknown[]) => authenticateUserMock(...args),
  createSupabaseClientForUser: (...args: unknown[]) => createSupabaseClientForUserMock(...args),
}));

vi.mock('../../utils/errorLogger', () => ({
  logError: vi.fn(),
  logInfo: vi.fn(),
}));

import handler from '../proxy';

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, unknown>,
    setHeader(name: string, value: unknown) {
      this.headers[name] = value;
    },
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

describe('proxy API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authenticateUserMock.mockResolvedValue({
      type: 'internal',
      token: 'supabase-token',
      uid: 'user-1',
      email: 'user@example.com',
    });
    createSupabaseClientForUserMock.mockReturnValue({});
  });

  it('returns 410 for disabled legacy Drive fileId sharing links', async () => {
    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer token' },
      query: { fileId: 'drive-file-1' },
    };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(410);
    expect(res.body).toEqual({
      error: {
        message: 'Legacy Google Drive proxy sharing has been disabled. Use a database-backed shared tree link.',
        code: 'LEGACY_DRIVE_SHARING_DISABLED',
      },
    });
  });
});
