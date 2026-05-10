// @ts-nocheck
import { describe, expect, it } from 'vitest';
import { getUserFacingErrorInfo } from '../errorLogger';

describe('getUserFacingErrorInfo', () => {
  it('maps permission errors to a non-retryable permission message', () => {
    const result = getUserFacingErrorInfo(new Error('Access Denied: RLS policy blocked update'));

    expect(result.category).toBe('PERMISSION');
    expect(result.retryable).toBe(false);
    expect(result.message).toContain('permission');
  });

  it('maps network-style errors to a retryable network message', () => {
    const result = getUserFacingErrorInfo(new Error('Network timeout while saving'));

    expect(result.category).toBe('NETWORK');
    expect(result.retryable).toBe(true);
    expect(result.message).toContain('Network');
  });

  it('falls back to the provided message for unexpected errors', () => {
    const result = getUserFacingErrorInfo(new Error('Something odd happened'), 'Custom fallback message.');

    expect(result.category).toBe('UNEXPECTED');
    expect(result.retryable).toBe(true);
    expect(result.message).toBe('Custom fallback message.');
  });
});

