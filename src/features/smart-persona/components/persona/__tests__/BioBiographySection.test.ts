import { describe, expect, it } from 'vitest';

import { sanitizeBioHtml } from '../BioBiographySection';

describe('sanitizeBioHtml', () => {
  it('preserves the supported biography formatting', () => {
    const result = sanitizeBioHtml('<p>Family <strong>history</strong></p><ul><li>First branch</li></ul>');

    expect(result).toBe('<p>Family <strong>history</strong></p><ul><li>First branch</li></ul>');
  });

  it('removes executable markup, URL-bearing elements, and attributes', () => {
    const result = sanitizeBioHtml([
      '<script>alert(1)</script>',
      '<img src="x" onerror="alert(2)">',
      '<a href="javascript:alert(3)">unsafe link</a>',
      '<p style="background:url(javascript:alert(4))" onclick="alert(5)">Safe text</p>',
    ].join(''));

    expect(result).toContain('unsafe link');
    expect(result).toContain('<p>Safe text</p>');
    expect(result).not.toMatch(/script|img|href|javascript:|onerror|onclick|style=/i);
  });
});
