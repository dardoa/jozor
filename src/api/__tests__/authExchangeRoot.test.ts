import { describe, expect, it } from 'vitest';

import rootHandler from '../../../api/auth/exchange';

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

describe('root auth exchange API function', () => {
  it('returns 405 for GET before reading server configuration', async () => {
    const req = { method: 'GET', body: {} };
    const res = createResponse();

    await rootHandler(req as never, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ error: 'Method Not Allowed' });
  });
});
