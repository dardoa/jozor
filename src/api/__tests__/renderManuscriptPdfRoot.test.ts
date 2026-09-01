import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import handler from '../../../api/publishing/render-manuscript-pdf';
import { verifyInternalToken } from '../../../shared/auth/internalJwt.js';

vi.mock('../../../shared/auth/internalJwt.js', () => ({
  verifyInternalToken: vi.fn(),
}));

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    headers: {} as Record<string, string | string[]>,
    setHeader(name: string, value: string | string[]) {
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
    end() {
      return this;
    },
  };
  return response;
};

const request = (overrides: Record<string, unknown> = {}) => ({
  method: 'POST',
  headers: {
    authorization: 'Bearer test-session-token',
    origin: 'http://localhost:3000',
  },
  body: {
    html: '<!doctype html><html><body>Book</body></html>',
    title: 'Family Book',
  },
  ...overrides,
});

describe('root renderManuscriptPdf API function', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      APP_ORIGIN: 'http://localhost:3000',
      BROWSERLESS_TOKEN: 'test-token',
    };
    vi.mocked(verifyInternalToken).mockResolvedValue({
      uid: 'user-1',
      email: 'owner@example.test',
      type: 'internal',
    });
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it('handles unsupported methods with 405 and supports OPTIONS', async () => {
    const methodResponse = createResponse();
    await handler(request({ method: 'DELETE' }) as never, methodResponse as never);
    expect(methodResponse.statusCode).toBe(405);
    expect(methodResponse.headers.Allow).toEqual(['GET', 'POST', 'OPTIONS']);

    const optionsResponse = createResponse();
    await handler(request({ method: 'OPTIONS' }) as never, optionsResponse as never);
    expect(optionsResponse.statusCode).toBe(204);
  });

  it('rejects unauthenticated requests before consuming renderer capacity', async () => {
    vi.mocked(verifyInternalToken).mockResolvedValue(null);
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    const res = createResponse();

    await handler(request({ headers: { origin: 'http://localhost:3000' } }) as never, res as never);

    expect(res.statusCode).toBe(401);
    expect(res.body).toEqual({ error: 'Unauthorized' });
  });

  it('rejects requests from a mismatched origin', async () => {
    const res = createResponse();
    await handler(request({
      headers: { authorization: 'Bearer test-session-token', origin: 'https://evil.example' },
    }) as never, res as never);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid request origin.' });
  });

  it('reports readiness without rendering a PDF', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = createResponse();

    await handler(request({ method: 'GET' }) as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ ready: true });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('reports missing Browserless configuration with 503', async () => {
    delete process.env.BROWSERLESS_TOKEN;
    const res = createResponse();
    await handler(request({ method: 'GET' }) as never, res as never);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'Controlled PDF renderer is not configured' });
  });

  it('validates payload content, title, and request size', async () => {
    const missingHtml = createResponse();
    await handler(request({ body: { title: 'Test' } }) as never, missingHtml as never);
    expect(missingHtml.statusCode).toBe(400);

    const missingTitle = createResponse();
    await handler(request({ body: { html: '<html></html>' } }) as never, missingTitle as never);
    expect(missingTitle.statusCode).toBe(400);

    const oversized = createResponse();
    await handler(request({ body: { html: 'x'.repeat(3_800_001), title: 'Test' } }) as never, oversized as never);
    expect(oversized.statusCode).toBe(413);
  });

  it('rejects executable markup and external resource references', async () => {
    const scriptResponse = createResponse();
    await handler(request({
      body: { html: '<html><script>alert(1)</script></html>', title: 'Test' },
    }) as never, scriptResponse as never);
    expect(scriptResponse.statusCode).toBe(400);

    const resourceResponse = createResponse();
    await handler(request({
      body: { html: '<html><img src="https://storage.example/private.jpg"></html>', title: 'Test' },
    }) as never, resourceResponse as never);
    expect(resourceResponse.statusCode).toBe(400);
  });

  it('rejects upstream failures, invalid MIME, and invalid PDF signatures', async () => {
    const failureResponse = createResponse();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, headers: { get: () => null } }));
    await handler(request() as never, failureResponse as never);
    expect(failureResponse.statusCode).toBe(502);

    const mimeResponse = createResponse();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'text/plain' },
      arrayBuffer: async () => new ArrayBuffer(10),
    }));
    await handler(request() as never, mimeResponse as never);
    expect(mimeResponse.statusCode).toBe(502);

    const signatureResponse = createResponse();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/pdf' },
      arrayBuffer: async () => Buffer.from('not-pdf'),
    }));
    await handler(request() as never, signatureResponse as never);
    expect(signatureResponse.statusCode).toBe(502);
  });

  it('returns a verified PDF and disables Browserless headers and footers', async () => {
    const pdf = Buffer.from('%PDF-1.7\ncontrolled manuscript');
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/pdf' },
      arrayBuffer: async () => pdf,
    });
    vi.stubGlobal('fetch', fetchSpy);
    const res = createResponse();

    await handler(request() as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/pdf');
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.body).toEqual(pdf);
    const upstreamBody = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(upstreamBody.options).toMatchObject({
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
  });
});
