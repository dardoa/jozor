import { describe, expect, it } from 'vitest';
import {
  AIProxyRateLimitExceededError,
  buildAIProxyRateLimitHeaders,
  normalizeAIProxyRateLimitResult,
  type AIProxyRateLimitResult,
} from '../ai-proxy';

describe('AI proxy rate limit helpers', () => {
  it('normalizes Supabase table function rows', () => {
    const result = normalizeAIProxyRateLimitResult([{
      allowed: true,
      request_count: 3,
      request_limit: 12,
      window_seconds: 60,
      retry_after_seconds: 0,
      reset_at: '2026-06-07T12:00:00.000Z',
    }]);

    expect(result).toEqual({
      allowed: true,
      requestCount: 3,
      requestLimit: 12,
      windowSeconds: 60,
      retryAfterSeconds: 0,
      resetAt: '2026-06-07T12:00:00.000Z',
    });
  });

  it('builds retry and rate-limit headers for rejected requests', () => {
    const result: AIProxyRateLimitResult = {
      allowed: false,
      requestCount: 13,
      requestLimit: 12,
      windowSeconds: 60,
      retryAfterSeconds: 17,
      resetAt: '2026-06-07T12:00:00.000Z',
    };

    expect(buildAIProxyRateLimitHeaders(result)).toEqual({
      'Retry-After': '17',
      'X-RateLimit-Limit': '12',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': '2026-06-07T12:00:00.000Z',
    });
  });

  it('rejects malformed rate limit rows', () => {
    expect(() => normalizeAIProxyRateLimitResult(null)).toThrow('AI rate limit validation returned no data.');
    expect(() => normalizeAIProxyRateLimitResult({ allowed: true, request_count: 'nope' }))
      .toThrow('AI rate limit validation returned malformed data.');
  });

  it('carries the normalized rate limit result in the exceeded error', () => {
    const result: AIProxyRateLimitResult = {
      allowed: false,
      requestCount: 61,
      requestLimit: 60,
      windowSeconds: 60,
      retryAfterSeconds: 42,
      resetAt: '2026-06-07T12:00:00.000Z',
    };

    const error = new AIProxyRateLimitExceededError(result);

    expect(error.name).toBe('AIProxyRateLimitExceededError');
    expect(error.result).toBe(result);
  });
});
