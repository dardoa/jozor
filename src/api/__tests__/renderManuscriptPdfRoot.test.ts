import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import handler from '../../../api/publishing/render-manuscript-pdf';
import { verifyInternalToken } from '../../../shared/auth/internalJwt.js';

const chromiumMocks = vi.hoisted(() => {
  const page = {
    setDefaultTimeout: vi.fn(),
    setDefaultNavigationTimeout: vi.fn(),
    setRequestInterception: vi.fn(),
    on: vi.fn(),
    setContent: vi.fn(),
    emulateMediaType: vi.fn(),
    evaluate: vi.fn(),
    pdf: vi.fn(),
  };
  const browser = {
    newPage: vi.fn(),
    close: vi.fn(),
  };
  return {
    page,
    browser,
    executablePath: vi.fn(),
    launch: vi.fn(),
  };
});

vi.mock('../../../shared/auth/internalJwt.js', () => ({
  verifyInternalToken: vi.fn(),
}));

vi.mock('@sparticuz/chromium', () => ({
  default: {
    args: ['--no-sandbox'],
    executablePath: chromiumMocks.executablePath,
    setGraphicsMode: true,
  },
}));

vi.mock('puppeteer-core', () => ({
  default: {
    launch: chromiumMocks.launch,
  },
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
    };
    chromiumMocks.executablePath.mockResolvedValue('/tmp/chromium');
    chromiumMocks.launch.mockResolvedValue(chromiumMocks.browser);
    chromiumMocks.browser.newPage.mockResolvedValue(chromiumMocks.page);
    chromiumMocks.browser.close.mockResolvedValue(undefined);
    chromiumMocks.page.setRequestInterception.mockResolvedValue(undefined);
    chromiumMocks.page.setContent.mockResolvedValue(undefined);
    chromiumMocks.page.emulateMediaType.mockResolvedValue(undefined);
    chromiumMocks.page.evaluate.mockResolvedValue(undefined);
    chromiumMocks.page.pdf.mockResolvedValue(Buffer.from('%PDF-1.7\ncontrolled manuscript'));
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
    expect(res.body).toEqual({ ready: true, renderer: 'embedded-chromium' });
    expect(fetchSpy).not.toHaveBeenCalled();
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

  it('rejects Chromium failures and invalid PDF signatures while closing launched browsers', async () => {
    const failureResponse = createResponse();
    chromiumMocks.launch.mockRejectedValueOnce(new Error('launch failed'));
    await handler(request() as never, failureResponse as never);
    expect(failureResponse.statusCode).toBe(502);

    const signatureResponse = createResponse();
    chromiumMocks.page.pdf.mockResolvedValueOnce(Buffer.from('not-pdf'));
    await handler(request() as never, signatureResponse as never);
    expect(signatureResponse.statusCode).toBe(502);
    expect(chromiumMocks.browser.close).toHaveBeenCalledTimes(1);
  });

  it('returns a verified PDF with an isolated embedded Chromium print session', async () => {
    const pdf = Buffer.from('%PDF-1.7\ncontrolled manuscript');
    chromiumMocks.page.pdf.mockResolvedValueOnce(pdf);
    const res = createResponse();

    await handler(request() as never, res as never);

    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toBe('application/pdf');
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(res.body).toEqual(pdf);
    expect(chromiumMocks.launch).toHaveBeenCalledWith(expect.objectContaining({
      args: ['--no-sandbox'],
      executablePath: '/tmp/chromium',
      headless: 'shell',
    }));
    expect(chromiumMocks.page.setRequestInterception).toHaveBeenCalledWith(true);
    const requestHandler = chromiumMocks.page.on.mock.calls.find(([event]) => event === 'request')?.[1] as
      | ((request: {
          url: () => string;
          continue: () => void;
          abort: (errorCode: string) => void;
        }) => void)
      | undefined;
    expect(requestHandler).toBeTypeOf('function');
    if (!requestHandler) throw new Error('Chromium request interceptor was not registered');

    const embeddedRequest = { url: () => 'data:image/png;base64,AAAA', continue: vi.fn(), abort: vi.fn() };
    requestHandler(embeddedRequest);
    expect(embeddedRequest.continue).toHaveBeenCalledOnce();
    expect(embeddedRequest.abort).not.toHaveBeenCalled();

    const externalRequest = { url: () => 'https://storage.example/private.jpg', continue: vi.fn(), abort: vi.fn() };
    requestHandler(externalRequest);
    expect(externalRequest.abort).toHaveBeenCalledWith('blockedbyclient');
    expect(externalRequest.continue).not.toHaveBeenCalled();
    expect(chromiumMocks.page.setContent).toHaveBeenCalledWith(
      '<!doctype html><html><body>Book</body></html>',
      expect.objectContaining({ waitUntil: 'domcontentloaded' })
    );
    expect(chromiumMocks.page.emulateMediaType).toHaveBeenCalledWith('print');
    expect(chromiumMocks.page.evaluate).toHaveBeenCalledTimes(1);
    expect(chromiumMocks.page.pdf).toHaveBeenCalledWith(expect.objectContaining({
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    }));
    expect(chromiumMocks.browser.close).toHaveBeenCalledTimes(1);
  });
});
