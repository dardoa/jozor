import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import handler from '../../../api/publishing/render-manuscript-pdf';

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) {
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
    send(payload: unknown) {
      this.body = payload;
      return this;
    },
  };

  return response;
};

describe('root renderManuscriptPdf API function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('handles non-POST methods with 405', async () => {
    const req = { method: 'GET', headers: {}, body: {} };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.headers.Allow).toEqual(['POST']);
    expect(res.body).toEqual({ error: 'Method Not Allowed' });
  });

  it('handles missing BROWSERLESS_TOKEN with 503', async () => {
    delete process.env.BROWSERLESS_TOKEN;
    const req = { method: 'POST', headers: {}, body: { html: 'test', title: 'test' } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'Controlled PDF renderer is not configured' });
  });

  it('handles missing html or title in request body with 400', async () => {
    process.env.BROWSERLESS_TOKEN = 'test-token';
    const res1 = createResponse();
    await handler({ method: 'POST', body: { title: 'Test' } } as never, res1 as never);
    expect(res1.statusCode).toBe(400);
    expect(res1.body).toEqual({ error: 'Missing HTML content' });

    const res2 = createResponse();
    await handler({ method: 'POST', body: { html: 'Test' } } as never, res2 as never);
    expect(res2.statusCode).toBe(400);
    expect(res2.body).toEqual({ error: 'Missing title' });
  });

  it('handles upstream Browserless failure with 502', async () => {
    process.env.BROWSERLESS_TOKEN = 'test-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }));

    const req = { method: 'POST', body: { html: '<html></html>', title: 'Test' } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(502);
    expect(res.body).toEqual({ error: 'Controlled PDF renderer returned invalid PDF' });
  });

  it('handles non-PDF content type from upstream with 502', async () => {
    process.env.BROWSERLESS_TOKEN = 'test-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (key: string) => (key === 'content-type' ? 'text/plain' : null),
      },
      arrayBuffer: async () => new ArrayBuffer(10),
    }));

    const req = { method: 'POST', body: { html: '<html></html>', title: 'Test' } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(502);
  });

  it('handles empty buffer from upstream with 502', async () => {
    process.env.BROWSERLESS_TOKEN = 'test-token';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (key: string) => (key === 'content-type' ? 'application/pdf' : null),
      },
      arrayBuffer: async () => new ArrayBuffer(0),
    }));

    const req = { method: 'POST', body: { html: '<html></html>', title: 'Test' } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(502);
  });

  it('handles successful PDF rendering with 200 and binary data', async () => {
    process.env.BROWSERLESS_TOKEN = 'test-token';
    const fakeData = new Uint8Array([1, 2, 3]);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: {
        get: (key: string) => (key === 'content-type' ? 'application/pdf' : null),
      },
      arrayBuffer: async () => fakeData.buffer,
    }));

    const req = { method: 'POST', body: { html: '<html></html>', title: 'Test' } };
    const res = createResponse();

    await handler(req as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/pdf');
    expect(res.headers['Content-Length']).toBe(fakeData.length.toString());
    expect(res.body).toEqual(Buffer.from(fakeData.buffer));
  });
});
