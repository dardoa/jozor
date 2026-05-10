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
});
