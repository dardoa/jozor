import type { IncomingMessage, ServerResponse } from 'node:http';
import { describe, expect, it, vi } from 'vitest';
import { createLocalApiProxyMiddleware } from './localApiProxyMiddleware';

const createResponse = () => {
  const response = {
    statusCode: 200,
    headers: {} as Record<string, unknown>,
    body: '',
    setHeader(name: string, value: unknown) {
      this.headers[name] = value;
    },
    end(payload?: string) {
      this.body = payload || '';
    },
  };

  return response;
};

describe('createLocalApiProxyMiddleware', () => {
  it('returns 410 for disabled legacy Drive fileId sharing links', async () => {
    let handler:
      | ((req: IncomingMessage, res: ServerResponse, next: () => void) => Promise<void>)
      | undefined;

    const plugin = createLocalApiProxyMiddleware({
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'service-role',
      ENABLE_LOCAL_API_PROXY: 'true',
    });

    plugin.configureServer?.({
      middlewares: {
        use: vi.fn((_prefix: string, callback: typeof handler) => {
          handler = callback;
        }),
      },
    } as never);

    const req = {
      method: 'GET',
      url: '/proxy?fileId=drive-file-1',
      headers: { host: 'localhost:3000' },
      [Symbol.asyncIterator]: async function* () {},
    } as IncomingMessage;
    const res = createResponse();
    const next = vi.fn();

    await handler?.(req, res as never, next);

    expect(res.statusCode).toBe(410);
    expect(JSON.parse(res.body)).toEqual({
      error: {
        message: 'Legacy Google Drive proxy sharing has been disabled. Use a database-backed shared tree link.',
        code: 'LEGACY_DRIVE_SHARING_DISABLED',
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
