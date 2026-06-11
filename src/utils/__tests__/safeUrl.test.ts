import { describe, expect, it } from 'vitest';
import { getSafeExternalUrl, sanitizeExternalUrl } from '../safeUrl';

describe('safeUrl', () => {
  it('allows ordinary external source URL schemes', () => {
    expect(getSafeExternalUrl('https://example.com/source')).toBe('https://example.com/source');
    expect(getSafeExternalUrl('http://example.com/source')).toBe('http://example.com/source');
    expect(getSafeExternalUrl('mailto:archive@example.com')).toBe('mailto:archive@example.com');
  });

  it('rejects executable or non-external URL schemes', () => {
    expect(getSafeExternalUrl('javascript:alert(1)')).toBeNull();
    expect(getSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(getSafeExternalUrl('/relative/source')).toBeNull();
    expect(sanitizeExternalUrl('javascript:alert(1)')).toBeUndefined();
  });

  it('handles null, undefined, empty, and whitespace-only inputs', () => {
    expect(getSafeExternalUrl(null)).toBeNull();
    expect(getSafeExternalUrl(undefined)).toBeNull();
    expect(getSafeExternalUrl('')).toBeNull();
    expect(getSafeExternalUrl('   ')).toBeNull();

    expect(sanitizeExternalUrl(null)).toBeUndefined();
    expect(sanitizeExternalUrl(undefined)).toBeUndefined();
    expect(sanitizeExternalUrl('')).toBeUndefined();
    expect(sanitizeExternalUrl('   ')).toBeUndefined();
  });

  it('trims leading and trailing whitespace from valid URLs', () => {
    expect(getSafeExternalUrl('   https://example.com/source   ')).toBe('https://example.com/source');
    expect(sanitizeExternalUrl(' \t http://example.com/source \n ')).toBe('http://example.com/source');
  });

  it('handles case-insensitivity of protocols', () => {
    expect(getSafeExternalUrl('HTTPS://example.com')).toBe('https://example.com/');
    expect(getSafeExternalUrl('Http://example.com')).toBe('http://example.com/');
    expect(getSafeExternalUrl('MailTo:archive@example.com')).toBe('mailto:archive@example.com');
  });

  it('returns null/undefined for malformed URLs that throw during parsing', () => {
    expect(getSafeExternalUrl('https://[invalid-ipv6]')).toBeNull();
    expect(getSafeExternalUrl('http://%')).toBeNull();
    expect(sanitizeExternalUrl('https://[invalid-ipv6]')).toBeUndefined();
  });
});
