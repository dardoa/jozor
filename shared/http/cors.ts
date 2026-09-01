import { normalizeHttpOrigin } from './origin.js';

export interface CorsHeadersOptions {
  methods: string;
  allowCredentials?: boolean;
  allowedHeaders?: string;
}

export type EnvRecord = Record<string, string | undefined>;

export const resolveAllowedOriginFromEnv = (
  env: EnvRecord,
  fallbackOrigin = 'http://localhost:5173',
): string | null => {
  const candidate = env.APP_ORIGIN || env.VITE_APP_ORIGIN;
  const normalizedCandidate = normalizeHttpOrigin(candidate);
  if (normalizedCandidate) return normalizedCandidate;

  const isProd =
    env.NODE_ENV === 'production' ||
    env.VERCEL_ENV === 'production' ||
    env.VERCEL_ENV === 'preview';

  if (isProd) return null;

  return fallbackOrigin;
};

export const buildCorsHeaders = (
  allowedOrigin: string,
  options: CorsHeadersOptions,
  requestOrigin?: string | null,
): Record<string, string> => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': requestOrigin === allowedOrigin ? requestOrigin : allowedOrigin,
    'Access-Control-Allow-Methods': options.methods,
    'Access-Control-Allow-Headers': options.allowedHeaders ?? 'Content-Type, Authorization',
  };

  if (options.allowCredentials) {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }

  return headers;
};

export const isRequestOriginAllowed = (
  requestOrigin: string | null | undefined,
  allowedOrigin: string,
): boolean => !requestOrigin || requestOrigin === allowedOrigin;

export const getHeaderOrigin = (
  headers: Headers | Record<string, string | string[] | undefined> | undefined,
): string | undefined => {
  if (!headers) return undefined;

  const maybeGetter = (headers as { get?: unknown }).get;
  if (typeof maybeGetter === 'function') {
    return (maybeGetter as Headers['get']).call(headers, 'origin') ?? undefined;
  }

  const value = (headers as Record<string, string | string[] | undefined>).origin;
  return Array.isArray(value) ? value[0] : value;
};
