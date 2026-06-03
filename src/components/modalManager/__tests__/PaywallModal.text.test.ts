import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PaywallModal text safety', () => {
  it('keeps localized billing copy free from mojibake artifacts', () => {
    const source = readFileSync('src/components/modalManager/PaywallModal.tsx', 'utf8');

    expect(source).not.toMatch(/[ØÙâ]/);
    expect(source).toContain('اختر خطة الاشتراك المناسبة لك');
    expect(source).toContain('المجانية');
    expect(source).toContain('Family');
  });
});
