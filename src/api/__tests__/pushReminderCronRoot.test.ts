import { describe, expect, it } from 'vitest';

import rootHandler, { processReminderBatch as rootProcessReminderBatch } from '../../../api/push-reminder-cron';

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string[]>,
    setHeader(name: string, value: string[]) {
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

describe('root push reminder cron API function', () => {
  it('exports a Vercel reminder cron handler', () => {
    expect(rootHandler).toEqual(expect.any(Function));
    expect(rootProcessReminderBatch).toEqual(expect.any(Function));
  });

  it('returns 503 when CRON_SECRET is missing', async () => {
    const originalSecret = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;

    const req = {
      method: 'GET',
      headers: { authorization: 'Bearer cron-secret' },
      query: {},
    };
    const res = createResponse();

    await rootHandler(req as never, res as never);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'CRON_SECRET is not configured' });

    if (originalSecret) {
      process.env.CRON_SECRET = originalSecret;
    }
  });
});
