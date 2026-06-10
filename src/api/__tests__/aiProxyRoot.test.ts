import { afterEach, describe, expect, it } from 'vitest';

import rootHandler, { config as rootConfig } from '../../../api/ai-proxy';
import srcHandler, { config as srcConfig, resolveAllowedOrigin } from '../ai-proxy';

describe('root AI proxy API function', () => {
  it('exports the shared Edge handler and runtime config for Vercel', () => {
    expect(rootHandler).toBe(srcHandler);
    expect(rootConfig).toEqual(srcConfig);
    expect(rootConfig).toEqual({ runtime: 'edge' });
  });

  describe('CORS origin resolution', () => {
    const originalEnv = { ...process.env };

    afterEach(() => {
      // Restore original environment variables
      Object.keys(process.env).forEach((key) => {
        delete process.env[key];
      });
      Object.assign(process.env, originalEnv);
    });

    it('resolves allowed origin in development environment', () => {
      process.env.NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;
      delete process.env.APP_ORIGIN;
      delete process.env.VITE_APP_ORIGIN;

      expect(resolveAllowedOrigin()).toBe('http://localhost:5173');
    });

    it('resolves configured APP_ORIGIN even in production environment', () => {
      process.env.NODE_ENV = 'production';
      process.env.APP_ORIGIN = 'https://myfamilytree.com';

      expect(resolveAllowedOrigin()).toBe('https://myfamilytree.com');
    });

    it('resolves configured VITE_APP_ORIGIN if APP_ORIGIN is not set', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.APP_ORIGIN;
      process.env.VITE_APP_ORIGIN = 'https://vitefamilytree.com';

      expect(resolveAllowedOrigin()).toBe('https://vitefamilytree.com');
    });

    it('returns null in production environment if no origin is configured', () => {
      process.env.NODE_ENV = 'production';
      delete process.env.VERCEL_ENV;
      delete process.env.APP_ORIGIN;
      delete process.env.VITE_APP_ORIGIN;

      expect(resolveAllowedOrigin()).toBeNull();
    });

    it('returns null in Vercel preview environment if no origin is configured', () => {
      process.env.NODE_ENV = 'development';
      process.env.VERCEL_ENV = 'preview';
      delete process.env.APP_ORIGIN;
      delete process.env.VITE_APP_ORIGIN;

      expect(resolveAllowedOrigin()).toBeNull();
    });
  });
});
