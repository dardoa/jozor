import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalApiProxyMiddleware } from './localApiProxyMiddleware';

const handlers = vi.hoisted(() => ({ media: vi.fn(), migration: vi.fn() }));

const invoke = async (path: string, method = 'GET', body = '', host = '127.0.0.1:3300') => {
  let middleware: ((req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>) | undefined;
  const plugin = createLocalApiProxyMiddleware({
    SUPABASE_URL: 'http://127.0.0.1:55321', SUPABASE_SERVICE_ROLE_KEY: 'test-only', ENABLE_LOCAL_API_PROXY: 'true',
  });
  const loadModule = vi.fn(async (module: string) => {
    if (module === '/src/api/person-media.ts') return { default: handlers.media };
    if (module === '/src/api/person-media-migration.ts') return { default: handlers.migration };
    throw new Error('Unexpected API module');
  });
  plugin.configureServer?.({
    ssrLoadModule: loadModule,
    middlewares: { use: (_path: string, handler: typeof middleware) => { middleware = handler; } },
  } as never);
  if (!middleware) throw new Error('Local API middleware was not registered');
  const req = Object.assign(Readable.from(Buffer.from(body)), {
    method, url: path, headers: { host, authorization: 'Bearer synthetic-token' },
  });
  const response = { statusCode: 200, setHeader: vi.fn(), end: vi.fn() };
  const next = vi.fn();
  await middleware(req, response as unknown as ServerResponse, next);
  return { response, next, loadModule };
};

describe('local private media HTTP bridge', () => {
  beforeEach(() => vi.resetAllMocks());

  it('preserves authorized queries, binary bytes and no-store response headers', async () => {
    const bytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0xff]);
    handlers.media.mockImplementation((req: VercelRequest, res: VercelResponse) => {
      expect(req.query).toEqual({ treeId: 'tree', personId: 'person', assetId: 'asset', kind: 'profile-photo' });
      expect(req.headers.authorization).toBe('Bearer synthetic-token');
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.status(200).send(bytes);
    });
    const { response, next, loadModule } = await invoke('/person-media?treeId=tree&personId=person&assetId=asset&kind=profile-photo');
    expect(loadModule).toHaveBeenCalledWith('/src/api/person-media.ts');
    expect(handlers.media).toHaveBeenCalledOnce();
    expect(response.end).toHaveBeenCalledWith(bytes);
    expect(response.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store, max-age=0');
    expect(next).not.toHaveBeenCalled();
  });

  it('passes migration JSON and returns handler status without falling through to HTML', async () => {
    handlers.migration.mockImplementation((req: VercelRequest, res: VercelResponse) => {
      expect(req.body).toEqual({ treeId: 'tree', cursor: 'cursor' });
      res.status(409).json({ error: 'Conflict' });
    });
    const { response, next } = await invoke('/person-media-migration', 'POST', '{"treeId":"tree","cursor":"cursor"}');
    expect(handlers.migration).toHaveBeenCalledOnce();
    expect(response.statusCode).toBe(409);
    expect(response.end).toHaveBeenCalledWith('{"error":"Conflict"}');
    expect(next).not.toHaveBeenCalled();
  });

  it('does not invoke media handlers for non-local hosts', async () => {
    const { response, next } = await invoke('/person-media', 'GET', '', 'external.example');
    expect(response.statusCode).toBe(403);
    expect(handlers.media).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('returns a controlled JSON failure without leaking handler internals', async () => {
    handlers.media.mockRejectedValue(new Error('PRIVATE_SECRET_SENTINEL'));
    const { response, next } = await invoke('/person-media');
    expect(response.statusCode).toBe(500);
    expect(String(response.end.mock.calls[0][0])).not.toContain('PRIVATE_SECRET_SENTINEL');
    expect(next).not.toHaveBeenCalled();
  });
});
