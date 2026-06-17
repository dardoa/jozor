import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const authenticateUserMock = vi.fn();
const createSupabaseClientForUserMock = vi.fn();

vi.mock('../../utils/authUtils', () => ({
  authenticateUser: (...args: unknown[]) => authenticateUserMock(...args),
  createSupabaseClientForUser: (...args: unknown[]) => createSupabaseClientForUserMock(...args),
}));

import rootHandler from '../../../api/proxy';

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
    end() {
      return this;
    },
  };

  return response;
};

describe('root proxy API function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      APP_ORIGIN: 'http://localhost:5173',
    };
    authenticateUserMock.mockResolvedValue({
      type: 'internal',
      token: 'supabase-token',
      uid: 'user-1',
      email: 'user@example.com',
    });
    createSupabaseClientForUserMock.mockReturnValue({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
          })),
        })),
      })),
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('exports a Vercel proxy handler', () => {
    expect(rootHandler).toEqual(expect.any(Function));
  });

  it('returns 204 and CORS headers for OPTIONS requests', async () => {
    const req = {
      method: 'OPTIONS',
      headers: {},
    };
    const res = createResponse();

    await rootHandler(req as never, res as never);

    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
    expect(res.headers['Access-Control-Allow-Methods']).toBe('GET, POST, OPTIONS');
    expect(res.headers['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization');
    expect(res.headers['Access-Control-Allow-Credentials']).toBe('true');
  });

  it('allows GET/POST requests with allowed Origin', async () => {
    const req = {
      method: 'GET',
      headers: {
        authorization: 'Bearer token',
        origin: 'http://localhost:5173',
      },
      query: { treeId: 'tree-1' },
    };
    const res = createResponse();

    await rootHandler(req as never, res as never);

    expect(res.statusCode).not.toBe(400);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('http://localhost:5173');
  });

  it('rejects requests with invalid Origin with 400 Bad Request', async () => {
    const req = {
      method: 'GET',
      headers: {
        authorization: 'Bearer token',
        origin: 'https://malicious-site.com',
      },
      query: { treeId: 'tree-1' },
    };
    const res = createResponse();

    await rootHandler(req as never, res as never);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: {
        message: 'Invalid request origin.',
        code: 'INVALID_ORIGIN',
      },
    });
  });

  it('allows requests with no Origin header', async () => {
    const req = {
      method: 'GET',
      headers: {
        authorization: 'Bearer token',
      },
      query: { treeId: 'tree-1' },
    };
    const res = createResponse();

    await rootHandler(req as never, res as never);

    expect(res.statusCode).not.toBe(400);
  });

  it('fails closed in production/preview if no valid APP_ORIGIN or VITE_APP_ORIGIN is configured', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.APP_ORIGIN;
    delete process.env.VITE_APP_ORIGIN;

    const req = {
      method: 'GET',
      headers: {
        authorization: 'Bearer token',
      },
      query: { treeId: 'tree-1' },
    };
    const res = createResponse();

    await rootHandler(req as never, res as never);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: {
        message: 'Server configuration error: APP_ORIGIN is not configured.',
        code: 'SERVER_CONFIGURATION_ERROR',
      },
    });
  });
});
