import { afterEach, describe, expect, it } from 'vitest';

import rootHandler, { config as rootConfig } from '../../../api/ai-proxy';
import srcHandler, {
  config as srcConfig,
  resolveAllowedOrigin,
  validateAIProxyRequest,
  validateKindiPlanRequestData,
} from '../ai-proxy';

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

  describe('Kindi request validation', () => {
    it('normalizes valid redacted text', () => {
      expect(validateKindiPlanRequestData({
        redactedText: '  add   son for [NAME_1]  ',
      })).toEqual({
        redactedText: 'add son for [NAME_1]',
      });
    });

    it('rejects empty, oversized, and identifier-bearing requests', () => {
      expect(() => validateKindiPlanRequestData({ redactedText: '   ' })).toThrow(
        'cannot be empty'
      );
      expect(() => validateKindiPlanRequestData({ redactedText: 'x'.repeat(2_001) })).toThrow(
        'exceeds 2000'
      );
      expect(() => validateKindiPlanRequestData({
        redactedText: 'delete 64392415-5ef0-46f3-b869-8adddb4fa9e3',
      })).toThrow('must not contain internal identifiers');
    });

    it('rejects malformed Kindi request data before provider processing', () => {
      expect(() => validateAIProxyRequest({
        operation: 'kindi_plan',
        data: {},
      })).toThrow('requires redactedText');
    });
  });
});
