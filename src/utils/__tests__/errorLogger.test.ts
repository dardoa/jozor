
import { describe, expect, it, vi } from 'vitest';
import { getUserFacingErrorInfo, logError } from '../errorLogger';
import { showToast } from '../showToast';

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

  it('shows a toast when requested by logError', () => {
    const toastSpy = vi.spyOn(showToast, 'error').mockImplementation(() => undefined);

    logError('test toast', new Error('Network timeout'), {
      showToast: true,
      toastMessage: 'Retry later',
    });

    expect(toastSpy).toHaveBeenCalledWith('Retry later');
  });
});

