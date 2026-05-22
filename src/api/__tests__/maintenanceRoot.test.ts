import { describe, expect, it } from 'vitest';
import handler from '../../../api/maintenance';

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

describe('root maintenance API function', () => {
  it('handles unsupported methods before reading Supabase environment', async () => {
    const req = { method: 'GET', headers: {}, body: {} };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(['POST']);
    expect(res.body).toEqual({
      error: {
        message: 'Method not allowed',
        code: 'METHOD_NOT_ALLOWED',
      },
    });
  });
});

