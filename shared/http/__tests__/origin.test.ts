import { describe, expect, it } from 'vitest';

import { normalizeHttpOrigin } from '../origin';

describe('normalizeHttpOrigin', () => {
  it('normalizes valid HTTP origins and removes paths', () => {
    expect(normalizeHttpOrigin(' https://jozor.vercel.app/path?q=1 ')).toBe(
      'https://jozor.vercel.app',
    );
  });

  it('removes real, mojibake, and encoded BOM prefixes', () => {
    expect(normalizeHttpOrigin('\uFEFFhttps://jozor.vercel.app')).toBe(
      'https://jozor.vercel.app',
    );
    expect(normalizeHttpOrigin('ï»¿https://jozor.vercel.app')).toBe(
      'https://jozor.vercel.app',
    );
    expect(normalizeHttpOrigin('%C3%AF%C2%BB%C2%BFhttps://jozor.vercel.app')).toBe(
      'https://jozor.vercel.app',
    );
  });

  it('rejects unsupported protocols, credentials, and malformed values', () => {
    expect(normalizeHttpOrigin('javascript:alert(1)')).toBeNull();
    expect(normalizeHttpOrigin('https://user:password@example.com')).toBeNull();
    expect(normalizeHttpOrigin('not a URL')).toBeNull();
  });
});
