import { describe, expect, it } from 'vitest';

import {
  buildCorsHeaders,
  getHeaderOrigin,
  isRequestOriginAllowed,
  resolveAllowedOriginFromEnv,
} from '../cors';

describe('shared CORS helpers', () => {
  it('resolves configured origins and falls back to localhost outside production', () => {
    expect(resolveAllowedOriginFromEnv({ APP_ORIGIN: 'https://jozor.vercel.app/path' })).toBe(
      'https://jozor.vercel.app',
    );
    expect(resolveAllowedOriginFromEnv({ NODE_ENV: 'development' })).toBe('http://localhost:5173');
  });

  it('fails closed in production or preview when no origin is configured', () => {
    expect(resolveAllowedOriginFromEnv({ NODE_ENV: 'production' })).toBeNull();
    expect(resolveAllowedOriginFromEnv({ VERCEL_ENV: 'preview' })).toBeNull();
  });

  it('builds stable CORS headers without reflecting disallowed origins', () => {
    expect(buildCorsHeaders('https://jozor.vercel.app', {
      methods: 'POST, OPTIONS',
      allowCredentials: true,
    }, 'https://evil.example')).toEqual({
      'Access-Control-Allow-Origin': 'https://jozor.vercel.app',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    });
  });

  it('validates request origins and supports Headers objects', () => {
    expect(isRequestOriginAllowed(undefined, 'https://jozor.vercel.app')).toBe(true);
    expect(isRequestOriginAllowed('https://jozor.vercel.app', 'https://jozor.vercel.app')).toBe(true);
    expect(isRequestOriginAllowed('https://evil.example', 'https://jozor.vercel.app')).toBe(false);
    expect(getHeaderOrigin(new Headers({ Origin: 'https://jozor.vercel.app' }))).toBe(
      'https://jozor.vercel.app',
    );
  });
});
