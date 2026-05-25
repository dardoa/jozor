import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin } from 'vite';

type LocalProxyBody = Record<string, unknown>;
type LocalRequest = IncomingMessage & {
  body?: LocalProxyBody;
  query?: Record<string, string>;
};
type LocalResponse = ServerResponse & {
  status: (code: number) => LocalResponse;
  json: (payload: unknown) => LocalResponse;
};

interface LocalApiProxyEnv {
  SUPABASE_URL?: string;
  VITE_SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ENABLE_LOCAL_API_PROXY?: string;
  GOOGLE_AI_KEY?: string;
  GEMINI_API_KEY?: string;
  VITE_KINDI_AI_ENABLED?: string;
  APP_ORIGIN?: string;
  VITE_APP_ORIGIN?: string;
  NODE_ENV?: string;
}

const getErrorMessage = (error: unknown): string => error instanceof Error ? error.message : 'Unknown error';

const sendJson = (res: ServerResponse, statusCode: number, payload: unknown) => {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
};

const parseJsonBody = async (req: IncomingMessage): Promise<LocalProxyBody> => {
  if (req.method !== 'POST') return {};

  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }
  const data = Buffer.concat(buffers).toString();

  try {
    return JSON.parse(data) as LocalProxyBody;
  } catch {
    return {};
  }
};

const isLocalProxyEnabled = (
  req: IncomingMessage,
  res: ServerResponse,
  env: LocalApiProxyEnv
) => {
  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    sendJson(res, 500, { error: 'Supabase env vars missing. Check your .env' });
    return false;
  }

  if (env.ENABLE_LOCAL_API_PROXY !== 'true') {
    sendJson(res, 403, { error: 'Local API proxy is disabled. Set ENABLE_LOCAL_API_PROXY=true in .env to use.' });
    return false;
  }

  const requestHost = req.headers.host?.split(':')[0];
  const isLocalHost = requestHost === 'localhost' || requestHost === '127.0.0.1';
  if (!isLocalHost) {
    sendJson(res, 403, { error: 'Local API proxy is only available on localhost.' });
    return false;
  }

  return true;
};

const createLocalResponse = (res: ServerResponse): LocalResponse => {
  const localResponse = Object.assign(res, {
    status(code: number) {
      res.statusCode = code;
      return localResponse;
    },
    json(payload: unknown) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(payload));
      return localResponse;
    },
  });

  return localResponse as LocalResponse;
};

const createFetchHeaders = (req: IncomingMessage): Headers => {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      headers.set(key, value.join(', '));
    } else if (typeof value === 'string') {
      headers.set(key, value);
    }
  }
  return headers;
};

const sendFetchResponse = async (res: ServerResponse, response: Response) => {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });
  res.end(Buffer.from(await response.arrayBuffer()));
};

const createEdgeRequest = (
  req: IncomingMessage,
  body: LocalProxyBody,
  originalUrl: string
): Request => {
  const requestUrl = new URL(originalUrl, `http://${req.headers.host || 'localhost'}`);
  const method = req.method || 'GET';
  const headers = createFetchHeaders(req);

  return new Request(requestUrl, {
    method,
    headers,
    body: method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(body),
  });
};

const handleCheckEnv = (res: ServerResponse, env: LocalApiProxyEnv) => {
  sendJson(res, 200, {
    hasProviderKey: Boolean(env.GOOGLE_AI_KEY || env.GEMINI_API_KEY),
    hasSupabaseServiceRole: Boolean(env.SUPABASE_SERVICE_ROLE_KEY),
    kindiAIClientFlag: env.VITE_KINDI_AI_ENABLED === 'true',
    appOrigin: env.APP_ORIGIN || env.VITE_APP_ORIGIN || null,
    env: env.NODE_ENV || process.env.NODE_ENV || 'development',
  });
};

const syncProcessEnv = (env: LocalApiProxyEnv) => {
  Object.entries(env).forEach(([key, value]) => {
    if (typeof value === 'string') {
      process.env[key] = value;
    }
  });
};

const handleAiProxy = async (
  req: LocalRequest,
  res: ServerResponse,
  body: LocalProxyBody,
  originalUrl: string,
  env: LocalApiProxyEnv
) => {
  try {
    syncProcessEnv(env);
    const { default: aiProxyHandler } = await import('../../src/api/ai-proxy');
    const response = await (aiProxyHandler as (request: Request) => Promise<Response>)(
      createEdgeRequest(req, body, originalUrl)
    );
    await sendFetchResponse(res, response);
  } catch (error: unknown) {
    sendJson(res, 500, { error: getErrorMessage(error) });
  }
};

const handleAuthExchange = async (
  req: LocalRequest,
  res: ServerResponse,
  body: LocalProxyBody,
  env: LocalApiProxyEnv
) => {
  try {
    syncProcessEnv(env);
    const { default: authExchangeHandler } = await import('../../src/api/auth/exchange');
    const localResponse = createLocalResponse(res);
    req.body = body;
    await (authExchangeHandler as any)(req, localResponse);
  } catch (error: unknown) {
    sendJson(res, 500, { error: getErrorMessage(error) });
  }
};

const toQueryObject = (url: URL): Record<string, string> =>
  Object.fromEntries(Array.from(url.searchParams.entries()));

const handleDbProxy = async (
  req: LocalRequest,
  url: URL,
  res: ServerResponse,
  body: LocalProxyBody,
  env: LocalApiProxyEnv
) => {
  try {
    syncProcessEnv(env);
    const { default: proxyHandler } = await import('../../src/api/proxy');
    const localResponse = createLocalResponse(res);
    req.body = body;
    req.query = toQueryObject(url);
    await (proxyHandler as any)(req, localResponse);
  } catch (error: unknown) {
    sendJson(res, 500, { error: getErrorMessage(error) });
  }
};

export const createLocalApiProxyMiddleware = (env: LocalApiProxyEnv): Plugin => ({
  name: 'api-local-handler',
  enforce: 'pre',
  configureServer(server) {
    server.middlewares.use('/api', async (req, res, next) => {
      const originalUrl = `/api${req.url || ''}`;
      const url = new URL(originalUrl, `http://${req.headers.host || 'localhost'}`);
      const pathName = url.pathname;

      if (!pathName.startsWith('/api/')) {
        next();
        return;
      }

      if (!isLocalProxyEnabled(req, res, env)) {
        return;
      }

      const body = await parseJsonBody(req);
      res.setHeader('Content-Type', 'application/json');

      if (pathName === '/api/ai-proxy') {
        await handleAiProxy(req as LocalRequest, res, body, originalUrl, env);
        return;
      }

      if (pathName === '/api/check-env') {
        handleCheckEnv(res, env);
        return;
      }

      if (pathName === '/api/proxy') {
        await handleDbProxy(req as LocalRequest, url, res, body, env);
        return;
      }

      if (pathName === '/api/auth/exchange') {
        await handleAuthExchange(req as LocalRequest, res, body, env);
        return;
      }

      next();
    });
  },
});
